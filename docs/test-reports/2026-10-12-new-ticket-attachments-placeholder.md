# Relatório de testes — Anexos no novo chamado (botão bloqueado e área vazia)

- **Data:** 2026-10-12
- **Contrato:** `docs/contracts/new-ticket-attachments-placeholder.md`
- **Commit:** `980d634` · alterações não comitadas: sim
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 14 de 14 passaram · 0 falharam · 0 bloqueados · 0 não executados

## Pré-requisitos

- Dev server respondeu 200 em `/login`; MCPs `playwright`, `next-devtools` e `postgres` disponíveis.
- Usuários QA existem e estão ativos (consulta a `users` + `department`): `qa.admin.infra`, `qa.admin.suporte`, `qa.member.suporte`.
- `RESEND_API_KEY` está preenchida no `.env`. Os fluxos testados (criar chamado, comentar, excluir comentário, "Anexar") não importam `app/_lib/email` nas actions (`grep` em `app/_lib/actions`: só `profile.ts`), então nenhum cenário foi marcado como não executado por isso.

## Cenários

Todos com o papel M (`qa.member.suporte@directflow.test`).

| #    | Cenário                                                          | Viewport | Status |
| ---- | ---------------------------------------------------------------- | -------- | ------ |
| NA1  | Seção Anexos no dialog (posição, grupo, sem `ul`/`file`)         | 1440×900 | PASSOU |
| NA2  | Hover no botão: opacity 0.5, `not-allowed`, sem tooltip/title    | 1440×900 | PASSOU |
| NA3  | Tab da Descrição vai ao botão; `aria-disabled`, descrição, anel  | 1440×900 | PASSOU |
| NA4  | Clique com rascunho: toast, dialog aberto, nada gravado          | 1440×900 | PASSOU |
| NA5  | Enter, Espaço e 3 cliques: um toast só, foco mantido             | 1440×900 | PASSOU |
| NA6  | Clique no toast com dialog aberto não fecha o dialog             | 1440×900 | PASSOU |
| NA7  | Criação completa com "Anexar" no meio; sem linha em `attachment` | 1440×900 | PASSOU |
| NA8  | Cancelar, X e Esc: reabre vazio e com a seção igual              | 1440×900 | PASSOU |
| NA9  | "Anexar" da Conclusão em `/tickets/200`                          | 1440×900 | PASSOU |
| NA10 | Dialog em 390×844: mesma linha, sem rolagem horizontal           | 390×844  | PASSOU |
| NA11 | Toque no botão: toast, dialog aberto, sem seletor                | 390×844  | PASSOU |
| NA12 | Sem erro de runtime/hidratação, sem e-mail                       | toda     | PASSOU |
| NA13 | Toast sobre o X: toque cai no toast; depois X fecha              | 390×844  | PASSOU |
| NA14 | AlertDialog + toast: clique e arrasto não fecham                 | 1440×900 | PASSOU |

Evidências principais:

- **NA1:** o grupo `Anexos` fica em `top=385`, entre Descrição (232) e Tipo (493). `outerHTML` do grupo: `role="group"`, `aria-labelledby` apontando para o título `Anexos`, `ul/li = 0`, `input[type=file] = 0` no dialog. Botão com `aria-disabled="true"` e `span.sr-only` "Anexos estarão disponíveis em breve.". Screenshot `.qa-output/na1.png`.
- **NA2:** `opacity: 0.5`, `cursor: not-allowed`, `title: ""`, 0 tooltips, 0 toasts após 1,2 s de hover.
- **NA3:** foco em `Anexar` com `aria-disabled=true` e descrição correta; o Tab seguinte cai no combobox Tipo. O anel de foco aparece em `.qa-output/na3.png`. A leitura de `boxShadow` por script veio transparente (transição em curso); a conferência foi visual.
- **NA4/NA5:** `select count(*) from ticket where title like '[QA] Anexos%'` = 0 após todas as ativações. Toast `info` único, valores mantidos, 0 `input[type=file]`. Observação: o Playwright trata `aria-disabled` como botão desabilitado, então os cliques usaram `force: true` (clique real por coordenada).
- **NA6:** com o `body` em `pointer-events: none`, `elementFromPoint` no centro do toast devolveu o toast (`pointer-events: auto`). Clique de mouse real nele: dialog aberto, título mantido. Depois que o mouse saiu, o toast sumiu e o dialog seguiu aberto.
- **NA7:** chamado **#200** `[QA] Anexos criação`, status `aberto`, 1 `ticket_tag`, 1 `ticket_history` (`criacao`, `to_status=aberto`, `to_department_id=18`), `attachment` = 0. Toast `Chamado #200 criado.`.
- **NA8:** campos vazios e seção igual após Cancelar, X e Esc.
- **NA9:** em `/tickets/200`, `Anexar` na linha de botões ao lado de `Resolver`. Clique, Enter e Espaço mostram o toast; `ticket.status` continua `aberto` e `ticket_history` com 1 linha. Screenshot `.qa-output/na9.png`.
- **NA10:** título e botão na mesma linha (botão x 245–335 de 390). `documentElement` 390/390, `[role=dialog]` 343/343, e o dialog rola por dentro (901 > 812). "Abrir chamado" alcançável (top 739, bottom 771). Screenshot `.qa-output/na10.png`.
- **NA13:** com o toast visível, `elementFromPoint` no centro do X (337,38) = toast. O toque não fechou o dialog (`t = "[QA] draft mobile"`). Depois que o toast sumiu, o mesmo ponto devolveu o `BUTTON` do X, o toque fechou o dialog e ao reabrir o título estava vazio. Screenshot `.qa-output/na13.png`.
- **NA14:** na `/tickets/200`, publiquei `[QA] c1` e `[QA] c2` e excluí `[QA] c1` (toast `Comentário excluído.`). Na rodada de verificação de clique, o toast expirou antes de abrir o c2, então repeti com um segundo `[QA] c1`. Com o toast visível e o `AlertDialog` do c2 aberto, o toast recebeu o clique (hit = toast, `pointer-events: auto`), o `AlertDialog` ficou aberto, o arrasto dispensou o toast (0 toasts) e o `AlertDialog` continuou aberto. `Cancelar` fechou sem excluir (`select * from message where ticket_id=200` mostrou o c2 no id 74). A confirmação excluiu o c2 (tela e `count(*) from message where ticket_id=200` = 0) com novo toast `Comentário excluído.`.
- **NA12:** `get_errors` do `next-devtools` devolveu `configErrors: []` e `sessionErrors: []` após os cenários de desktop e de mobile; nenhum aviso de hidratação novo; nenhuma linha de e-mail.

Dados criados: ticket #200 (`[QA] Anexos criação`), mantido em QA Suporte; os comentários `[QA] c1` (duas vezes) e `[QA] c2` foram excluídos pelo próprio teste. Nenhum de #65 a #68 foi tocado.

## Falhas

Nenhuma.

## Erros fora dos cenários

O `browser_console_messages` com `all: true` trouxe erros acumulados na sessão do navegador, anteriores a esta bateria e vindos de edição ao vivo dos arquivos pelo `df-ui` (HMR no meio da mudança):

- `Export TICKET_ATTACHMENTS_SOON_MESSAGE doesn't exist` e `Can't resolve './conclusion-blocked-actions'` em `resolve-ticket-form.tsx`.
- `ReferenceError: ConclusionBlockedActions is not defined` e `NewTicketAttachments is not defined`.
- 500 em `/tickets/199`, 404 em `/tickets/new` e um `TypeError` de `performance.measure` no `TicketDetailPage` (comportamento do dev do React).

Nada disso reproduziu durante a bateria: o código atual compila, `get_errors` está limpo e `/tickets/200` renderizou normalmente. Fica o registro; o `/tickets/new` (404) não tem relação com a feature.

## Não executados

Nenhum.

## Observações

1. **Toast do "Anexar" acompanha o toast de sucesso na criação (NA7).** Depois de `Anexar` + `Abrir chamado`, ficaram dois toasts ao mesmo tempo (`Chamado #200 criado.` e `Anexos estarão disponíveis em breve.`). O contrato não diz o que acontece com o toast do "Anexar" quando o dialog fecha. Ambiguidade para o `df-architect`: tudo bem coexistirem ou ele deveria ser dispensado ao fechar?
2. **Toast cobre o X no mobile (NA13).** O contrato já prevê isso (item c). Confirmado em execução: em 390 px, o centro do X cai no toast enquanto ele vive (toast em x 16–374, y 16–69,5; X em 323–351, 24–52). Ressalva de UX apenas; o toast dura ~4 s sem hover.
3. **Janela de tempo do NA13/NA14.** O toast tem vida curta; o cenário só dá para conferir se a verificação de `elementFromPoint` e o toque acontecerem dentro de ~4 s do toast aparecer. Vale dizer no contrato, para o próximo executor não concluir errado que a proteção falhou.
4. **Cliques em `aria-disabled` pelo Playwright.** O Playwright recusa clique sem `force: true` porque trata `aria-disabled` como desabilitado. É peculiaridade da ferramenta, não do componente.
5. **Escopo do contrato de `AlertDialog`.** O contrato (item b, tabela de efeito global) previa melhora para `AlertDialog`; NA14 confirma. Os `Dialog` sem guarda (item a) não foram exercitados nesta bateria, como o próprio contrato declara.
