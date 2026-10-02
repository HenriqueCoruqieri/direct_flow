# Plano — Criação de chamado

Aprovado em 2026-09-30. Contrato a escrever na Onda 0 em
`docs/contracts/ticket-creation.md`, com as regras das próximas features.

> **Revisto em 2026-10-02** (`docs/plans/ticket-resolution-and-comments.md`):
> o setor de destino saiu da criação. Todo chamado nasce `aberto`, no setor do
> autor, sem `ticket_transfer`. As linhas "Campos" (destino), "Destino", "Outro
> setor", o toast "enviado para aprovação" e o critério de pronto 2 deixaram de
> valer; o envio para outro setor passa a ser ato no detalhe (feature futura).
> Os textos de bloqueio terminam em "informe sua liderança".

## Decisões fixadas pelo usuário

| Tema          | Decisão                                                                                                                                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quem cria     | Qualquer pessoa ativa. Não podem: quem está no Não alocado e quem é de setor sem nenhuma tag ativa (botão desabilitado com explicação; action recusa com `FORBIDDEN`)                                                 |
| Onde          | Dialog aberto pelo botão "Novo chamado" da barra superior (`AppTopBar`) do Início                                                                                                                                     |
| Campos        | Todos obrigatórios: título (3–200), descrição (10–5000), tipo (6 do enum `ticket_type`, com rótulos), setor de destino, tag                                                                                           |
| Tag           | Exatamente uma, sempre do setor do autor (mesmo com destino em outro setor). Dois problemas = dois chamados                                                                                                           |
| Destino       | Padrão = setor do autor; opções = setores ativos exceto Não alocado; Diretoria primeiro                                                                                                                               |
| Próprio setor | Nasce `aberto`, origin = current = setor do autor; histórico `criacao`                                                                                                                                                |
| Outro setor   | Nasce `aguardando_aprovacao`, ainda no setor do autor (current = origin), com `ticket_transfer` pendente origem → destino; histórico `criacao` + `transferencia_solicitada`; o autor perde o controle sobre o chamado |
| Prioridade    | Autor não escolhe; nasce `media`                                                                                                                                                                                      |
| Pós-criação   | Toast `Chamado #N criado` (ou `enviado para aprovação de <setor>`), dialog fecha, card do Início atualiza                                                                                                             |
| E-mail        | Nenhum                                                                                                                                                                                                                |

## Escopo

**Entra**: dialog e formulário; gravação em uma transação (`ticket`,
`ticket_tag`, `ticket_history` e, se outro setor, `ticket_transfer`); bloqueios
de Não alocado e setor sem tag; índice único de uma tag por chamado; novo valor
`mudanca_tag` em `history_event` e colunas `from_tag_id`/`to_tag_id` em
`ticket_history` (prontos para a feature de Aprovações; não usados nesta).

**Fora** (próximas features; regras registradas no contrato, sem código):

- **Aprovações**: admin do destino aprova ou recusa. Recusado volta ao setor do
  autor como `aberto`. Na aprovação, o admin escolhe uma tag ativa do próprio
  setor (obrigatória), que substitui a do autor; o histórico registra
  `mudanca_tag` com `from_tag_id`/`to_tag_id`.
- **Detalhe e edição pelo autor**: o autor só age enquanto o chamado está no
  setor dele, sem transferência pendente e antes de `fechado`; toda
  movimentação vai para `ticket_history`.
- **Conclusão**: `resolvido` → 7 dias editável (correções, complementos,
  evidências) → `fechado` automático e imutável, a partir do qual o backoffice
  analisa. Mecanismo da troca automática (job agendado ou cálculo na leitura)
  decidido nessa feature, com ADR.
- Fila, Meus chamados, busca da barra, atribuição, anexos, mensagens.

## Impacto no contrato

- `db/schema.ts`: índice único em `ticket_tag(ticket_id)`; valor `mudanca_tag`
  em `history_event`; colunas `from_tag_id` e `to_tag_id` (opcionais, FK
  `restrict` para `tag`) em `ticket_history`.
- Domínio: `TICKET_TYPE_LABELS`; `checkTicketCreation` (inativo, Não alocado,
  setor sem tag — cada um com mensagem); setores de destino possíveis; status
  inicial conforme destino.
- Validação: `createTicketSchema` com `title`, `description`, `type`,
  `departmentId` (destino) e `tagId`.
- Tipos: entrada, resultado e opções do formulário.
- `df-data`: `insertTicket` em transação — confere destino ativo e não Não
  alocado, tag ativa e do setor do autor; grava `ticket`, `ticket_tag`,
  `ticket_history` e `ticket_transfer` quando outro setor; resultados tipados
  `invalid_tag` / `invalid_destination`. Leituras do formulário: tags ativas do
  setor do autor, setores de destino.
- `df-actions`: `createTicket` → `{ ok, message, ticketId }`; códigos
  `INVALID_INPUT`, `FORBIDDEN`, `INVALID_TAG`, `INVALID_DESTINATION`; autor e
  origem vêm do banco, nunca do formulário.
- `df-auth`: nada novo (`getAccountFacts` já traz setor, ativo, Não alocado).
- `df-ui`: `AppTopBar` carrega o próprio dado (pode criar, tags, destinos) para
  seguir reutilizável; dialog em `app/(app)/_components/`.
- Docs: `docs/contracts/ticket-creation.md` com as regras futuras.

## Migration

Não destrutiva:

- índice único em `ticket_tag.ticket_id` (o `df-debug` confirmou 29 chamados:
  26 com 1 tag, 3 sem tag, nenhum com 2);
- `ADD VALUE 'mudanca_tag'` em `history_event` (no Postgres não pode ser usado na
  mesma transação em que é criado — nesta feature ninguém grava esse evento);
- colunas `from_tag_id`/`to_tag_id` em `ticket_history`.

Os 3 chamados antigos sem tag ficam como estão.

## Ondas e agentes

- **Onda 0**: `df-architect` (schema + migration, rótulos, regra de criação,
  destinos, Zod, tipos, contrato).
- **Onda 1 (paralelo)**: `df-data` (`insertTicket`, leituras) · `df-ui`
  (`AppTopBar` carregando dado, casca do dialog).
- **Onda 2 (paralelo)**: `df-actions` (`createTicket`) · `df-ui` (formulário
  ligado, bloqueios, toast).
- **Onda 3**: `df-reviewer`.
- **Onda 4**: `df-qa` (navegador + dev server + banco → `docs/test-reports/`).

## Riscos

1. Envio forjado (tag de outro setor, destino Não alocado ou inativo): checagem
   na transação recusa; nada gravado.
2. Chamado enviado a outro setor fica parado em `aguardando_aprovacao` até
   existir a tela de Aprovações (próxima feature); aceitável para teste.
3. Até a Aprovações existir, chamado de outro setor carrega a tag do setor do
   autor.
4. Início um pouco mais caro: duas leituras pequenas (tags e setores) por
   abertura.
5. Nome `mudanca_tag` segue o padrão em português do enum; a tradução de todos
   os valores de enum (e do filtro de período do dashboard) para inglês é
   decisão separada, com migration própria.

## Critério de pronto

1. Próprio setor: membro do Suporte cria com tag do Suporte → `aberto`, origin =
   current = Suporte, 1 linha em `ticket_tag`, evento `criacao`, nenhum
   `ticket_transfer`; toast com número; card do Início +1.
2. Outro setor: mesmo membro cria para Administrativo → `aguardando_aprovacao`,
   current ainda Suporte, `ticket_transfer` pendente Suporte → Administrativo,
   eventos `criacao` + `transferencia_solicitada`, tag do Suporte.
3. Validação: sem tag, título/descrição fora do tamanho ou sem tipo falham no
   campo.
4. Forjado: tag de outro setor → `INVALID_TAG`; Não alocado ou setor inativo
   como destino → `INVALID_DESTINATION`; nada gravado.
5. Banco: segunda tag no mesmo chamado via SQL recusada pelo índice; enum tem
   `mudanca_tag`; `ticket_history` tem `from_tag_id` e `to_tag_id`.
6. Bloqueios: Não alocado ou setor sem tag ativa veem botão desabilitado com
   explicação; action recusa com `FORBIDDEN`.
7. `tsc`, lint e build passam; `df-reviewer` sem bloqueante; `df-qa` aprova os
   cenários.

## Commits por etapa

Definidos depois da implementação, variando verbos e verificando o histórico do
repositório. Docs vão junto da etapa.
