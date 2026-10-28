# Relatório de testes — Início: modo Individual, Etapa 3 (Maiores atrasos)

- **Data:** 2026-10-28
- **Contrato:** `docs/contracts/dashboard-individual-mode.md`, seção "Etapa 3 — Maiores atrasos"
- **Commit:** `aacf2ed` · alterações não comitadas: sim
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 14 de 15 passaram · 0 falharam · 1 parcial (MA14) · Diretoria não executada

## Pré-requisitos

- Dev server: `/login` respondeu 200. MCP `playwright`, `next-devtools` e `postgres` disponíveis.
- Contas (banco, leitura): `cazalbe@gmail.com` (id 19, admin, Suporte, ativo) e `rodalv@gmail.com` (id 18, member, Suporte, ativo). Setor Suporte = id 14.
- A sessão do navegador já abria logada como o Membro; ela foi usada para os cenários do Membro. O Administrador entrou uma vez pelo `/login`, sem recusa.
- Diretor: login recusado pelo usuário; Diretoria **não executada**, sem tentativa. O `.env` não foi lido.
- Somente leitura: nenhum chamado criado, alterado ou apagado; nenhuma transferência aceita ou recusada.

## Conferência no banco (horas atuais 3/6/12/24)

`AT(14)` (Coletivo) e `IAT(14, 19)` (Administrador), `limit 5`, consulta do contrato:

| id  | título                        | prioridade | destinatário | vencimento (SP)  |
| --- | ----------------------------- | ---------- | ------------ | ---------------- |
| 125 | Novo funcionário.             | media      | 19           | 2026-10-09 04:25 |
| 161 | CFOP incorreto na NF          | media      | 19           | 2026-10-13 01:27 |
| 164 | Ajuda para cadastrar novo CST | media      | 19           | 2026-10-13 01:39 |

- Total de atrasados do setor: 3 (todos do Administrador). `IAT(14, 19)`: 3. `IAT(14, 18)` (Membro): 0 linhas.
- Tela: Coletivo (Admin e Membro) = 125, 161, 164, na mesma ordem, com `9 out, 04:25`, `13 out, 01:27`, `13 out, 01:39`. Individual do Admin = os mesmos 3. Individual do Membro = vazio. **Nenhuma divergência com o banco.**

## EXPLAIN ANALYZE de `listOverdueTickets` (informativo)

SQL equivalente à do Drizzle (mesmos filtros, `order by` e `limit 5`), setor 14, via MCP `postgres`.

Sem `assigned_to` (Coletivo):

```
Limit (cost=15.82..15.83 rows=5) (actual time=0.045..0.045 rows=3)
  -> Sort (quicksort, 25kB)  Sort Key: (created_at + CASE priority ...), created_at, id
     -> Seq Scan on ticket t (cost=0.00..15.74 rows=6) (actual rows=3)
        Filter: current_department_id = 14 AND status = ANY(...) AND (due < now())
        Rows Removed by Filter: 245
Planning Time: 0.128 ms · Execution Time: 0.076 ms
```

Com `assigned_to = 19` (Individual do Admin):

```
Limit (cost=11.87..11.88 rows=1) (actual time=0.046..0.047 rows=3)
  -> Sort (quicksort, 25kB)
     -> Bitmap Heap Scan on ticket t (cost=4.21..11.86 rows=1) (actual rows=3)
        Recheck Cond: assigned_to = 19
        Filter: current_department_id = 14 AND status = ANY(...) AND (due < now())
        Rows Removed by Filter: 4
        -> Bitmap Index Scan on ticket_assigned_to_idx (rows=12)
Planning Time: 0.111 ms · Execution Time: 0.074 ms
```

Tabela com ~248 linhas: o Seq Scan do Coletivo é esperado nesse volume; o Individual usa `ticket_assigned_to_idx`. Os dois ficam abaixo de 0,1 ms.

## Cenários

| #    | Cenário                                                          | Papel         | Status  |
| ---- | ---------------------------------------------------------------- | ------------- | ------- |
| MA1  | Coletivo = `AT(S)`, link `/queue?tab=all&periodo=todos`          | Administrador | PASSOU  |
| MA2  | Individual = `IAT(S, A)`, 3 linhas, total 3 = banco              | Administrador | PASSOU  |
| MA3  | Individual do Membro vs. Coletivo do Membro                      | Membro        | PASSOU  |
| MA4  | Estado vazio do Individual                                       | Membro        | PASSOU  |
| MA5  | "Ver na fila" no Individual                                      | Administrador | PASSOU  |
| MA6  | "Ver na fila" no Coletivo                                        | Administrador | PASSOU  |
| MA7  | Nº com origem `dashboard` e volta para o Início                  | Administrador | PASSOU  |
| MA8  | Alternar sem requisição                                          | Membro        | PASSOU  |
| MA9  | F5 volta a Coletivo                                              | Administrador | PASSOU  |
| MA10 | Trocar período em Individual                                     | Administrador | PASSOU  |
| MA11 | Acessibilidade: um título, um link, uma tabela, sem id duplicado | Administrador | PASSOU  |
| MA12 | 390×844 nos dois modos                                           | Administrador | PASSOU  |
| MA13 | 1280 px nos dois modos                                           | Administrador | PASSOU  |
| MA14 | Esqueleto com rede lenta                                         | Administrador | PARCIAL |
| MA15 | Console e dev server sem erro                                    | todos         | PASSOU  |

Notas de evidência:

- **MA3/MA4:** Individual do Membro mostra "Nenhum chamado seu em atraso" + "Os chamados do setor destinados a você com vencimento já passado aparecem aqui.", sem tabela, link "Ver na fila" presente (`/tickets?tab=assigned&periodo=todos`). Coletivo do Membro = o do Administrador (3 linhas, mesmos links).
- **MA5:** `/tickets?tab=assigned&periodo=todos`, aba "Atribuídos a mim" com `aria-current=page`, contador 3; lista #164, #161, #125 (as 3 da tabela; aqui a aba não tem chamados a mais).
- **MA6:** `/queue?tab=all&periodo=todos`.
- **MA7:** links `/tickets/{id}?from=dashboard&periodo=<período>`. Clicado #161 em `periodo=semana`; o link de volta ("Início") aponta para `/dashboard?periodo=semana`, e a tela voltou em Coletivo (modo não persiste na navegação, coerente com MA9).
- **MA8:** 3 ciclos Coletivo↔Individual com listener de requisições: 0 requisições. Medido na conta Membro; no Administrador a troca também foi repetida, sem erro de console, sem listener de rede.
- **MA9:** Individual marcado, F5, voltou a Coletivo com link da Fila; URL inalterada (`?periodo=semana`).
- **MA10:** `periodo=hoje` para `periodo=semana` em Individual: continua Individual, mesmas 3 linhas, links do Nº com `periodo=semana`, "Ver na fila" com `periodo=todos`.
- **MA11:** `getByRole`: 1 heading "Maiores atrasos", 1 region "Maiores atrasos" (`aria-labelledby=dashboard-overdue-title`), 1 link "Ver na fila", 1 tabela, nos dois modos. Links do modo oculto existem no DOM com `display:none` (4 por modo), fora do layout. Percorrendo 40 Tab em cada modo, só os links do modo ativo recebem foco. Nenhum `id` duplicado.
- **MA12:** viewport 390: `scrollWidth` 375 (largura útil, sem rolagem horizontal); título em 1 linha (99×18), "Ver na fila" 60×18, 1 linha, à direita do título; igual nos dois modos. Link de Transferências 117×18, 1 linha.
- **MA13:** viewport 1280: card em x=854, largura 387 (cerca de 2/5 da linha), altura 245, igual à do Principal ofensor (245); posição e medidas idênticas nos dois modos. Link de Transferências à direita, 1 linha, mesma posição nos dois modos. Não havia captura do "antes" para comparar pixel a pixel; a conferência foi pelo contrato (link à direita, sem quebra). Capturas em `.qa-output/ma-390.png` e `.qa-output/ma-1280.png`.
- **MA14 (parcial):** com latência 800 ms e 50 KB/s via CDP, recarreguei e amostrei a cada 500 ms: antes do card aparecer não houve estado intermediário capturado; quando apareceu já havia 1 título e 1 "Ver na fila". O render do servidor é rápido demais para flagrar o esqueleto. Sem erro de hidratação. O esqueleto em si não foi observado.
- **MA15:** `get_errors` do `next-devtools`: `configErrors` e `sessionErrors` vazios. Console do navegador: só um `TypeError: Failed to execute 'observe' on 'MutationObserver'` por carregamento, vindo de script anônimo (`<anonymous>:2:185`) injetado pelo ambiente de teste, não de código do app; está em `.qa-output/console-2026-10-28T05-30-44-139Z.log`. Nenhum aviso de hidratação. Nenhuma escrita no banco.

## Falhas

Nenhuma.

## Erros fora dos cenários

Nenhum do app. O `MutationObserver` descrito em MA15 é ruído do ambiente (aparece também em `/login`, antes de qualquer tela do dashboard).

## Não executados

- Diretoria (login do Diretor recusado pelo usuário, sem tentativa), conforme "Não executáveis nesta rodada" do contrato.
- Conferência de `em_atraso` do card Backlog no Individual contra a tabela: não feita na tela. No banco, `IAT(14, 19)` = 3 e `IAT(14, 18)` = 0, que são os valores esperados para esse card.

## Observações

- O link de volta do chamado se chama "Início" (não "voltar"), com o período da origem.
- Neste momento todos os atrasados do setor pertencem ao Administrador; por isso Coletivo e Individual dele são idênticos. Os cenários MA2/MA3 distinguem os modos apenas pelo Membro (vazio). Não foi possível testar um Individual com destinatários mistos sem criar dado.
- Resultado "idêntico ao de antes" do Coletivo foi conferido contra o banco e o contrato, não contra uma captura anterior.
