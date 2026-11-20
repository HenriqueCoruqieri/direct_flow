# Relatório de testes — Número de recusados em "Meus chamados" (menu)

- **Data:** 2026-11-20
- **Contrato:** `docs/contracts/my-tickets-nav-badge.md`
- **Commit:** `1aa5762` · alterações não comitadas: não (só o relatório anterior, `docs/test-reports/2026-11-20-my-tickets-sent-and-attended.md`, ainda não rastreado)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 10 de 10 passaram (NB3 com ressalva, ver Observações) · 0 falharam · 0 bloqueados · 99+ e NB8 sem acesso não executados (ver Não executados)

## Pré-requisitos

- Dev server: `/login` respondeu 200. MCP `postgres` respondeu `SELECT 1`; `playwright` e `next-devtools` disponíveis.
- Usuários (por papel e e-mail, senha não registrada): Suporte membro `mco_12@gmail.com` (id 4, `M`), Suporte admin `cazalbe@gmail.com`, P&D admin `martaselecao@gmail.com` (id 19, destino das recusas, faz o papel de `I`), Diretoria `lucas12surf@gmail.com`. Todos ativos. O setor "QA Infra" do contrato não existe nesta base; o destino foi P&D.
- Chave de e-mail não foi verificada (o `.env` não foi lido por instrução). Nenhum cenário depende de e-mail.
- O navegador já abriu logado como `mco_12@gmail.com` (sessão anterior). Troca de papel por logout e login pela tela.

## Chamados `[QA]` usados (nenhum criado; reaproveitados da rodada anterior)

| Chamado                                  | Estado inicial                                                       | Ações do teste                                                                                                                                                         | Estado final                                                                                                                                     |
| ---------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| #28 `[QA] Enviados recusa`               | `aguardando_aprovacao`, último envio `pendente` de M (id 4) para P&D | Marta recusou com `[QA] recusa para validar selo`; M atendeu                                                                                                           | `em_andamento`, atribuído a M; histórico `aguardando_aprovacao → recusado → em_andamento` (ids 142, 144)                                         |
| #34 `[QA] Acesso remetente` (Suporte)    | `em_andamento`, atribuído a M                                        | M enviou a P&D (`[QA] Envio para validar selo de recusados`); Marta recusou com `[QA] recusa 2 para validar selo`; M reenviou a P&D (`[QA] reenvio para validar selo`) | `aguardando_aprovacao`, último envio `pendente` de M para P&D; histórico `em_andamento → aguardando_aprovacao → recusado → aguardando_aprovacao` |
| #33 `[QA] Acesso remetente` (Financeiro) | `aguardando_aprovacao`, pendente de M                                | Só leitura (apareceu na aba Enviados)                                                                                                                                  | inalterado                                                                                                                                       |

Estado inicial de `REC` para todos os usuários, antes de qualquer ação: nenhuma linha (zero para todos).

## SQL de conferência

`REC(u)` do contrato, agrupado:

```sql
select lt.requested_by u, count(*) from ticket t
join (select distinct on (ticket_id) ticket_id, requested_by, status
      from ticket_transfer order by ticket_id, created_at desc, id desc) lt on lt.ticket_id = t.id
where lt.status = 'rejeitado' and t.status = 'recusado' group by 1
```

| Momento                          | Resultado                               | Selo na tela                 |
| -------------------------------- | --------------------------------------- | ---------------------------- |
| Início                           | nenhuma linha                           | sem selo (M)                 |
| Depois de #34 enviado (pendente) | não consultado; selo de M sem alteração | sem selo                     |
| Depois das duas recusas de Marta | `u=4 → 2`                               | `Meus chamados, 2 recusados` |
| Depois de M atender #28          | `u=4 → 1`                               | `Meus chamados, 1 recusado`  |
| Depois de M reenviar #34         | `REC(4) = 0`                            | sem selo                     |

## Cenários

| #    | Cenário                                                         | Papel        | Status            |
| ---- | --------------------------------------------------------------- | ------------ | ----------------- |
| NB1  | Selo no menu lateral = `REC(M)`, vermelho, nome acessível       | M            | PASSOU            |
| NB2  | Aba Enviados e recusados + filtro "Recusado" = selo             | M            | PASSOU            |
| NB3  | Período `Hoje`/`Semana` não muda o selo                         | M            | PASSOU (ressalva) |
| NB4  | 390×844, menu mobile: selo vermelho; Fila e Aprovações amarelos | M            | PASSOU            |
| NB5  | Envio pendente não conta                                        | M            | PASSOU            |
| NB6  | Recusa de P&D sobe o selo (1 → plural, recarga)                 | P&D admin, M | PASSOU            |
| NB7  | "Atender" derruba o selo sem recarregar                         | M            | PASSOU            |
| NB8  | Reenvio derruba o selo sem recarregar (some em zero)            | P&D admin, M | PASSOU            |
| NB9  | Quem recusa não ganha selo                                      | P&D admin    | PASSOU            |
| NB10 | Fila e Aprovações iguais a antes; sem erro/hidratação real      | todos        | PASSOU            |

Detalhe e evidência:

- **NB1.** Com `REC=0` (início): link `Meus chamados` sem selo e sem `aria-label`. Com `REC=2`: `aria-label="Meus chamados, 2 recusados"`, texto `Meus chamados 2`, selo `span.ml-auto` com `aria-hidden="true"`, classes `border-danger-border bg-danger text-danger-foreground`. Cores computadas, tema claro: fundo `rgb(252,238,238)`, texto `rgb(154,46,46)`, borda `rgb(240,202,202)`. Fila `rgb(253,245,232)` (amarelo, inalterado). Screenshot: `.qa-output/nb-light-desktop-nav.png`.
- **Contraste na linha ativa** (linha `Meus chamados` com `aria-current=page`, fundo `rgb(230,235,241)`): claro 6.63:1; escuro (`rgb(227,169,169)` sobre `rgb(28,18,20)`) 9.17:1. Os dois batem com a "Nota de contraste" do contrato. Tema escuro por `emulateMedia` (classe `dark` aplicada); Fila escura `rgb(26,23,16)`. Screenshot: `.qa-output/nb-dark-desktop-nav.png`.
- **NB2.** `/tickets?tab=sent&periodo=todos` mostrou 3 linhas (#34 Recusado, #33 Aguardando aprovação, #28 Recusado). Com o filtro de Status "Recusado" ficaram 2 (#34 e #28) = selo 2 = `REC(M)`.
- **NB3.** Com `periodo=hoje` e `periodo=semana` o selo permaneceu `Meus chamados, 2 recusados`.
- **NB4.** No painel do menu mobile: `Meus chamados, 2 recusados` com fundo `rgb(252,238,238)`; `Fila do setor, 1 em aberto` e `Aprovações, 1 aguardando` com `rgb(253,245,232)`. Sem rolagem horizontal (`scrollWidth ≤ clientWidth`). Screenshot: `.qa-output/nb-light-mobile-menu.png`.
- **NB5.** Antes de qualquer recusa, M tinha #28 e #33 pendentes e, depois de enviar #34, mais um pendente. Em nenhum momento surgiu selo. Os três estavam na aba Enviados e recusados.
- **NB6.** Após Marta recusar #28 e #34 (`ticket.status = recusado`, último envio `rejeitado` com `review_note` preenchida), M ao entrar viu `Meus chamados, 2 recusados`; banco `REC(4) = 2`. A transição de 1 recusado a partir de 0 foi coberta por NB7 (2 → 1, singular); o 0 → 1 literal não foi isolado porque as duas recusas aconteceram antes da recarga de M.
- **NB7.** Em #28, "Atender": selo passou de `Meus chamados, 2 recusados` para `Meus chamados, 1 recusado` sem recarga da página; banco: #28 `em_andamento`, último histórico `recusado → em_andamento`, `REC(4)=1`.
- **NB8.** Em #34 (recusado), "Enviar para outro setor" → P&D: sem recarregar, `Meus chamados` ficou sem selo e sem `aria-label`; banco: #34 `aguardando_aprovacao`, último envio `pendente`, `REC(4)=0`. M manteve acesso ao chamado (setor de origem), então o caso "sem acesso, via refresh" não foi exercitado.
- **NB9.** Marta (P&D) recusou dois chamados; no menu dela `Meus chamados` ficou sem selo e sem `aria-label`, enquanto `Aprovações, 1 aguardando` seguiu amarelo. Banco: `REC(19)` ausente (zero). Checado logo após as recusas; depois do reenvio de #34 o banco continua sem linha para 19.
- **NB10.** Fila e Aprovações mantiveram amarelo e `aria-label` próprio (`Fila do setor, 1 em aberto`, `Aprovações, 1 aguardando`; para Marta `Aprovações, 3 aguardando` antes das recusas e `1 aguardando` depois). `get_errors` do dev server devolveu `configErrors: []` e `sessionErrors: []` em todas as leituras (inclusive após cada transição), exceto o item abaixo.

## Falhas

Nenhuma.

## Erros fora dos cenários

- **Erro de hidratação no console** (`style={{caret-color:"transparent"}}` no input de busca do topo, `Popper > Search > Input`). É o falso positivo já conhecido, causado pelo screenshot do Playwright (injeta `caret-color`), não pelo código. `get_errors` já tinha sido lido antes dos screenshots e estava limpo; o log do dev server registra a mensagem no instante do primeiro screenshot. Sem relação com a feature.
- **404 em `/tickets/33`** no console do navegador: o `Link` da linha do chamado #33 (Financeiro, sem acesso para M) é pré-carregado e responde 404. Comportamento da rodada anterior (acesso do remetente), não ligado ao selo.
- **`⨯ Error: The destination stream closed early.`** no log do dev server, várias vezes, junto a trocas de página/logout durante o teste (navegação interrompendo respostas em streaming). Ruído de dev; não aparece em `get_errors`.
- **`WARN [Better Auth]: User not found`** e aviso de SSL do `pg` na subida do servidor: anteriores ao teste, sem ligação com a feature.

## Não executados

- **`99+` (teto do texto):** NÃO EXECUTADO. Exigiria 100 chamados recusados do mesmo remetente; o contrato já marca como limite conhecido (regra em `formatNavBadgeCount`).
- **NB8 sem acesso ao chamado (atualização por `router.refresh()`):** NÃO EXECUTADO. M mantém acesso ao chamado reenviado (origem do ticket é o setor de M).
- **Contas Suporte admin (`cazalbe@gmail.com`), segundo membro (`rodilindo@gmail.com`) e Diretoria:** não precisaram de login; sem cenário no contrato que os exija.

## Observações

1. **NB3:** todos os chamados do teste foram criados hoje, então a aba "Enviados e recusados" retornou as mesmas 3 linhas em `Hoje` e em `Todos`. O contrato diz "a aba muda"; com estes dados só foi possível provar a metade essencial (o selo não muda). Para provar as duas metades seria preciso um chamado enviado em data anterior à semana (dado fora do escopo de escrita).
2. **Contrato menciona "QA Infra" e usuários `qa.*`:** esta base usa Suporte (M) e P&D (destino). A equivalência foi mantida (destino recusa, remetente é do setor de origem).
3. **NB6 e o "0 → 1":** o contrato pede que o selo apareça com `1` e nome `Meus chamados, 1 recusado` se antes era 0. Na prática o teste foi 0 → 2 (duas recusas antes da recarga) e o singular só foi exercitado ao descer (2 → 1). O texto singular está comprovado; o caminho de subida é o mesmo código.
4. Contraste calculado a partir dos valores computados pelo navegador (fórmula WCAG de luminância relativa), com a linha `Meus chamados` ativa em ambos os temas.
