# Relatório de testes — Prazos por setor e vencimento gravado (Etapa A)

- **Data:** 2026-11-12
- **Contrato:** `docs/contracts/department-due-hours.md` (DH1–DH19); card Backlog conforme `docs/contracts/dashboard-overview.md` (revisão 2026-11-12)
- **Commit:** `0fa03e3` · alterações não comitadas: não
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 15 de 19 passaram · 0 falharam · 0 bloqueados · 3 não executados (DH14–DH16) · 1 parcial (DH18)
- **Papéis usados:** Diretor (`diretorqa@gmail.com`), Admin Suporte (`cazalbe@gmail.com`), Membro Suporte (`rodalv@gmail.com`). Cada conta logou uma vez, como combinado. `.env` não foi lido (a checagem de `RESEND_API_KEY` não foi feita; nenhum cenário depende de e-mail).
- **get_errors do dev server:** vazio (`configErrors` e `sessionErrors` sem entradas) após os cenários.

## Pré-requisitos

- Dev server: `/login` devolveu 200. Playwright e `postgres` (`SELECT 1`) respondem.
- Usuários conferidos no banco: Diretor (id 21, Diretoria, admin), Carlos Alberto Jr (id 19, Suporte, admin), Álvaro Rodrigo (id 18, Suporte, member), todos ativos.
- Estado inicial anotado: `department_due_hours` tinha só **Suporte = 3/6/12/24** (`updated_by` 19, 2026-11-12 06:43 UTC); **QA Suporte** sem linha.

## Cenários

| #    | Cenário                                                                                                                                    | Papel                      | Status                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- | --------------------------------------------------------- |
| DH1  | Submenu Cadastros: admin vê Pessoas, Tags, Prazos (ícone de relógio); Diretor vê os cinco                                                  | Admin, Diretor             | PASSOU                                                    |
| DH2  | Membro abre `/registry/due-hours` pela URL                                                                                                 | Membro                     | PASSOU                                                    |
| DH3  | Setor sem configuração: 3/6/12/24, selo "Padrão do sistema", descrição padrão; admin sem seletor e `?setor=18` ignorado                    | Diretor (Diretoria), Admin | PASSOU                                                    |
| DH4  | Salvar prazos: toast, "Última alteração por …", linha no banco                                                                             | Admin                      | PASSOU                                                    |
| DH5  | Validação (vazio, 0, 1.5, 1000), nada salvo                                                                                                | Admin                      | PASSOU (mensagem difere do contrato, ver Observações)     |
| DH6  | Diretor escolhe outro setor, `?setor=<id>`, salva; Não alocado e inativos fora do seletor; `?setor` inválido/não alocável/inativo ignorado | Diretor                    | PASSOU                                                    |
| DH7  | Action chamada pelo admin do Suporte com `departmentId` de QA Suporte                                                                      | Admin                      | PASSOU                                                    |
| DH8  | Abrir chamado Crítica em setor com 2h                                                                                                      | Admin                      | PASSOU                                                    |
| DH9  | Mudar prazos não altera chamado existente                                                                                                  | Admin, Diretor             | PASSOU                                                    |
| DH10 | Envio: `due_at` nulo, `from_due_at`, `from_assignee_id`, "Aguardando aceite"                                                               | Admin                      | PASSOU                                                    |
| DH11 | Aceite: `due_at = reviewed_at + horas(destino)`, frase com "Novo prazo"                                                                    | Diretor                    | PASSOU                                                    |
| DH12 | Recusa: `due_at = from_due_at + espera`                                                                                                    | Diretor                    | PASSOU                                                    |
| DH13 | Assumir, editar, resolver não mudam `due_at`                                                                                               | Admin                      | PASSOU                                                    |
| DH14 | Atraso anterior ao envio conta na Operação (time e pessoa)                                                                                 | —                          | NÃO EXECUTADO                                             |
| DH15 | Exemplo da seção (venc → envio → recusa → agora)                                                                                           | —                          | NÃO EXECUTADO                                             |
| DH16 | Aceito no destino, vencendo lá                                                                                                             | —                          | NÃO EXECUTADO                                             |
| DH17 | Início: card Backlog e "Maiores atrasos" por `due_at`                                                                                      | Diretor                    | PASSOU (parcial, ver abaixo)                              |
| DH18 | Resolvido no prazo / fora do prazo                                                                                                         | Admin, Diretor             | PARCIAL: "No prazo" PASSOU; "Fora do prazo" não executado |
| DH19 | Consultas de conferência pós-migration                                                                                                     | (SQL)                      | PASSOU                                                    |
| —    | Responsivo 390×844 em `/registry/due-hours`                                                                                                | Diretor                    | PASSOU                                                    |

## Evidência dos cenários que passaram

**DH1.** Admin: `Cadastros → Pessoas, Tags, Prazos`, com ícone de relógio em Prazos (`.qa-output/dh1-admin-menu.png`). Diretor: `Pessoas, Setores, Tags, Empresas, Prazos` (`.qa-output/dh1-director-menu.png`).

**DH2.** Membro em `/registry/due-hours`: 404, igual a `/registry/tags` para o mesmo membro. O menu do membro não tem Cadastros.

**DH3.** Diretor abre Prazos de Diretoria (sem linha): campos 3/6/12/24, selo "Padrão do sistema", texto "Este setor ainda usa o padrão do sistema: Crítica 3h, Alta 6h, Média 12h, Baixa 24h. Salve para definir prazos próprios." Admin do Suporte com `?setor=18`: mostra Suporte, sem seletor, sem selo (Suporte já tinha linha, então o caso "admin com setor sem linha" não pôde ser visto com admin; foi visto pelo Diretor).

**DH4.** Salvou 2/4/8/16. Toast "Prazos salvos." visível (capturado no segundo ciclo de 150 ms). Banco: `department_id 14, 2/4/8/16, updated_by 19`. Texto "Última alteração por Carlos Alberto Jr em 12/11/2026 às 21:09." (21:09 em São Paulo = 00:09 UTC).

**DH5.** Crítica vazio, Alta 0, Média 1.5, Baixa 1000. Mensagens exibidas: "Informe um prazo em horas inteiras para a prioridade Crítica/Alta/Média." e "O prazo máximo é de 999 horas.". Nada gravado (a linha seguiu 3/6/12/24). Screenshot `.qa-output/dh5-validation.png`.

**DH6.** Opções do seletor: Diretoria, Administrativo, Implantação, P&D, QA Infra, QA Suporte, Suporte (sem "Não alocado", "[QA] Setor inativo", "[QA] Bloqueio"). Escolher QA Suporte levou a `?setor=18`, com selo padrão. Salvou 2/4/8/16; banco: linha de QA Suporte, `updated_by` = diretorqa. `?setor=abc`, `0`, `16` (Não alocado), `20` (inativo): todos caem em Diretoria, sem erro.

**DH7.** Capturei o `Next-Action` do salvamento do admin e reenviei o mesmo corpo com `departmentId` 18. Resposta: `{"ok":false,"code":"FORBIDDEN","message":"Você não tem permissão para editar os prazos deste setor."}`. SQL depois: QA Suporte continuou sem linha (só apareceu quando o Diretor salvou, no DH6).

**DH8.** Chamado #296 (Crítica, Suporte com 2h), aberto 2026-11-13 00:09:39.166 UTC:

```sql
select due_at-created_at, h.to_due_at from ticket t join ticket_history h on h.ticket_id=t.id and h.event='criacao' where t.id=296
-- due_at = 02:09:39.166, diff = 2 h, criacao.to_due_at = 02:09:39.166
```

Fila: "Expira em 1h 59min" (`.qa-output/dh8-queue.png`). Detalhe: "Vence em 12/11/2026 - 23:09". Também conferido: Diretoria (sem linha) usa o padrão na abertura (#301 Baixa: +24h).

**DH9.** Depois do DH8, o admin salvou 5/10/15/20 e depois 1/1/1/1, e o Diretor restaurou 3/6/12/24. Em todas as leituras `#296.due_at` seguiu `02:09:39.166`, e `#297..#300` seguiram em +1h da criação. Também confirmado o DH13 sobre o `due_at` de `#299` após o aceite (abaixo).

**DH10.** `#299` (Alta, em andamento, atribuído ao Carlos, id 19) enviado para Diretoria:

```sql
ticket: status aguardando_aprovacao, assigned_to null, due_at null
ticket_transfer 64: pendente, from_due_at 01:10:33.674 (o due_at anterior), from_assignee_id 19, created_at 00:11:39.037
ticket_history: transferencia_solicitada, to_due_at null
```

Detalhe: SLA "Aguardando aceite" (`.qa-output/dh10-detail.png`). Meus chamados, aba "Aguardando aprovação": linhas de #299 e #300 com SLA "Aguardando aceite". Linhas antigas pendentes (#274, #275) também "Aguardando aceite".

**DH11.** Diretor (Diretoria, sem linha, então Alta = padrão 6h; o contrato usa 4h como exemplo) clicou "Atender" em `#299`:

```sql
ticket: em_andamento, current_department_id 11, assigned_to 21, due_at 2026-11-13 06:13:18.101
ticket_transfer 64: aprovado, reviewed_at 00:13:18.101   -- due_at = reviewed_at + 6h
ticket_history: transferencia_aprovada, to_due_at 06:13:18.101, 14 -> 11, aguardando_aprovacao -> em_andamento
```

Linha do tempo: "QA Diretor do setor Diretoria aceitou o chamado e começou a atendê-lo. Novo prazo: 13/11/2026 às 03:13." (`.qa-output/dh11-timeline.png`). Detalhe: "Vence em 13/11/2026 - 03:13".

**DH12.** `#300` (Média) enviado às 00:11:47.781 e recusado às 00:13:33.242 (espera 1min45s):

```sql
ticket: status recusado, current_department_id 14, due_at 01:12:23.302
ticket_transfer 65: rejeitado, review_note "Recusado no teste DH12.", from_due_at 01:10:37.841, from_assignee_id 19
from_due_at + (reviewed_at - created_at) = 01:12:23.302   -- igual ao due_at gravado
ticket_history: transferencia_rejeitada, to_due_at 01:12:23.302, 11 -> 14
```

**DH13.** `#296`: assumir, editar título, resolver; `#297..#300`: assumir. `due_at` idêntico antes e depois; as linhas de `ticket_history` desses atos têm `to_due_at` nulo. Obs.: o botão "Iniciar" não aparece depois de assumir; "Assumir" já leva o chamado a "Em andamento" (`mudanca_status` aberto → em_andamento na mesma hora).

**DH17 (Diretoria, Diretor).** Card Backlog: "20 chamados" e dica "19 vencidos · 27.517h em backlog". SQL independente (`current_department_id = 11`, status `aberto, em_analise, encaminhado, recusado, em_andamento`): 20 chamados, 19 com `due_at < now()`, 27.517h de idade. "Maiores atrasos": `#29, #30, #31, #32, #33` por `due_at` crescente, igual ao `order by due_at, created_at, id` do SQL. Nenhum pendente na lista (`due_at` nulo não entra).
Operação do Suporte (Diretor com `?setor=14`): "Backlog 4 chamados". Banco: Suporte tinha 4 chamados abertos/ativos, entre eles `#301`, que estava `aguardando_aprovacao` vindo da Diretoria (pendente no destino conta). O card do Início para o Suporte não foi visto (ver Não executados); a Operação e o card usam a mesma constante `BACKLOG_TICKET_STATUSES`.
Horas em atraso do time Suporte na Operação: "2.664h 27min". SQL independente com a fórmula "parte regular" do contrato: 2664,46h; "parte dos envios": 0,00h (ainda não há envio de chamado vencido). Bate (diferença de segundos entre as leituras).

**DH18 (parcial).** `#296` e `#299` resolvidos antes do prazo gravado: SLA "No prazo" no detalhe. "Fora do prazo" não exercido (ver abaixo).

**DH19.** Todas as consultas do contrato devolveram 0 antes de qualquer teste: chamados com `due_at` nulo fora de `aguardando_aprovacao` = 0; `due_at` preenchido em `aguardando_aprovacao` = 0; transferências pendentes sem `from_due_at` = 0. `criacao.to_due_at` está preenchido nos chamados novos (#295 e posteriores) e nulo nos antigos (esperado: o backfill não toca `ticket_history`).

**Responsivo.** `/registry/due-hours?setor=14` em 390×844: `scrollWidth = clientWidth = 390` (sem rolagem horizontal), botão "Salvar prazos" alcançável por rolagem vertical (`.qa-output/resp-due-hours-390.png`).

## Falhas

Nenhuma.

## Erros fora dos cenários

- Consoles: só o erro 404 esperado nas navegações do membro a `/registry/*`.
- `get_errors` do `next-devtools`: vazio.
- O chamado real `#295 "Teste backlog"` (Suporte, em andamento) deixou de aparecer entre os abertos do Suporte durante a rodada. Não foi mexido por este teste; presumo ação do usuário.

## Não executados

- **DH14, DH15, DH16 (atraso anterior ao envio, recusa com relógio retomado, aceite com atraso).** Exigem um chamado **já vencido** que o Admin do Suporte envie depois do vencimento (e, no DH15, o Diretor recuse depois). O prazo mínimo é de 1h, então o chamado só vence uma hora após a abertura, e fazer o envio exige a conta do Admin do Suporte, que já tinha usado a única tentativa de login da rodada (eu havia saído para testar o Membro e o Diretor). O que ficou pronto para a próxima rodada:
  - `#297 "[QA] DH15 recusa atrasado"` (Crítica, Suporte, atribuído ao Carlos, `due_at` 2026-11-13 01:10:25Z): enviar para Diretoria **depois das 01:10Z (22:10 local)**, recusar pelo Diretor alguns minutos depois e comparar a Operação do Suporte (time e pessoa Carlos) com a fórmula da seção "Horas em atraso".
  - `#298 "[QA] DH16 aceite atrasado"` (Crítica, mesma situação, `due_at` 01:10:29Z): enviar depois das 01:10Z, aceitar pelo Diretor; o Suporte deve contar o trecho 01:10Z → envio, o Diretoria só a partir do `due_at` novo.
  - A fórmula da parte regular já foi conferida contra a tela (DH17); a "parte dos envios" ainda está em 0h, então não foi exercida.
- **DH18, "Fora do prazo".** Exige resolver um chamado depois do `due_at`. O Diretoria só aceitou chamados com prazo de 6h/24h e o ajuste de horas do Diretoria não estava autorizado. Pode ser feito com `#297`/`#298` na próxima rodada (resolver depois das 01:10Z).
- **Card Backlog do Início visto pelo Admin do Suporte** (inclusão de pendente no destino) e **DH3 com Admin de setor sem configuração**: faltou sessão do Admin (mesma razão). A contagem por SQL e pela Operação (mesma constante) bate; o card do Início do Suporte não foi inspecionado.
- **E-mail:** não aplicável à feature; `.env` não lido por regra da rodada.

## Observações

1. **Mensagens divergem do contrato (DH5).** Contrato: `Informe o prazo da prioridade Crítica, em horas inteiras, de 1 a 999.` Tela e `app/_lib/validation/department-due-hours.ts:14`: `Informe um prazo em horas inteiras para a prioridade Crítica.` Dono provável do alinhamento: `df-architect` (contrato ou schema).
2. **Descrição dos campos diverge do contrato.** Contrato (`DUE_HOURS_FIELD_COPY.description`): `Horas corridas, a partir da abertura ou do aceite, para resolver um chamado de prioridade Crítica.` Tela e `app/_lib/domain/department-due-hours.ts:154`: `Prazo de horas corridas para chamados de prioridade Crítica.` Mesmo dono.
3. **Contrato DH11 fala em "destino com Alta 4h".** O teste usou a Diretoria sem linha (padrão Alta 6h) porque só Suporte e QA Suporte estavam autorizados a ter as horas alteradas. O resultado (`reviewed_at + 6h`) está correto para a configuração real.
4. **Recusa mantém `assigned_to`.** O chamado recusado (#300) voltou ao Suporte com o responsável anterior (id 19). Não é objeto deste contrato; registro como comportamento observado.
5. **Toast de sucesso.** Existe, mas some rápido; um capture com 250 ms depois do clique não o viu, um com 150 ms em ciclo viu. Sem falha.
6. **Atribuição "iniciar".** DH13 lista "iniciar", mas a UI não tem esse botão separado depois de "Assumir" (o chamado já vai para Em andamento). Não é falha; só registrar que "iniciar" não foi exercido como ato distinto.

## Estado final dos dados

- **Horas restauradas:** **Suporte** = 3/6/12/24 (valores originais; `updated_by` agora é o Carlos/diretorqa, `updated_at` mudou). **QA Suporte** não tinha linha; como não há exclusão pela interface, ficou uma linha com 3/6/12/24 (igual ao padrão do sistema), mas ela passa a mostrar "Última alteração por QA Diretor" em vez do selo "Padrão do sistema". Consequência prática: nenhum prazo efetivo mudou.
- **Chamados `[QA]` criados:** `#296 [QA] DH8 crítica editada` (resolvido), `#297 [QA] DH15 recusa atrasado` (em andamento, Suporte, vence 01:10Z), `#298 [QA] DH16 aceite atrasado` (em andamento, Suporte, vence 01:10Z), `#299 [QA] DH11 aceite` (resolvido na Diretoria), `#300 [QA] DH12 recusa` (recusado, de volta ao Suporte), `#301 [QA] DH17 backlog pendente` (criado na Diretoria, aguardando aceite no Suporte, `due_at` nulo).
- Chamados reais e contas não foram tocados.
