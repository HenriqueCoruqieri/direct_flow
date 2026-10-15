# Relatório de testes — Aba Aprovações

- **Data:** 2026-10-15
- **Contrato:** `docs/contracts/approvals.md`
- **Commit:** `b28aecf` · alterações não comitadas: sim
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 18 de 18 passaram · 0 falharam · 0 bloqueados · 0 não executados

## Pré-requisitos

- Dev server: `/login` devolveu 200.
- MCPs `playwright`, `next-devtools` e `postgres` (`SELECT 1` ok, role somente leitura).
- Usuários de teste conferidos no banco: Diretor (Diretoria, admin), `qa.admin.suporte` (QA Suporte, admin), `qa.member.suporte` (QA Suporte, member), `qa.admin.infra` (QA Infra, admin). Todos ativos.
- `RESEND_API_KEY` vazia (e-mail desligado). Nenhum cenário depende de e-mail.

## Preparação

- M criou pela interface `#247` (`[QA] Aprovação 1`), `#248` (`[QA] Aprovação 2`) e `#249` (`[QA] Aprovação 3`) em QA Suporte.
- `#P4` = `#174` (`[QA] Dono mobile`, QA Suporte, `aberto`, aberto em 12/10, sem pendente, fora de #65–#68).
- A enviou `#247`, `#248` e `#174` para QA Infra e `#249` para a Diretoria.
- Pendentes após a preparação (`select to_department_id, count(*) … status='pendente' group by 1`): Diretoria (11) = 1, setor 13 = 1, QA Suporte (18) = 1, QA Infra (19) = 11.

## Cenários

| #    | Cenário                                                     | Papel | Status |
| ---- | ----------------------------------------------------------- | ----- | ------ |
| AP1  | Item `Aprovações` no menu, posição, ícone e selo            | M, A  | PASSOU |
| AP2  | Selo `warning` e nome acessível para QA Infra               | I     | PASSOU |
| AP3  | `/approvals` sem query: colunas, ordem, sem abas            | I     | PASSOU |
| AP4  | Diretoria: selo e lista só do que foi enviado a ela         | D     | PASSOU |
| AP5  | Lista de QA Suporte = `AP(S)`; vazio com a copy             | A, M  | PASSOU |
| AP6  | Período `Hoje` filtra pela data do envio                    | I     | PASSOU |
| AP7  | Personalizado no dia de abertura de `#174`                  | I     | PASSOU |
| AP8  | Período inválido e data futura caem em `Todos`              | I     | PASSOU |
| AP9  | Clique na linha e `#` levam ao detalhe com `from=approvals` | I     | PASSOU |
| AP10 | Atender: selo -1 sem recarga, lista e banco                 | I     | PASSOU |
| AP11 | Recusar: volta à lista sem recarga, selo -1, banco          | I     | PASSOU |
| AP12 | F5 depois de Recusar mantém o número do selo                | I     | PASSOU |
| AP13 | Reenvio por A; I vê +1 e `#248` volta à lista               | A, I  | PASSOU |
| AP14 | Diretor atende `#249`: selo some sem recarga, lista vazia   | D     | PASSOU |
| AP15 | Membro em Não alocado: menu sem selo, vazio, sem erro       | D, M  | PASSOU |
| AP16 | `from=approvals&periodo=xyz` → voltar com `periodo=todos`   | I     | PASSOU |
| AP17 | 390×844 em `/approvals`                                     | I     | PASSOU |
| AP18 | Console e dev server sem erro ou aviso de hidratação        | todos | PASSOU |

## Evidências por cenário

- **AP1.** M (QA Suporte): nav `Início, Meus chamados, Fila do setor, Aprovações`; ícone `lucide-arrow-right-left`. A (admin): `…, Fila do setor, Aprovações, Cadastros`. O selo mostra `1` por causa de `#64` (Diretoria → QA Suporte, pendente, ver Observações); `aria-label="Aprovações, 1 aguardando"`. Selo com `bg-warning`/`border-warning-border`, `aria-hidden="true"`, `ml-auto`. Screenshot: `.qa-output/ap1-menu-member.png`.
- **AP2.** Selo `11`, `aria-label="Aprovações, 11 aguardando"`, `span` do número com `aria-hidden`. Bate com o banco (11 pendentes para o setor 19).
- **AP3.** Sem barra de abas (`[role=tablist]` ausente), `Todos` selecionado, colunas `# Título Tipo Tag Veio de Status Aberto em Enviado em`, 11 linhas, `Veio de = QA Suporte`. Ordem `174, 248, 247, 213, 197, 195, 157, 143, 147, 70, 68`, idêntica a:
  `select t.id, d.name, tr.created_at from ticket_transfer tr join ticket t … where tr.to_department_id=19 and tr.status='pendente' order by tr.created_at desc, tr.id desc` (mesmas 11 linhas, mesma ordem). Screenshot: `.qa-output/ap3-infra-todos.png`.
- **AP4.** D: selo `Aprovações, 1 aguardando`; lista com só `#249`. Banco: `to_department_id=11 and status='pendente'` → `#249` (QA Suporte, 2026-10-15 22:56:51+00). `#247`, `#248` e `#174` ausentes.
- **AP5.** A e M veem uma linha, `#64` (Diretoria → QA Suporte), igual ao banco (`to_department_id=18`). Nenhum `#P*` na lista. A copy do vazio foi verificada em AP7 e AP15 (a lista de QA Suporte não está vazia, ver Observações).
- **AP6.** `?periodo=hoje`: `#174, #248, #247`, rótulo `15 out 2026`. `#174` aparece com abertura em 12/10. Banco com a janela de hoje (`>= 2026-10-15 03:00+00 and < 2026-10-16 03:00+00`): mesmas 3 linhas, mesma ordem.
- **AP7.** `periodo=personalizado&de=2026-10-12&ate=2026-10-12`: só `#197` e `#195` (enviados em 12/10); `#174` (aberto em 12/10, enviado hoje) ausente. Havia outros envios no dia, então não caiu em vazio. Sem envio em `2026-10-10`: vazio com `Nenhum chamado aguardando aprovação` / `Nenhum chamado foi encaminhado para este setor no período informado`.
- **AP8.** `periodo=lixo` e `personalizado&de=2026-10-16&ate=2026-10-16` (amanhã): `Todos` selecionado, 11 linhas. `semana` (`12–18 out 2026`) e `mes` (`1–31 out 2026`) também coerentes.
- **AP9.** Clique na célula de Tipo da linha de `#247` em `?periodo=hoje` → `/tickets/247?from=approvals&periodo=hoje`; `href` do `#`: `/tickets/247?from=approvals&periodo=hoje`; link de voltar no detalhe: `Aprovações` → `/approvals?periodo=hoje`.
- **AP10.** Selo `11` → `10` sem recarga. Voltar pelo link: lista de `hoje` só com `#174` e `#248`. Banco: `ticket_transfer 47 = aprovado`; `ticket.status = em_andamento`, `assigned_to = 15` (`qa.admin.infra`), `current_department_id = 19`. Última linha de `ticket_history` (`id 667`): `transferencia_aprovada`, `aguardando_aprovacao → em_andamento`, `from_department_id 18 → to_department_id 19`, `to_assignee_id 15`.
- **AP11.** Recusa com motivo: redirecionou para `/approvals?periodo=hoje` sem recarga manual; lista só com `#174`; selo `10` → `9`. Banco: `ticket_transfer 48 = rejeitado`, `review_note` igual ao motivo digitado, `ticket.status = recusado`, `current_department_id = 18`. Última linha de `ticket_history` (`id 668`): `transferencia_rejeitada`, `aguardando_aprovacao → recusado`, setores `19 → 18`.
- **AP12.** F5 em `/approvals?periodo=hoje`: `Aprovações, 9 aguardando`, igual ao de antes do F5.
- **AP13.** A reenviou `#248` para QA Infra (`ticket_transfer 51`, `pendente`, setor 19). Depois do login de I, selo `10` (9 + 1) e `#248` de volta à lista (primeira linha, envio mais recente). Banco: 10 pendentes para o setor 19.
- **AP14.** D abriu `#249` pela lista (`/tickets/249?from=approvals&periodo=todos`) e clicou em Atender: o item do menu perdeu o selo e o `aria-label` sem recarga; ao voltar para Aprovações, lista vazia com a copy do contrato. Banco: `ticket_transfer = aprovado`, `ticket.status = em_andamento`, `current_department_id = 11`, `assigned_to = 6`.
- **AP15.** D moveu M para `Não alocado` em Cadastros → Pessoas (confirmado no banco). M: menu `Início, Meus chamados, Aprovações` (sem Fila, sem selo, sem `aria-label`); `/approvals` com `Nenhum chamado aguardando aprovação` / `Nenhum chamado foi encaminhado para este setor no período informado`; `get_errors` sem erro novo. D devolveu M a `QA Suporte`; banco final: `qa.member.suporte`, `QA Suporte`, `member`, ativo.
- **AP16.** `/tickets/248?from=approvals&periodo=xyz`: link `Aprovações` → `/approvals?periodo=todos`.
- **AP17.** 390×844: `documentElement.scrollWidth = 375` (≤ 390, sem rolagem horizontal da página); tabela com 1101 px dentro de contêiner de 333 px (rolagem horizontal só na tabela); `aside` com `display: none`; título, filtro `Filtros` e presets (`Todos`, `Hoje`, `Semana`, `Mês`, `Personalizado`) cabem. Screenshot: `.qa-output/ap17-mobile.png`.
- **AP18.** Console do navegador: 0 erros e 0 avisos na sessão (consulta `browser_console_messages` com `level=error`). Log do dev server: todas as linhas `ERROR` têm horário 04:50, antes do início desta bateria (04:55); nenhuma ocorrência de "hydration". Escritas desta bateria: preparação (`#247`, `#248`, `#249`, envio de `#174`), AP10, AP11, AP13, AP14 e AP15 (troca de setor de M e devolução). Nada em #65–#68.

## Falhas

Nenhuma.

## Erros fora dos cenários

- `get_errors` do `next-devtools` continua listando, em `sessionErrors`, `ReferenceError: approvalsDepartmentIdFor is not defined` (`app/(app)/layout.tsx:32`, URL `/tickets?tab=assigned&periodo=hoje`). Não é reproduzível: o import existe no layout atual (linhas 9–12), as telas carregaram sem erro em todos os papéis, e o log mostra o erro só às 04:50, antes desta bateria. É resíduo de uma recarga do dev server durante a edição, que o `get_errors` ainda guarda. Os 500 de `/tickets/12` com `TicketDetailGrid is not defined` (console do navegador antes da bateria) têm a mesma origem.

## Não executados

Nenhum.

## Observações

1. **AP1 e AP5 pressupõem `AP(S)` vazio, mas não está.** O banco tem `#64` (Diretoria → QA Suporte, pendente desde 01/10). O selo de QA Suporte aparece com `1` (correto pelo contrato) e a lista não fica vazia. A copy do vazio foi exercitada em AP7, AP14 e AP15. Sugestão ao `df-architect`: reescrever AP1/AP5 como "selo e lista batem com `AP(S)`", ou registrar `#64` no `qa-seed`.
2. **AP13, parte "só depois de recarregar".** A janela única do navegador não mantém duas sessões ao mesmo tempo. Foi conferido o resultado depois de entrar como I (selo +1, `#248` na lista), mas não o estado "selo antigo antes do recarregamento". Comportamento já descrito como aceito pelo contrato (decisão 4A).
3. **Selo `99+`** não foi exercitado: o banco de desenvolvimento não tem mais de 99 pendentes. A regra tem tratamento no domínio (`formatApprovalsBadgeCount`), sem teste de interface nesta bateria.
4. `Aberto em` de `#143` e `#147` mostra 08/10, enquanto o `created_at` é 09/10 02:25 UTC: fuso de exibição (UTC-3). Consistente com o resto do app.
5. Chamados `[QA]` criados ou alterados nesta bateria: `#247` (em andamento em QA Infra), `#248` (pendente em QA Infra), `#249` (em andamento na Diretoria) e `#174` (pendente em QA Infra).
