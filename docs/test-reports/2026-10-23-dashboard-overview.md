# Relatório de testes — Início: visão geral do setor (Etapa 1)

- **Data:** 2026-10-23
- **Contrato:** `docs/contracts/dashboard-overview.md`
- **Commit:** `007beb4` · alterações não comitadas: sim (a Etapa 1 inteira)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 16 de 16 passaram · 0 falharam · 0 bloqueados · 0 não executados

## Pré-requisitos

- Dev server: `/login` devolveu 200.
- MCP `playwright`, `next-devtools` e `postgres` respondem. `SELECT 1` devolveu `1`.
- Usuários QA e Diretor existem e estão ativos (consulta a `users` + `department`): Diretoria `11`, QA Suporte `18`, QA Infra `19`.
- `RESEND_API_KEY` está preenchida no `.env`. Nenhum cenário desta feature envia e-mail (`ticket-assignment.ts` e `ticket-transfer.ts` não importam `app/_lib/email`), então nada foi marcado como NÃO EXECUTADO.

## Preparação (escrita pela interface)

| Passo                                                          | Quem | Resultado                                                                                                                                                                                                                                                |
| -------------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Antes: Hoje de A                                               | A    | `0` · `—` · `—` · backlog `103`, igual a `OV(18, hoje)` / `RT` (`0,0,null,103`; `rt 0`)                                                                                                                                                                  |
| `#V1` = #253 `[QA] Visão geral resolvido` criado e resolvido   | M    | status `resolvido`, `resolved_at` 7 s após `created_at`                                                                                                                                                                                                  |
| `#V2` = #254 `[QA] Visão geral recebido`, enviado a QA Suporte | I    | `ticket.status = aguardando_aprovacao`, `current_department_id = 18`; `ticket_transfer #55` `pendente` 19 → 18; histórico 684 `criacao`, 685 `transferencia_solicitada` (aberto → aguardando_aprovacao, 19 → 18)                                         |
| Aceite de #254 ("Atender")                                     | A    | `ticket.status = em_andamento`; `ticket_transfer` `aprovado`, `reviewed_at` preenchido, `review_note` nulo; histórico 686 `transferencia_aprovada` (aguardando_aprovacao → em_andamento, 19 → 18). Status do ticket bate com a última linha do histórico |

Nota de implementação: o `current_department_id` do ticket já passa a ser o destino no momento do envio (ainda pendente). Por isso o pendente entra no `ticketCount` do destino e sai do de QA Infra. Isso é o que o contrato espera em OV7 e OV12.

## Cenários

| #    | Cenário                                                    | Papel | Status |
| ---- | ---------------------------------------------------------- | ----- | ------ |
| OV1  | 4 cards em linha ≥ 1280 px, ordem, sem "Principal ofensor" | A     | PASSOU |
| OV2  | Hoje após a preparação bate com `OV`/`RT`                  | A     | PASSOU |
| OV3  | Semana                                                     | A     | PASSOU |
| OV4  | Mês                                                        | A     | PASSOU |
| OV5  | Personalizado de 3 dias que inclui hoje                    | A     | PASSOU |
| OV6  | Personalizado vazio (2026-01-01)                           | A     | PASSOU |
| OV7  | Hoje antes/depois da preparação                            | A     | PASSOU |
| OV8  | Backlog antes e depois do aceite de #254                   | A     | PASSOU |
| OV9  | Linhas de apoio e marca "Ilustrativo"                      | A     | PASSOU |
| OV10 | Barra de taxa e `role="progressbar"`                       | A     | PASSOU |
| OV11 | Troca de período, URL, `?periodo=lixo`                     | A     | PASSOU |
| OV12 | QA Infra vê os números de QA Infra                         | I     | PASSOU |
| OV13 | Diretoria vê os números da Diretoria                       | D     | PASSOU |
| OV14 | 390×844 empilhado, sem rolagem horizontal                  | A     | PASSOU |
| OV15 | 1024 e 1279 px em 2×2, mesma altura                        | A     | PASSOU |
| OV16 | Sem erro de console, runtime ou hidratação                 | todos | PASSOU |

## Evidência por cenário

Consulta usada (as bordas vêm do SQL do contrato; `dep` 11/18/19), uma linha por setor × período:

```sql
select d.dep, p.nome, chamados, resolvidos, media_min, backlog, rt  -- OV() e RT() do contrato
```

Resultados finais (após a preparação) e o que a tela mostrou:

| Setor / período             | `OV`/`RT` no banco                                           | Tela                                                                                                                                                                                                       |
| --------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 18 Hoje                     | chamados 2 · resolvidos 1 · media_min 0 · backlog 104 · rt 1 | `2` · `+1 recebido de outros setores` · `50%` · `< 1min` · `104` · `208h em backlog`                                                                                                                       |
| 18 Semana (19–25 out)       | 2 · 1 · 0 · 104 · rt 1                                       | idem Hoje                                                                                                                                                                                                  |
| 18 Mês                      | 137 · 32 · 92 · 104 · rt 2                                   | `137` · `+2 recebidos de outros setores` · `23%` · `1h 32min` · `104` · `208h`                                                                                                                             |
| 18 Personalizado 21–23/10   | 2 · 1 · 0 · 104 · rt 1                                       | idem Hoje; URL `?periodo=personalizado&de=2026-10-21&ate=2026-10-23`, montada pelo seletor da interface                                                                                                    |
| 18 Personalizado 01/01/2026 | 0 · 0 · null · 104 · rt 0                                    | `0` · `Nenhum recebido de outros setores` · Taxa `—` + `Nenhum chamado no período` (sem barra) · Tempo `—` + `Nenhum chamado resolvido no período` (sem marca) · Backlog `104` + `208h em backlog` + marca |
| 19 Hoje                     | 0 · 0 · null · 16 · rt 0                                     | `0` · `Nenhum recebido de outros setores` · `—` · `—` · `16` · `32h em backlog`                                                                                                                            |
| 19 Mês                      | 26 · 0 · null · 16 · rt 14                                   | `26` · `+14 recebidos de outros setores` · `0%` (barra 0) · `—` · `16` · `32h`                                                                                                                             |
| 11 Hoje                     | 0 · 0 · null · 22 · rt 0                                     | `0` · `—` · `—` · `22` · `44h em backlog`                                                                                                                                                                  |
| 11 Mês                      | 5 · 2 · 5572 · 22 · rt 3                                     | `5` · `+3 recebidos de outros setores` · `40%` · `3d 20h` · `22` · `44h`                                                                                                                                   |

Pontos específicos:

- **OV1**: 4 colunas (`271px ×4` em 1400 px, `241px ×4` em 1280 px), ordem Chamados · Taxa · Tempo · Backlog; `getByText('Principal ofensor')` → 0. Screenshot `.qa-output/ov1-A-hoje.png`.
- **OV7** (Hoje de A, antes → depois): chamados 0 → 2 (+1 de #253, +1 de #254 ainda pendente), taxa `—` → `50%`, tempo `—` → `< 1min`, backlog `103` → `103` (pendente não conta). Screenshot `.qa-output/ov7-A-hoje-depois.png`.
- **OV8**: backlog `103` com #254 `aguardando_aprovacao`; `104` depois do aceite (`em_andamento`).
- **OV9**: texto "Ilustrativo" visível nos cards 3 e 4 (2 ocorrências, `Badge outline`); tooltip no hover: "Valor de exemplo: o sistema ainda não mede este dado."; cards 1 e 2 e os valores grandes sem marca. Screenshot `.qa-output/ov9-tooltip.png`.
- **OV10**: `role="progressbar"`, `aria-valuenow=50` (Hoje) / `23` (Mês) / `0` (QA Infra), `aria-valuemin=0`, `aria-valuemax=100`, `aria-label="Taxa de resolução"`; largura do preenchimento `width:50%`, `23%`, `0%`.
- **OV11**: Hoje → Semana → Mês por clique nos links e Personalizado pelo seletor; valores mudaram conforme a tabela acima. `?periodo=lixo` mostrou os números de Hoje. O esqueleto de 4 cartões não foi visto: um observador de DOM não registrou `aria-label="Carregando indicadores"` nas trocas (a leitura é rápida em dev; o contrato diz "se perceptível").
- **OV14**: 390×844, grade `350px` (1 coluna), cards em y = 252, 380, 508, 636 (altura 116 cada), `scrollWidth = clientWidth = 390`, nenhum elemento com texto cortado; valor `1h 32min` inteiro. Screenshot `.qa-output/ov-resp-390.png`.
- **OV15**: 1024 px → `366px 366px`, 1279 px → `493.5px 493.5px`; linha 1 (Chamados, Taxa) e linha 2 (Tempo, Backlog); altura 116 px nos quatro; sem rolagem horizontal. Em 1280 px volta a 4 colunas.
- **OV16**: `get_errors` do `next-devtools` devolveu `configErrors: []` e `sessionErrors: []` ao fim das três sessões; console do navegador sem erro nem aviso de hidratação. Escrita limitada a #253 e #254 (QA Suporte e QA Infra); #65 a #68 intocados; nada escrito na Diretoria.

## Falhas

Nenhuma.

## Erros fora dos cenários

- Console do navegador: um `404` em `/tickets/new`, causado por mim ao tentar abrir o formulário por URL (o "Novo chamado" é um diálogo, não uma rota). Não é defeito da feature.

## Não executados

Nenhum.

## Observações

1. **Ajuste `readonly` em `app/_lib/domain/dashboard.ts`**: não foi aplicado durante a bateria que eu acompanhei; o `git status` ao fim mostra o mesmo conjunto de arquivos do início.
2. **`?periodo=lixo` mantém a URL** `?periodo=lixo` na barra e mostra Hoje, em vez de normalizar para `?periodo=hoje`. O contrato de OV11 diz só "cai em Hoje", então passou; o contrato anterior (`dashboard.md`) é quem define se normaliza a URL. Possível ambiguidade para o `df-architect`.
3. **OV4 pede os `[QA] Janela` no tempo médio de Mês com formato `d`**: o Mês de QA Suporte hoje dá `1h 32min` (média de 92 min), sem `d`. O formato com `d` foi exercitado e conferido na Diretoria (`3d 20h` = 5572 min). Cobertura OK, só a expectativa do texto de OV4 depende do dado do dia.
4. **Pendente no total do destino**: ticket `aguardando_aprovacao` já tem `current_department_id` = destino, então entra em "Chamados no período" do destino desde o envio e some do total da origem. Coerente com OV7 e OV12; registro porque não é óbvio para quem lê só "Chamados do setor".
5. O fim de semana dos relatórios: a Semana usa segunda a domingo (19–25 out 2026), igual a `date_trunc('week')` do contrato.
6. Dados criados e que ficam no banco: `#253 [QA] Visão geral resolvido` (QA Suporte, `resolvido`) e `#254 [QA] Visão geral recebido` (QA Suporte, `em_andamento`, aceito da QA Infra); `ticket_transfer #55`. Eles alteram o gabarito QA de Hoje para as próximas rodadas (Chamados 2, backlog 104 em QA Suporte).
