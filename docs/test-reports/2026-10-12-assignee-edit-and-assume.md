# Relatório de testes — Edição pelo destinatário, "Assumir" no detalhe e resolvedor como destinatário

- **Data:** 2026-10-12
- **Contrato:** `docs/contracts/assignee-edit-and-assume.md`
- **Commit:** `959a0bd` · alterações não comitadas: não
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 28 de 34 passaram · 1 falhou · 0 bloqueados · 5 não executados (após o Reteste 1: 29 de 34 · 0 falharam · 5 não executados)

## Pré-requisitos

- Dev server no ar (`/login` devolveu 200).
- Playwright disponível; a janela do Chrome ficou visível.
- **MCPs `postgres` e `next-devtools` indisponíveis nesta sessão** (informado pelo comando). Todo estado foi conferido pela interface (linha do tempo, destinatário, selo de status, botões). Cenários que só o banco ou os logs do servidor confirmam ficaram como "não executado" ou com ressalva.
- `RESEND_API_KEY` está **preenchida** no `.env`. Esta feature não envia e-mail, mas "nenhum e-mail" (AE34) não pôde ser conferido.
- Os usuários QA entraram com sucesso (M, A, I e Diretor).
- Observação de método: para o AE10 a aba do M precisava continuar com a sessão do M enquanto o A agia. O A, o Diretor e o I foram abertos em contextos separados do mesmo navegador visível do servidor MCP (nenhum navegador próprio foi lançado). A janela segue aberta.

## Chamados criados (todos pela interface, como M, tag `[QA] Acesso`)

| Ref | Id  | Título                        |
| --- | --- | ----------------------------- |
| D1  | 166 | `[QA] Dono fila`              |
| D2  | 167 | `[QA] Dono membro`            |
| D3  | 168 | `[QA] Dono admin`             |
| D4  | 169 | `[QA] Dono transferência`     |
| D5  | 170 | `[QA] Dono resolução membro`  |
| D6  | 171 | `[QA] Dono resolução admin`   |
| D7  | 172 | `[QA] Dono resolução diretor` |
| D8  | 173 | `[QA] Dono forja`             |
| D9  | 174 | `[QA] Dono mobile`            |

## Cenários

| #    | Cenário                                                                       | Papel   | Status                                                                                                            |
| ---- | ----------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------- |
| AE1  | Autor na fila: sem "Editar", com "Assumir" e formulário de resolver           | M       | PASSOU                                                                                                            |
| AE2  | Admin do setor na fila: sem "Editar", com "Assumir"                           | A       | PASSOU                                                                                                            |
| AE3  | Diretoria na fila: sem "Editar" e sem "Assumir"                               | D       | PASSOU (visto no #172, que também estava na fila; o #166 só foi aberto pelo D depois do assumir)                  |
| AE4  | Autor de chamado com destinatário A: nenhum dos botões                        | M       | PASSOU                                                                                                            |
| AE5  | Destinatário A: "Atender" e "Editar"; Editar abre e Cancelar volta sem gravar | A       | PASSOU                                                                                                            |
| AE6  | Terceiros no #167 (destinatário M): nenhum botão                              | A e D   | PASSOU                                                                                                            |
| AE7  | Destinatário M: "Editar", sem "Assumir"/"Atender"                             | M       | PASSOU                                                                                                            |
| AE8  | "Assumir" no detalhe                                                          | A       | PASSOU                                                                                                            |
| AE9  | Banco após o assumir                                                          | banco   | NÃO EXECUTADO (sem `postgres`); pela UI: `Atribuição` antes de `Mudança de status`, mesmo minuto                  |
| AE10 | Assumir com a página velha                                                    | M       | PASSOU                                                                                                            |
| AE11 | Destinatário edita título e tag                                               | A       | PASSOU                                                                                                            |
| AE12 | Fila coerente com o detalhe                                                   | A       | PASSOU                                                                                                            |
| AE13 | Forja do #173 para o #166                                                     | M       | PASSOU                                                                                                            |
| AE14 | Forja do #166 para o #173 (A é admin do setor)                                | A       | PASSOU                                                                                                            |
| AE15 | Forja do #173 para o #170 (na fila)                                           | M       | PASSOU                                                                                                            |
| AE16 | M troca o destinatário para A; A passa a ver "Editar" e "Atender"             | M e A   | PASSOU                                                                                                            |
| AE17 | Enviar #169 para QA Infra: sem "Editar", sem texto "Aguarde…"                 | M       | PASSOU                                                                                                            |
| AE18 | Durante a pendência: I vê Atender e Recusar; D nada                           | I e D   | PASSOU                                                                                                            |
| AE19 | Forja do #173 para o #169 pendente                                            | M       | PASSOU                                                                                                            |
| AE20 | I atende o #169: destinatário QA Admin Infra, "Editar" aparece                | I       | PASSOU                                                                                                            |
| AE21 | Editar após o aceite: tag sem seleção, dica, opções só de QA Infra            | I       | PASSOU                                                                                                            |
| AE22 | Recategorizar e salvar                                                        | I       | PASSOU                                                                                                            |
| AE23 | Banco após o AE22                                                             | banco   | NÃO EXECUTADO (sem `postgres`); pela UI: `Edição` e `Mudança de tag` com autoria de QA Admin Infra                |
| AE24 | Autor fora do setor sem "Editar"                                              | M       | PASSOU (aberto pela URL, não pela busca)                                                                          |
| AE25 | Autor resolve chamado da fila e vira destinatário                             | M       | PASSOU                                                                                                            |
| AE26 | Banco após o AE25                                                             | banco   | NÃO EXECUTADO (sem `postgres`); pela UI: `Atribuição` e depois `Resolução`, mesmo minuto, sem `Mudança de status` |
| AE27 | Resolvedor edita a solução na janela                                          | M       | PASSOU                                                                                                            |
| AE28 | Admin resolve chamado da fila; M (autor) sem "Editar"                         | A e M   | PASSOU                                                                                                            |
| AE29 | Diretoria resolve chamado de outro setor: continua sem destinatário           | D, A, M | PASSOU (pela UI; sem confirmação de `assigned_to` nulo e de ausência de `atribuicao` no banco)                    |
| AE30 | Destinatário A resolve o #167: sem `atribuicao` nova                          | A       | PASSOU (pela UI: só `Resolução` nova na linha do tempo; destinatário segue A)                                     |
| AE31 | Seed: `[QA] Janela aberta` com destinatário M                                 | M e A   | **FALHOU**                                                                                                        |
| AE32 | Banco: `assigned_to` dos `[QA] Janela aberta`                                 | banco   | NÃO EXECUTADO (sem `postgres`); pela UI, ver #31                                                                  |
| AE33 | 390×844: "Assumir" alcançável no #174                                         | A       | PASSOU                                                                                                            |
| AE34 | Exclusividade, sem e-mail, sem erro de hidratação                             | todos   | NÃO EXECUTADO em parte (ver abaixo)                                                                               |

Detalhes que sustentam alguns PASSOU:

- **AE8**: durante o envio o botão trocou para `Assumindo…` e ficou desabilitado; toast `Você assumiu o chamado #166.`; a página atualizou sem recarregar com `Destinatário` QA Admin Suporte, selo `Em andamento`, sem "Assumir", com "Editar", sem "Atender"; linha do tempo `QA Admin Suporte assumiu o chamado.` e `Alterou o status de Aberto para Em andamento.`.
- **AE10**: toast `Este chamado já foi assumido por QA Admin Suporte.`; a página atualizou sem "Assumir" e sem "Editar"; a linha do tempo manteve uma única atribuição.
- **AE13 a AE15 e AE19**: o payload da action foi trocado (`ticketId`) com `page.route` a partir de um formulário legítimo. Em todos o toast foi `Você não pode editar este chamado.`, e a reabertura do chamado-alvo mostrou título inalterado e nenhuma linha `Edição`.
- **AE17**: após o envio, os botões do cabeçalho eram só os do Comentar; nenhum elemento `aria-disabled`; texto `Aguarde a solução` ausente na página.
- **AE21**: tag sem seleção, dica `A tag atual não está disponível. Escolha uma tag ativa do seu setor.`, opções de tag `[QA] Rede` (somente), destinatários `Fila de QA Infra` e `QA Admin Infra`.
- **AE25**: toast `Chamado #170 resolvido.`; destinatário QA Membro Suporte; linha do tempo `Abertura` → `QA Membro Suporte assumiu o chamado.` → `Resolveu o chamado.`; "Editar" aparece.
- **AE27**: toast `Chamado #170 atualizado.`, nota `Alterou solução.`, `Resolvido em` inalterado (12/10/2026 15:18).
- **AE33**: botão `Assumir` visível em x=20, y=254 (97×32), sem rolagem horizontal. Screenshot em `.qa-output/ae33-mobile.png`.

## Falhas

### #31 — Seed: `[QA] Janela aberta` com destinatário QA Membro Suporte

- **Papel:** M (`qa.member.suporte@directflow.test`) e A (`qa.admin.suporte@directflow.test`)
- **Passos:** 1. Buscar `Janela` pela busca do topo como M: aparecem #122 `[QA] Janela aberta nova`, #84 `[QA] Janela aberta` e #83 `[QA] Janela vencida`. 2. Abrir `/tickets/84` e `/tickets/122` como M e como A.
- **Esperado:** `docs/contracts/qa-seed.md` (revisão de 2026-10-12) e AE31: o `[QA] Janela aberta` de maior `id` ainda `resolvido` tem `Destinatário` QA Membro Suporte, M vê "Editar" (com o campo Solução) e A não vê.
- **Obtido:** O `[QA] Janela aberta` de maior id (#84) mostra `Destinatário` **Fila de QA Suporte** e nenhum botão de ação para M (só "Novo chamado"). O #122 (`[QA] Janela aberta nova`, título que não existe no `seedQa` atual) também mostra `Destinatário` Fila de QA Suporte, editável até 13/10/2026 23:14, e M só vê "Comentar". Não existe `[QA] Janela aberta` novo, com destinatário, criado pelo seed rodado. O #84 não deveria ter sido considerado válido pela idempotência revisada, e o seed devia ter criado outro.
- **Evidência:** abertura de `/tickets/84` e `/tickets/122` como M e A (botões listados: `["Novo chamado"]` e `["Novo chamado","Comentar"]`). Sem consulta ao banco (MCP `postgres` indisponível).
- **Camada provável:** data (`seedQa` / `seedQaWindowTickets` em `db/seed.ts`: idempotência não exige o destinatário, ou o seed rodado não incluiu a versão nova). Também é possível que o seed tenha sido executado com código antigo; confirmar com `select id, title, status, assigned_to from ticket where title like '[QA] Janela aberta%' order by id` (é o AE32).
- **Dono:** df-data

## Erros fora dos cenários

Nenhum nesta sessão. O console do navegador desta sessão (logs `.qa-output/console-2026-10-12T18-16-26-115Z.log` e `…18-17-50-368Z.log`) não tem erro nem aviso. O histórico completo do MCP (`all=true`) mostra 58 mensagens `[ERROR]` de `Export ticketEditButtonStateFor doesn't exist in target module` (`app/(app)/tickets/[id]/page.tsx:21` e `app/_lib/actions/tickets.ts:8`). Elas vêm do log `console-2026-10-12T17-30-30-167Z.log`, anterior a esta sessão (18:16), e batem com o momento em que os arquivos da feature mudavam durante a implementação. Não se repetem agora.

## Não executados

- **AE9, AE23, AE26, AE32**: exigem consulta ao banco (MCP `postgres` indisponível). Apoio pela UI descrito na tabela.
- **AE34 (parte)**: "nenhum e-mail" e "sem erro/aviso de hidratação pelo `next-devtools`" não puderam ser confirmados: sem `next-devtools` nem acesso aos logs do servidor, e `RESEND_API_KEY` está preenchida (a linha de log `RESEND_API_KEY não configurada` não seria emitida de qualquer jeito). A parte verificável passou: em todos os cabeçalhos observados "Assumir" nunca apareceu junto de "Atender", "Recusar" ou "Editar", e o console do navegador ficou limpo.

## Observações

- Contas e papéis: o Diretor tem "Resolver" e "Enviar para outro setor" em chamados da fila de QA Suporte, mas nunca "Assumir" nem "Editar", como o contrato prevê.
- O AE3 e o AE6 do Diretor foram observados nos chamados #172/#167 e não em #166 antes do assumir, porque o Diretor foi aberto depois do A. A regra observada é a mesma.
- O AE24 foi feito pela URL, não pela busca; a busca só foi usada para localizar os `[QA] Janela aberta`.
- A fila (`/queue`) lista apenas chamados sem destinatário na aba padrão; por isso o #166 não aparece mais nela depois do assumir (AE12 considerado coerente).
- Chamados de teste criados e alterados (todos `[QA]`, em QA Suporte/QA Infra): #166 a #174. Os #65 a #68 não foram tocados.

## Reteste 1

Motivo: o seed não tinha rodado depois do commit; o usuário rodou `SEED_QA=true npm run db:seed`. MCPs `postgres` e `next-devtools` seguem indisponíveis; conferência pela interface.

| #    | Cenário                                       | Papel | Status |
| ---- | --------------------------------------------- | ----- | ------ |
| AE31 | Seed: `[QA] Janela aberta` com destinatário M | M e A | PASSOU |

- A busca por `Janela aberta` agora devolve #176, #122 e #84. O de maior id é o **#176** (`[QA] Janela aberta`, `Resolvido`, editável até 13/10/2026 15:24), com `Destinatário` QA Membro Suporte.
- Linha do tempo do #176: `Abertura`, `QA Membro Suporte assumiu o chamado.` (Atribuição, 06/10/2026 15:24) e `Resolveu o chamado.` (mesmo horário).
- M vê "Editar" (botões: Novo chamado, Editar, Comentar); ao abrir o modo de edição o campo Solução está presente; Cancelar volta sem gravar.
- A abre o #176 e não vê "Editar" (só Novo chamado e Comentar).
- O #84 (anterior ao seed novo) segue com `Destinatário` Fila de QA Suporte e sem "Editar" para M, como prevê o risco 2 do contrato.
- Falha #31 encerrada; nenhum dono pendente. AE32 continua não executado (sem `postgres`); pela interface o resultado é o descrito acima.
