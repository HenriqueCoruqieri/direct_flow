# Plano — Edição do chamado pelo autor

Aprovado em 2026-10-01. Contrato técnico em `docs/contracts/ticket-edit.md`.
Ponto de partida: "Detalhe e edição pelo autor" em
`docs/contracts/ticket-creation.md` (regras das próximas features).

## Decisões fixadas pelo usuário

| Tema        | Decisão                                                                                                                                                                                                                    |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Onde        | Botão "Editar" no detalhe `/tickets/[id]`, visível **só** quando a regra permite (nunca desabilitado)                                                                                                                      |
| Quem        | Só o **autor**                                                                                                                                                                                                             |
| Quando      | Chamado no setor do autor (`current_department_id` = setor atual do autor, lido fresco do banco), sem `ticket_transfer` pendente, e status diferente de `fechado`, `cancelado` e `aguardando_aprovacao`                    |
| O quê       | Título, descrição, tipo e tag (ativa, do setor do autor, obrigatória, uma só). Não editáveis: destino, status, prioridade, responsável                                                                                     |
| Histórico   | Novo valor `edicao` em `history_event`. Uma edição grava **uma** linha `edicao` com nota do que mudou (`Alterou título, descrição e tipo (Dúvida → Bug).`); se a tag mudou, **também** uma linha `mudanca_tag` com de/para |
| Texto velho | Título e descrição anteriores **não** são guardados                                                                                                                                                                        |
| Sem mudança | Nada é gravado; a pessoa é informada                                                                                                                                                                                       |
| Gravação    | Uma transação: trava o chamado, reconfere a regra com dados frescos, valida a tag, atualiza chamado e tag, grava histórico. Resultados tipados                                                                             |
| Retorno     | `editTicket(input)` → `{ ok, message }`; códigos `INVALID_INPUT`, `FORBIDDEN`, `NOT_FOUND`, `INVALID_TAG`, `NO_CHANGES`. Autor da sessão/banco, nunca do input                                                             |
| Interface   | Dialog com o padrão do "Novo chamado" (React Hook Form + Zod, `Combobox` para tag, `Select` para tipo), pré-preenchido; toast; fecha ao salvar                                                                             |
| E-mail      | Nenhum                                                                                                                                                                                                                     |

## Escopo

**Entra**: valor `edicao` no enum e migration não destrutiva; regra de edição no
domínio (mesma função para o botão e para a transação); schema de edição
derivado do de criação; gravação transacional com histórico; action; botão e
dialog no detalhe; rótulo e frase de `edicao` na linha do tempo.

**Fora**: edição por quem não é o autor (admin, responsável), edição de
destino/status/prioridade/responsável, guarda do texto anterior, e-mail,
anexos e mensagens.

## Impacto

- **Schema**: `edicao` no fim de `history_event`. Nenhuma coluna nova.
- **Tipos**: `TicketDetail.tagId`; fatos de quem edita e do chamado; snapshot,
  valores e diferença da edição; outcomes da gravação; `defaults` do formulário.
- **Domínio**: `canEditTicket` (com tabela de status editáveis), opções do
  formulário, diferença, nota do histórico, mensagem de sucesso; rótulo `Edição`
  e frase `Editou o chamado.`.
- **Validação**: `editTicketSchema` = criação sem destino + `ticketId`.
- **`df-data`**: `tagId` no detalhe; `updateTicketByAuthor` em transação.
- **`df-actions`**: `editTicket`.
- **`df-ui`**: decisão do botão na página, `EditTicketDialog`. Linha do tempo sem
  mudança de código.
- **`df-auth`, `df-email`**: nada.

## Migration

`0008_ticket_edit`: só `ALTER TYPE history_event ADD VALUE 'edicao'`. Não
destrutiva. No Postgres o valor novo não pode ser usado na mesma transação em
que é criado; a migration não o usa. Aplicação (`npm run db:migrate`) pelo
usuário, antes do teste.

## Ondas e agentes

- **Onda 0**: `df-architect` (schema, migration, tipos, domínio, validação,
  contrato, plano).
- **Onda 1 (paralelo)**: `df-data` (`tagId` no detalhe, `updateTicketByAuthor`) ·
  `df-ui` (botão condicionado à regra, casca do dialog).
- **Onda 2 (paralelo)**: `df-actions` (`editTicket`) · `df-ui` (formulário ligado à
  action, toasts, tratamento dos códigos).
- **Onda 3**: `df-reviewer`.
- **Onda 4**: `df-qa` (navegador, dev server, banco só leitura →
  `docs/test-reports/`).

## Riscos

1. Migration não aplicada → toda edição falha como erro inesperado, sem gravar.
2. O histórico registra que título/descrição mudaram, não o texto anterior
   (decidido).
3. Setor do autor sem tag ativa: o botão aparece, mas não há tag para escolher e
   o formulário não salva.
4. Autor que muda de setor perde a edição dos chamados que ficaram no setor
   antigo (decidido pela regra).
5. As próximas features que criarem ou mudarem `ticket_transfer` de um chamado
   existente precisam travar o chamado antes, como a edição faz.

## Critério de pronto

1. Autor edita título, descrição e tipo: chamado atualizado, uma linha `edicao`
   com a nota, linha do tempo mostra a edição.
2. Troca de tag: `edicao` + `mudanca_tag` (de/para), `ticket_tag` com uma linha.
3. Sem mudança: nada gravado, aviso `Nenhuma alteração para salvar.`.
4. Outro usuário (mesmo setor, diretor) não vê o botão; a action forjada recusa
   (`FORBIDDEN`, ou `NOT_FOUND` para quem nem vê o chamado).
5. Chamado aguardando aprovação, fechado ou cancelado não tem botão; a action
   recusa.
6. Tag de outro setor forjada → `INVALID_TAG`, nada gravado.
7. `tsc`, lint e build passam; `df-reviewer` sem bloqueante; `df-qa` aprova os
   cenários do contrato.

## Commits por etapa

Definidos depois da implementação, variando verbos e verificando o histórico do
repositório. Docs vão junto da etapa.
