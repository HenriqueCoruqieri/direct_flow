# Relatório de testes — Busca de chamado no topo e voltar para a fila

- **Data:** 2026-10-08
- **Contrato:** `docs/contracts/ticket-search-and-queue-back-link.md`
- **Commit:** `38982a5` · alterações não comitadas: sim
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 20 de 22 passaram · 0 falharam · 0 bloqueados · 2 não executados (B11, parte de B10 e B5 com QA Infra)

## Pré-requisitos

- Dev server: `/login` devolveu 200.
- MCP: `playwright`, `next-devtools` e `postgres` (`SELECT 1` = 1) responderam.
- Usuários: diretor, `qa.admin.suporte` e `qa.member.suporte` existem e estão ativos. `qa.admin.infra@directflow.test` existe mas está **inativo** (`is_active = false`).
- `RESEND_API_KEY` está preenchida; a feature não envia e-mail, então nenhum cenário foi afetado.

## Cenários

Chamado de preparação: `#126` (`[QA] Busca alfa`, QA Suporte, autor M). Foi editado no B17 para `[QA] Busca alfa editado` e resolvido. Nenhum outro chamado foi criado (max(id) = 126).

| #   | Cenário                                                                                                                                                                                                                                      | Papel | Status           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---------------- |
| B1  | Rótulo e placeholder `Buscar por n° ou título do chamado`; sem o texto antigo                                                                                                                                                                | M     | PASSOU           |
| B2  | Digitar `a` e esperar 1 s: nenhum request de action, nenhuma lista                                                                                                                                                                           | M     | PASSOU           |
| B3  | `#126`: `Buscando…` visto durante a espera; depois `#126 · título · Aberto` como único item (nenhum outro id começa com `126`)                                                                                                               | M     | PASSOU           |
| B4  | Dígito `1`: 8 itens, `126, 122, 121, 120, 119, 118, 117, 116`, idêntico ao SQL de comparação                                                                                                                                                 | M     | PASSOU           |
| B5  | `busca ALFA` lista `#126` (sem diferenciar caixa); chamado de outro setor não aparece (ver Observações sobre o `#B2`)                                                                                                                        | M     | PASSOU           |
| B6  | `zzqq-sem-resultado`: `Nenhum chamado encontrado`; Enter não navega (URL `/tickets` inalterada)                                                                                                                                              | M     | PASSOU           |
| B7  | `#126` + Enter: vai a `/tickets/126` sem query; campo limpo; lista fechada; voltar `Meus chamados` → `/tickets` (link do `main`)                                                                                                             | M     | PASSOU           |
| B8  | `%_` e `100%`: `Nenhum chamado encontrado`. `%` e `_` sozinhos (1 caractere) não buscam                                                                                                                                                      | M     | PASSOU           |
| B9  | `busca` digitado com 60 ms entre teclas: 1 request só (`["busca"]`), lista com `#126`                                                                                                                                                        | M     | PASSOU           |
| B10 | Visibilidade por papel (A e D; I inativo)                                                                                                                                                                                                    | A, D  | PASSOU (parcial) |
| B11 | Autor movido para outro setor                                                                                                                                                                                                                | D e M | NÃO EXECUTADO    |
| B12 | `/tickets` e `/queue`: o único `input` da página é o do topo; nenhuma tabela tem busca; filtros e período seguem                                                                                                                             | M     | PASSOU           |
| B13 | Action forjada com `123`, `"x"*201` e `""`: as três devolvem `{"ok":true,"results":[]}` com status 200; sem erro no servidor                                                                                                                 | M     | PASSOU           |
| B14 | Fila → QA Suporte → aba → Semana → clique na linha → voltar (ver Observações: aba Resolvidos, não Fechados)                                                                                                                                  | D     | PASSOU           |
| B15 | `#` com Ctrl+clique abre nova aba com a mesma URL e o mesmo voltar                                                                                                                                                                           | D     | PASSOU           |
| B16 | Período personalizado `de=2026-10-01&ate=2026-10-08`: URL do detalhe leva a origem; voltar restaura o intervalo (`1–8 out 2026`)                                                                                                             | M     | PASSOU           |
| B17 | Pela Fila: editar título, comentar e resolver; a URL mantém `?from=queue&tab=open&periodo=todos` e o link segue `Fila do setor`                                                                                                              | M     | PASSOU           |
| B18 | Abrir chamado por `/tickets` (clique na linha e no `#`): URL `/tickets/126` sem query, link `Meus chamados` → `/tickets`                                                                                                                     | M     | PASSOU           |
| B19 | `?from=evil` e `?from=https://exemplo.com`: `Meus chamados` → `/tickets`. `?from=queue&tab=x&setor=abc&periodo=lixo`: `Fila do setor` → `/queue?tab=open&periodo=todos`                                                                      | M     | PASSOU           |
| B20 | `?from=queue&setor=19`: link `/queue?tab=open&setor=19&periodo=todos`; a Fila mostra QA Suporte (`#126`, `#121`…)                                                                                                                            | M     | PASSOU           |
| B21 | 390×844: lista de 8 itens de x=20 a x=340, sem rolagem horizontal (`scrollWidth` 390), título truncado com reticências, badge visível, Escape fecha, botão "Novo chamado" alcançável (48×48). Screenshot: `.qa-output/b21-mobile-search.png` | M     | PASSOU           |
| B22 | `get_errors` vazio ao final e depois de cada bloco; console sem erro de hidratação; só `#126` e suas linhas foram gravadas                                                                                                                   | todos | PASSOU           |

Evidências principais:

- B4 SQL: `select id from ticket where id::text like '1%' and (created_by=14 or assigned_to=14 or current_department_id=18) order by (id::text='1') desc, id desc limit 8` → `126,122,121,120,119,118,117,116`, igual à lista da tela.
- B10 A (dept 18): `12` → `126,122,121,120`, igual ao SQL de visibilidade; `#125`, `Novo funcion` e `Dúvida para gerar` (chamados do setor Suporte, fora do seu alcance) → `Nenhum chamado encontrado`. `[QA] Busca` → `#126`. Abriu `/tickets/126` sem 404.
- B10 D (diretoria): `12` → `#12` primeiro (exato), depois `126,125,124,123,122,121,120`, igual a `select id from ticket where id::text like '12%' order by (id::text='12') desc, id desc limit 8`. `#125` e `Novo funcion` → `#125`.
- B17 banco: `ticket 126` com `title = '[QA] Busca alfa editado'` e `status = 'resolvido'`; `ticket_history` 246 `criacao` (`to_status aberto`), 247 `edicao` (`Alterou título.`), 248 `resolucao` (`aberto → resolvido`). `ticket.status` bate com a última linha.
- B14: lista `/queue?tab=resolved&setor=18&periodo=semana` → detalhe `/tickets/126?from=queue&tab=resolved&setor=18&periodo=semana` → voltar para a URL da lista; aba, setor e período marcados.

## Falhas

Nenhuma.

## Erros fora dos cenários

- O log do dev server (`.next/dev/logs/next-development.log`) guarda erros anteriores ao teste, de 02:04 a 02:10 no relógio do log (`detailHref is not a function`, `TICKET_LIST_SEARCH is not defined`, `SearchIcon is not defined`, `coreColumnsFeature require an id…`). Vieram da edição em andamento das ondas anteriores. Nada novo depois de 02:21, quando o teste começou, e `get_errors` voltou limpo.
- Um 404 no console para `/tickets/new`: navegação minha, por engano (a rota não existe). Não é da feature.

## Não executados

- **B11** (autor movido de setor): exige que o diretor mova o usuário QA em Cadastros → Pessoas e o devolva depois. É uma escrita fora da preparação do contrato e deixaria o QA fora do setor se a execução parasse no meio. Não foi feito.
- **B10, parte do `I`** (`QA Admin Infra`): o usuário está inativo; o contrato prevê pular.
- **B2 do contrato (`#B2` em QA Infra)**: não foi criado, porque o autor teria de ser `I`, que está inativo. O formulário de Novo chamado para A só oferece destinatários do próprio setor, então não dava para criar um chamado em QA Infra pela interface. O B5 e o B10 foram conferidos com chamados já existentes do setor Suporte (`#123` a `#125`, de usuários que não são M nem A) no lugar do `#B2`.

## Observações

- **B14 e a aba Fechados:** QA Suporte não tem nenhum chamado `fechado` (`aberto 22, encaminhado 5, em_andamento 6, aguardando_aprovacao 3, resolvido 14`). Usei a aba Resolvidos. O mecanismo é o mesmo (`tab` na URL), mas a aba Fechados em si não foi exercitada.
- **Seletor do link de voltar:** o `main` e o menu lateral têm links com os textos `Meus chamados` e `Fila do setor` (`/tickets` e `/queue`). O link de voltar do cabeçalho do detalhe é o que está dentro do `main`; todas as conferências usaram esse.
- **`Buscando…`** só aparece depois do debounce de 250 ms, não ao primeiro caractere. Ficou visível no teste, o contrato não define outro momento.
- Um membro sem acesso (B20) segue com a URL do voltar levando o `setor` forjado (`setor=19`) e a página da Fila o ignora, como o contrato prevê. Não é falha.
- Mobile: o detalhe aberto pela Fila em 390 px não foi conferido (o contrato só pede a lista da busca no B21).
