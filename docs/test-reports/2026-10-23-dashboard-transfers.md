# Relatório de testes — Início: Transferências entre setores (Etapa 3a)

- **Data:** 2026-10-23
- **Contrato:** `docs/contracts/dashboard-overview.md` (seção "Etapa 3a", cenários TR1–TR16). Contexto: `docs/contracts/approvals.md`, ADR 016
- **Commit:** `33cf321` · alterações não comitadas: sim (Etapa 3a inteira está no working tree)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 13 de 16 passaram · 0 falharam · 0 bloqueados · 3 não executados (TR11, TR12, TR13). Mais 1 checagem de regressão (R1), que passou.

## Pré-requisitos

- Dev server: `/login` respondeu 200.
- MCP `playwright`, `next-devtools` e `postgres` disponíveis; `SELECT 1` ok.
- Usuários conferidos no banco (ativos): Diretor `heoliveirac@gmail.com` (admin, Diretoria 11), Administrador `cazalbe@gmail.com` (admin, Suporte 14), Membro `rodalv@gmail.com` (member, Suporte 14).
- `RESEND_API_KEY` está **preenchida** no `.env`. Nenhum cenário executado dispara e-mail; TR13 (que dispararia) não foi executado, ver abaixo.
- A sessão do navegador já estava aberta como A (cazalbe). M entrou pelo `/login` e funcionou. **D foi rejeitado no `/login`** (ver "Não executados").

## Dados de referência (leitura, `postgres`)

`TS`/`TL` calculadas no instante do teste (hoje = 2026-10-23; fuso America/Sao_Paulo).

Suporte (14):

```sql
select (select count(*) from ticket_transfer where to_department_id=14 and status='pendente') aguardando,
 (select count(*) from ticket_transfer where from_department_id=14 and status='pendente') enviados,
 (select count(*) from ticket_transfer where from_department_id=14 and status='rejeitado'
   and reviewed_at>='2026-10-23 03:00+00' and reviewed_at<'2026-10-24 03:00+00') hoje, ...
```

| período                    | aguardando | enviados | recusados |
| -------------------------- | ---------- | -------- | --------- |
| Hoje                       | 1          | 0        | 0         |
| Mês (out)                  | 1          | 0        | 3         |
| 2026-01-01 a hoje          | 1          | 0        | 3         |
| 2026-10-10 a 2026-10-12    | 1          | 0        | 2         |
| 2026-10-21 a hoje (3 dias) | 1          | 0        | 0         |

`reviewed_at` das recusadas de Suporte (SP): 09/10 04:38, 12/10 15:19, 12/10 16:58.

`TL(14)`: 1 linha: `#250`, origem `Diretoria`, título "Instalar impressora de conexão bluetooth", enviado 15/10/2026 20:16, `minutos = 11490` (7d 23h 30min, esperado `há 7d 23h`; destaque esperado, `m ≥ 240`).

Diretoria (11): `aguardando = 0`, `enviados = 3`, `recusados (mês) = 0`.

## Cenários

| #    | Cenário                                                              | Papel   | Status                     |
| ---- | -------------------------------------------------------------------- | ------- | -------------------------- |
| TR1  | Posição do card (1280 px), coluna esquerda vazia, linhas 1 e 2       | A       | PASSOU                     |
| TR2  | 3 mini-cards na ordem certa, valores = `TS`, "Aguardando" = selo     | A       | PASSOU                     |
| TR3  | Só "Recusados" muda por período; sem esqueleto na troca              | A       | PASSOU                     |
| TR4  | Marca "no período" só em Recusados; números na mesma base            | A       | PASSOU                     |
| TR5  | Tons dos mini-cards                                                  | A       | PASSOU (ver Observações 1) |
| TR6  | Lista = `TL`, formato do item, `title`s                              | A       | PASSOU (ver Observações 2) |
| TR7  | Destaque do item parado há 4h ou mais                                | A       | PASSOU (ver Observações 2) |
| TR8  | Clique no item abre o detalhe com origem `approvals`; Voltar         | A       | PASSOU                     |
| TR9  | "Ver em Aprovações" leva a `/approvals?periodo=todos`                | A       | PASSOU                     |
| TR10 | Mesmos números e lista para o membro                                 | M       | PASSOU                     |
| TR11 | Card da Diretoria = `TS(11)`/`TL(11)`                                | D       | NÃO EXECUTADO              |
| TR12 | Vazio com `aguardando = 0`                                           | D       | NÃO EXECUTADO              |
| TR13 | Preparação: M envia `[QA]` à Diretoria, D recusa                     | M, A, D | NÃO EXECUTADO              |
| TR14 | 1024 px                                                              | A       | PASSOU                     |
| TR15 | 390×844                                                              | A       | PASSOU                     |
| TR16 | Console e dev server sem erro/aviso de hidratação                    | A, M    | PASSOU (D não executado)   |
| R1   | Regressão: cabeçalho de "Maiores atrasos" com `DashboardPanelHeader` | A       | PASSOU                     |

### Evidência dos que passaram

- **TR1** (1280, `xl`): card "Transferências entre setores" em x=863, largura 393, igual a "Maiores atrasos" (x=863, largura 393), logo abaixo dela (y=653). À esquerda, abaixo de "Principal ofensor", nada. Linhas 1 e 2 conforme as etapas anteriores. Screenshot: `.qa-output/tr1-a-1280.png`.
- **TR2**: dts na ordem "Aguardando nosso aceite", "Enviados, pendentes", "Recusados por outros"; Hoje: 1 / 0 / 0 = `TS(14, hoje)`. O selo de Aprovações no menu mostra `1` ("Aprovações, 1 aguardando"), igual ao "Aguardando".
- **TR3**: Mês 1/0/**3**; Semana 1/0/0; Personalizado 10–12/10 → 1/0/**2**; 01/01–hoje → 1/0/**3**; 21–23/10 (3 dias com hoje) → 1/0/0; só 09/10 → recusados 1; só 12/10 → 2. Todos = `TS`. "Aguardando", "Enviados" e a lista inalterados em todos os períodos. Um `MutationObserver` em Hoje → Mês → Semana → Hoje não viu o esqueleto (`aria-label="Carregando transferências entre setores"`) nenhuma vez.
- **TR4**: "no período" (`dd` `text-xs text-muted-foreground`) só dentro do mini-card de Recusados; os três números com a mesma base (bottom = 796 px em 1280; 1500 em 390; 1113 em 1024).
- **TR5**: Hoje: "Aguardando" (1) com `bg-warning border-warning-border` e número `text-warning-foreground`; "Enviados" (0) neutro (`bg-surface-muted`, `text-foreground`); "Recusados" (0) neutro. Mês: "Recusados" (3) com número `text-warning-foreground` e fundo neutro (tom `alert`).
- **TR6**: item `#250` (mono, `text-muted-foreground`) + `de Diretoria`, à direita `há 7d 23h` (= 11490 min). `title` do link = "Instalar impressora de conexão bluetooth"; `title` do "há X" = `15/10/2026 20:16` (= `enviado_sp`).
- **TR7**: item com 11490 min (≥ 240) com `font-semibold text-warning-foreground` e `<span class="sr-only">, Aguardando aceite há 4h ou mais</span>`.
- **TR8**: o item é `<a href="/tickets/250?from=approvals&periodo=todos">`; abre "Chamado #250 · Instalar impressora de conexão bluetooth" com Atender/Recusar. O link de retorno do detalhe (rótulo "Aprovações", não "Voltar") leva a `/approvals?periodo=todos`.
- **TR9**: link `href="/approvals?periodo=todos"`; ao clicar, o #250 "Instalar impressora de conexão bluetooth" aparece em Aprovações.
- **TR10**: M (Suporte · Membro): 1 / 0 / 0 em Hoje, mesma lista (`#250 de Diretoria há 7d 23h`, destacado), selo `1`.
- **TR14** (1024): card em largura total (x=256, 729 de largura, igual à linha 2 acima: 729), 3 mini-cards lado a lado (x=286, 520, 755), `scrollWidth = clientWidth = 1009`. Screenshot: `.qa-output/tr-resp-1024.png`.
- **TR15** (390): 3 mini-cards lado a lado (x=50, 153, 256), rótulos em 2 linhas sem reticências, números inteiros, bases alinhadas (1500); item com `#250 de Diretoria` e `há 7d 23h` inteiros; `scrollWidth = clientWidth = 375`, sem rolagem horizontal. Screenshot: `.qa-output/tr-resp-390.png`.
- **TR16**: `get_errors` do `next-devtools` devolveu `configErrors: []` e `sessionErrors: []` ao fim de cada bloco (A, M). Console do navegador desta sessão sem erro nem aviso de hidratação (ver "Erros fora dos cenários" para um erro antigo).
- **R1**: o cabeçalho de "Maiores atrasos" continua `h2.text-caption.font-semibold.text-muted-foreground` (13 px, mesma cor do título de Transferências) e o link "Ver na fila" com as mesmas classes de antes (`shrink-0 rounded-sm text-caption font-semibold text-primary ...`), alinhado à direita (right = 1224 nos dois cabeçalhos), `href="/queue?tab=all&periodo=todos"`. O diff de `dashboard-overdue-header.tsx` só troca o marcado inline por `DashboardPanelHeader` com as mesmas classes.

## Falhas

Nenhuma.

## Erros fora dos cenários

- O console do navegador (histórico da sessão do MCP) guarda um `ReferenceError: DashboardTransfersSkeleton is not defined at DashboardPage`, no log `.qa-output/console-2026-10-23T22-27-37-334Z.log`. É de **antes** do teste (22:27 UTC; o primeiro cenário foi às 22:47 UTC) e de **antes** da última edição de `app/(app)/dashboard/page.tsx` (19:43 local), que hoje importa o esqueleto na linha 21. Não reapareceu em nenhum carregamento durante a bateria; `get_errors` está limpo. Registrado só por transparência (provável estado intermediário de edição).

## Não executados

- **TR11 e TR12 (D):** o `/login` rejeitou as credenciais do Diretor (`heoliveirac@gmail.com`) com "E-mail ou senha inválidos." em três tentativas idênticas (o e-mail existe e está ativo no banco, então a causa provável é a senha informada). Não tentei variações. O Diretoria é o único setor acessível com `aguardando = 0`, então TR12 também depende dele. Valores esperados para quando D puder logar: `TS(11)` = aguardando 0, enviados 3, recusados (Mês) 0; `TL(11)` vazia, ou seja, tela de vazio "Nenhum chamado aguardando aceite" + descrição, "Aguardando" neutro, link "Ver em Aprovações" presente.
- **TR13:** a preparação só vale se TR2/TR3 não mostrassem valor ≠ 0 em Enviados ou Recusados. "Recusados" mostrou 3 em Mês (e 2/1 em intervalos), então a condição não se aplica. Além disso `RESEND_API_KEY` está preenchida, e a transferência dispara e-mail. Nenhum chamado `[QA]` foi criado; nenhum dado foi alterado.

## Observações

1. **Cobertura parcial de TR5/TR6/TR7 (limite dos dados, não do código):** Suporte só tem 1 transferência pendente de entrada, e ela está parada há 7d 23h. Logo não foi possível ver na tela (a) o "Aguardando" neutro com `0` (só D), (b) a ordem "mais antigo em cima" com vários itens, (c) um item recente sem destaque e o formato `agora`/`há {m}min`, (d) o limite de 5 itens. Esses pontos dependem dos testes unitários de domínio ou de TR13 com e-mail desligado.
2. Teste de "Semana": o cenário não define o intervalo exato de "Semana"; o resultado 0 é coerente com as recusas (09 e 12/10) estarem fora dos últimos dias, mas a borda não foi verificada contra uma data de recusa.
3. Os períodos personalizados foram abertos por URL (`?periodo=personalizado&de=…&ate=…`), não pelo seletor de calendário; o contrato não pede o seletor aqui.
4. Contrato, TR8: fala em "Voltar" no detalhe; o controle real é o link de retorno rotulado "Aprovações" (para `/approvals?periodo=todos`). O destino bate; só o rótulo difere da palavra usada no cenário. Ambiguidade para o `df-architect` (texto do cenário, não do código).
5. As credenciais do Diretor informadas pelo usuário parecem não corresponder à conta (ver "Não executados").
