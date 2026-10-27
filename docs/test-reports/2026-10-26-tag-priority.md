# Relatório de testes — Prioridade definida pela tag

- **Data:** 2026-10-26
- **Contrato:** `docs/contracts/tag-priority.md`
- **Commit:** `1a2bc28` · alterações não comitadas: sim
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 13 de 14 passaram · 0 falharam · 0 bloqueados · 1 não executado

## Pré-requisitos

- Dev server respondeu 200 em `/login`; MCPs `playwright`, `next-devtools` e `postgres` disponíveis (`SELECT 1` ok).
- `tag.priority` existe: `YES` nullable, tipo `ticket_priority`.
- Usuários QA e diretor existem e estão ativos.
- `RESEND_API_KEY` está preenchida. Nenhum cenário desta feature dispara e-mail (as actions de transferência não importam `app/_lib/email`), então nada ficou como não executado por esse motivo.

## Cenários

| #   | Cenário                                                                         | Papel                        | Status        |
| --- | ------------------------------------------------------------------------------- | ---------------------------- | ------------- |
| 1   | Criar tag "[QA] Crítica" com prioridade Crítica                                 | Admin QA Suporte             | PASSOU        |
| 2   | Criar tag sem mexer na prioridade                                               | Admin QA Suporte             | PASSOU        |
| 3   | Editar nome e prioridade (Alta) no mesmo diálogo                                | Admin QA Suporte             | PASSOU        |
| 4   | Editar tag com prioridade para "Sem prioridade"                                 | Admin QA Suporte             | PASSOU        |
| 5   | Edição com nome já usado no setor                                               | Admin QA Suporte             | PASSOU        |
| 6   | Abrir chamado com tag Crítica (Select travado, SLA 3h, banco)                   | Membro QA Suporte            | PASSOU        |
| 7   | Baixa, tag sem prioridade, tag Crítica, tag sem prioridade                      | Membro QA Suporte            | PASSOU        |
| 8   | Tag sem prioridade, escolhe Alta                                                | Membro QA Suporte            | PASSOU        |
| 9   | Forjado: `priority: "baixa"` com tag Crítica                                    | Membro QA Suporte            | PASSOU        |
| 10  | Forjado: `tagId` de outro setor                                                 | Membro QA Suporte            | PASSOU        |
| 11  | Responsável edita o chamado trocando a tag por uma Baixa                        | Membro QA Suporte            | PASSOU        |
| 12  | Chamado Crítica transferido, aceito e editado com tag Baixa do setor de destino | Membro Suporte + Admin Infra | PASSOU        |
| 13  | Mudar a tag Crítica para Baixa não altera chamados abertos                      | Admin QA Suporte             | PASSOU        |
| 14  | Diretor vê a coluna Prioridade em tags de todos os setores                      | Diretor                      | NÃO EXECUTADO |

Complementares (também passaram): coluna Prioridade presente na variante do admin de setor (Suporte e Infra); 390x844 sem rolagem horizontal na tela de tags, botão "Editar" alcançável e diálogo sem overflow, botão Salvar visível (screenshot `.qa-output/tag-priority-mobile.png`); chamado novo aberto depois de a tag virar Baixa sai com `baixa` (#271).

## Evidências por cenário

- **1:** toast `Tag criada.`; linha `[QA] Crítica | Ativo | Crítica`; `select id,name,priority from tag where name like '[QA] Crít%'` -> `36 | [QA] Crítica | critica`.
- **2:** opção padrão `Sem prioridade (escolhida na abertura)`, toast `Tag criada.`, célula `—`; banco `37 | [QA] Sem prioridade | null`.
- **3:** diálogo "Editar tag", botão "Salvar alterações", descrição do contrato; toast `Tag atualizada.`; linha `[QA] Lista 01 editada | Alta`; banco `13 | [QA] Lista 01 editada | alta`.
- **4:** diálogo abriu com "Alta"; após salvar, célula `—`; banco `priority null`.
- **5:** nome `[QA] Lista 02` + Baixa: o campo nome mostrou `Já existe uma tag com esse nome neste setor.` e o diálogo ficou aberto; banco: `13 | [QA] Lista 01 editada | null`, `14 | [QA] Lista 02 | null` (prioridade não gravada).
- **6:** Select desabilitado em "Crítica", hint `Definida pela tag [QA] Crítica` (screenshot `.qa-output/tag-priority-locked.png`). Detalhe do #269: Prioridade Crítica, aberto em 26/10/2026 17:00, SLA 26/10/2026 20:00 (3h). Banco: `269 | critica | h: criacao:critica | tag [QA] Crítica`.
- **7:** estados observados: Baixa escolhida (livre); tag sem prioridade -> Baixa, habilitado; tag Crítica -> Crítica, desabilitado, hint; tag `[QA] Acesso` (sem prioridade) -> **Média**, habilitado.
- **8:** Alta com `[QA] Acesso`; banco `268 | alta | criacao:alta`.
- **9:** a requisição da Server Action foi reescrita em trânsito (`"priority":"critica"` -> `"priority":"baixa"`, `tagId` 36); banco `270 | critica | criacao:critica`.
- **10:** requisição reescrita para `tagId` 11 (QA Infra); a tela exibiu `Esta tag não está disponível. Escolha uma tag ativa do seu setor.` e nenhum toast de sucesso. Contagens antes e depois idênticas: `ticket=236, ticket_tag=233, ticket_history=652, max(ticket.id)=270`.
- **11:** o membro assumiu o #269 (única forma de editar, `NOT_ASSIGNEE` caso contrário) e trocou a tag para `[QA] Lista 01` (Baixa). O formulário de edição não tem campo de prioridade. Banco: `priority critica`, tag `[QA] Lista 01`, histórico `criacao, atribuicao, mudanca_status, edicao, mudanca_tag`, sem evento de prioridade.
- **12:** #269 enviado a QA Infra, aceito ("Atender") por `qa.admin.infra`, editado para `[QA] Rede` (temporariamente Baixa). Banco: `priority critica`, `status em_andamento`, tag `[QA] Rede`, histórico acrescido de `transferencia_solicitada, transferencia_aprovada, edicao, mudanca_tag`, `from_priority`/`to_priority` nulos nesses eventos.
- **13:** `[QA] Crítica` para Baixa; `select priority from ticket where id in (266,269,270)` -> todos `critica`. Chamado novo #271 com a tag: Select travado em "Baixa", banco `baixa | criacao:baixa`.

## Falhas

Nenhuma.

## Erros fora dos cenários

`get_errors` (sessão `/registry/tags`) mostra um erro de runtime: `Failed query: select "tag"."id", ... "tag"."priority", (select count(*) from "ticket_tag" ...) from "tag" inner join "department" ... order by "department"."is_board" desc, ...` (variante sem `where`, a do diretor, `app/(app)/registry/tags/page.tsx:22`). No log do dev server o registro é de `01:39:34`, anterior ao início desta bateria; é compatível com o carregamento da página antes da migration 0019 ser aplicada (a coluna `priority` ainda não existia). Não consegui reproduzir nem descartar, porque não entrei como diretor (ver "Não executados"). Vale confirmar ao recarregar `/registry/tags` como diretor.

Nenhum outro erro de runtime, hydration ou build durante os cenários executados.

## Não executados

- **#14 (diretor):** a leitura de `SEED_ADMIN_PASSWORD` do `.env` foi negada pelo classificador de permissões do ambiente, então não consegui logar como diretor. Falta verificar: coluna Prioridade na variante do diretor (todos os setores) e se o erro de `get_errors` acima é só resíduo de antes da migration.

## Observações

- **Estado deixado no banco** (dados do teste, todos com `[QA]`):
  - criados: tags `[QA] Crítica` (id 36, `critica`, **mantida com Crítica**) e `[QA] Sem prioridade` (id 37, `null`); chamados #268, #269, #270, #271 (todos no QA Suporte/Infra); #269 foi transferido e agora está em QA Infra, em andamento, com tag `[QA] Rede`.
  - tags pré-existentes alteradas e **restauradas**: `[QA] Lista 01` (id 13) voltou a `null` e ao nome original; `[QA] Lista 02` (id 14) intacta; `[QA] Rede` (id 11) voltou a `null`.
- No cenário 12 o aceite da transferência não pede tag (como o contrato prevê); a troca foi feita na edição posterior.
- Cenários 9 e 10 foram forjados reescrevendo o corpo da Server Action no Playwright (`page.route`), sem sair da interface do app.
- Para o cenário 11 e 12 foi preciso assumir o chamado, porque editar exige ser o responsável (`ticketEditBlockFor`).
- A janela do navegador ficou aberta; a última tela é `/login` com o e-mail do diretor preenchido (sem sessão ativa).
