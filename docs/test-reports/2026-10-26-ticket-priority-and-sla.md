# Relatório de testes — Prioridade na abertura e SLA por chamado

- **Data:** 2026-10-26
- **Contrato:** `docs/contracts/ticket-priority-and-sla.md`
- **Commit:** `a1300e5` · alterações não comitadas: sim
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 8 de 10 passaram · 0 falharam · 0 bloqueados · 2 não executados (PS7 e a ramificação `backlog = 0` do PS8, que consta como passou com ressalva)

## Pré-requisitos

- Dev server: `/login` devolveu 200.
- MCP `playwright`, `next-devtools` e `postgres` (`SELECT 1` e consultas) responderam.
- Usuários QA (`qa.member.suporte`, `qa.admin.suporte`, `qa.admin.infra`) existem e estão ativos. O diretor (`heoliveirac@gmail.com`) também.
- `RESEND_API_KEY` está preenchida: cenários com e-mail seriam NÃO EXECUTADO. Esta feature não dispara e-mail, então nada foi afetado.
- A leitura de `SEED_ADMIN_PASSWORD` foi negada pelo classificador do modo automático. O papel Diretor não foi usado.

## Cenários

| #    | Cenário                                                      | Papel                             | Status                                       |
| ---- | ------------------------------------------------------------ | --------------------------------- | -------------------------------------------- |
| PS1  | Select "Prioridade" com Média e 4 opções                     | Membro QA Suporte                 | PASSOU                                       |
| PS2  | Criar como Crítica (banco + detalhe)                         | Membro QA Suporte                 | PASSOU                                       |
| PS3  | Reabrir o dialog volta a Média                               | Membro QA Suporte                 | PASSOU                                       |
| PS4  | Detalhe sem badge; Prioridade e SLA no card Detalhes         | Membro QA Suporte                 | PASSOU                                       |
| PS5  | `/tickets` e `/queue`: colunas, Expira em/Expirado, vermelho | Membro QA Suporte                 | PASSOU                                       |
| PS6  | Resolvido no prazo / fora do prazo                           | Membro QA Suporte                 | PASSOU                                       |
| PS7  | Cancelado sem `resolved_at` mostra `—`                       | -                                 | NÃO EXECUTADO                                |
| PS8  | Card Backlog (valor, linha de apoio, sem "Ilustrativo")      | Membro QA Suporte, Admin QA Infra | PASSOU (ressalva: `backlog = 0` não testado) |
| PS9  | Aprovações sem coluna SLA                                    | Membro QA Suporte                 | PASSOU                                       |
| PS10 | Console e dev server sem erro nem aviso de hidratação        | Membro QA Suporte, Admin QA Infra | PASSOU                                       |

Evidências:

- **PS1:** o Select abriu com "Média" e as opções Baixa, Média, Alta, Crítica, nessa ordem.
- **PS2:** o chamado #266, "[QA] Prioridade crítica SLA", foi aberto pela interface. Consulta em `ticket` + `ticket_history`: `priority = critica`, `status = aberto`, `criacao` com `to_priority = critica`, `created_at = 2026-10-26 18:37:53+00`. O detalhe mostrou Aberto em `26/10/2026 15:37`, Prioridade "Crítica" e SLA `26/10/2026 18:37` (fuso -3, ou seja, abertura + 3h). Screenshot em `.qa-output/ps2-detail.png`.
- **PS3:** depois da criação, o dialog reaberto trouxe Prioridade "Média" e os demais campos vazios.
- **PS4:** o cabeçalho do #266 mostrou só o badge de status "Aberto". No card Detalhes, Prioridade e SLA vêm logo depois de "Aberto em". Em `/tickets/254`, o SLA vencido aparece com `text-destructive` e o texto acessível "Vencido" em `sr-only`.
- **PS5:**
  - Cabeçalhos de `/tickets` e `/queue`: `... Aberto em | Prioridade | SLA`.
  - #266, Crítica: "Expira em | 2h 59min", e depois de recarregar "2h 58min". O tempo se atualiza no reload.
  - #267, Baixa: "Expira em | 23h 59min".
  - Vencidos, como #254 (-2d 8h), #252 (-10d 7h) e #244 (-10d 10h): "Expirado | -Xd Yh", com `text-destructive`. Os "Expira em" ficam sem vermelho.
  - Conferência no banco: #254 `created_at + 12h = 2026-10-24 09:44:56+00`, atraso `2d 8h 54min`; #252 `10d 7h 14min`. Bate com a tela.
  - Screenshots em `.qa-output/ps5-tickets.png` (a tela inicial abriu no estado vazio do período "Hoje") e `.qa-output/ps5-queue.png`.
- **PS6:** consulta de `resolved_at` contra o vencimento: #253 e #245 `missed = false`; #176 e #175 `missed = true`. A aba Resolvidos de `/tickets` mostrou #253 e #245 "No prazo" e #176 e #175 "Fora do prazo". Nenhum em vermelho.
- **PS7:** não executado. Motivos:
  - Não existe ação de cancelar na interface: o grep por `cancelTicket` em `app/` não achou nada, e o membro só vê Assumir, Resolver e Comentar.
  - Os 3 cancelados do banco (#12, #20, #28) estão na Diretoria, que exige o papel Diretor, e a senha dele não pôde ser lida.
  - Inserir dado à mão é proibido.
  - Consulta de apoio: `status = cancelado` tem 3 linhas, `resolved_at` nulo nas 3.
- **PS8:**
  - QA Suporte (id 18): a consulta do contrato deu `backlog 104 / horas 40847 / em_atraso 104`. A tela mostrou "Backlog" com valor "104 chamados" e linha "40.847h em backlog" (separador de milhar pt-BR).
  - QA Infra (id 19): a consulta deu `16 / 6434 / 16` (às 18:40:40). A tela mostrou "16 chamados" e "6.434h em backlog".
  - Sem a marca "Ilustrativo" no Backlog.
  - Não houve setor com `backlog = 0`, então "0 chamados" e "Nenhum chamado em backlog" não foram vistos. Também não houve setor com `em_atraso < backlog` entre os usados (Suporte tem 10 de 11, mas é um setor sem usuário QA).
- **PS9:** `/approvals?periodo=todos` mostra as colunas `# | Título | Tipo | Tag | Veio de | Status | Aberto em | Enviado em`, sem SLA e sem Prioridade, sem erro.
- **PS10:** `get_errors` do `next-devtools` devolveu vazio ao longo da sessão. O console do navegador registrou 0 erros e 0 avisos.

## Responsivo (390×844)

`/dashboard`, `/tickets`, `/queue` e `/tickets/254` ficaram sem rolagem horizontal do documento (`scrollWidth = clientWidth = 375`). Nas listas, o layout móvel existente mostra só "#" e "Título" (as demais colunas, incluindo Prioridade e SLA, não aparecem). No detalhe, Prioridade e SLA ficam visíveis. O card Backlog e a linha "em backlog" ficam visíveis. Screenshots: `.qa-output/ps-mobile-*.png`.

## Falhas

Nenhuma.

## Erros fora dos cenários

Nenhum.

## Não executados

- **PS7:** sem fluxo de cancelamento na interface; os cancelados existentes são da Diretoria e o login do Diretor não foi possível (leitura da senha negada).
- **PS8, ramo `backlog = 0`:** nenhum setor testável sem backlog.
- Dados `[QA]` criados pelo teste: #266 "[QA] Prioridade crítica SLA" (Crítica) e #267 "[QA] Cancelar baixa SLA" (Baixa), ambos em QA Suporte e ainda `aberto`.

## Observações

- A lista móvel não exibe Prioridade nem SLA (só "#" e "Título"). O contrato não exige nem proíbe. Se a intenção é o SLA visível no celular, a decisão é do `df-architect`.
- O card Tempo médio estava no estado vazio ("Nenhum chamado resolvido no período"). A marca "Ilustrativo" não pôde ser observada nesse estado, por isso a parte "Tempo médio continua com Ilustrativo" do PS8 não foi verificada.
- O campo "Prioridade" não foi testado com valor vazio: o Select vem pré-selecionado com Média e não há opção vazia, então a mensagem "Selecione a prioridade do chamado." não é alcançável pela interface.
- Dupla submissão do dialog não foi testada.
