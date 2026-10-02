# Relatório de testes — Resolução e comentários do chamado

- **Data:** 2026-10-02
- **Contrato:** `docs/contracts/ticket-resolution.md` (mais `ticket-creation.md`, seção "Revisão de 2026-10-02", e `ticket-edit.md`)
- **Commit:** `d1bbc4f` · alterações não comitadas: sim
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 38 de 38 passaram · 0 falharam · 0 bloqueados · 0 não executados

## Pré-requisitos

- Dev server respondendo 200 em `/login`; MCPs `playwright`, `next-devtools` e `postgres` (`SELECT 1` ok).
- Usuários QA existem, ativos e com `must_change_password = false` (ids 13 Admin Suporte, 14 Membro Suporte, 15 Admin Infra; diretor id 6).
- `RESEND_API_KEY` está **preenchida** no `.env`. Nenhum cenário desta feature dispara e-mail (contrato: "Sem e-mail"), então nenhum foi marcado como não executado. Não apareceu nenhuma tentativa de envio nos logs.
- Migration `0009` confirmada (cenário 37).

## Dados criados (todos `[QA]`)

| Chamado | Id  | Título                                                               | Setor      |
| ------- | --- | -------------------------------------------------------------------- | ---------- |
| R1      | 74  | `[QA] Resolução autor`                                               | QA Suporte |
| R2      | 75  | `[QA] Resolução admin`                                               | QA Suporte |
| R3      | 76  | `[QA] Resolução diretor`                                             | QA Suporte |
| C       | 77  | `[QA] Comentários`                                                   | QA Suporte |
| A       | 78  | `[QA] Chamado do admin`                                              | QA Suporte |
| infra   | 79  | `[QA] Resolução infra`                                               | QA Infra   |
| longo   | 80  | `[QA] Solução longa` (resolvido com 40 linhas, só para o cenário 35) | QA Suporte |

O #C recebeu também 6 comentários públicos `[QA] Comentário de volume N` (para o cenário 34). QA Membro Suporte foi movido para QA Infra (cenários 27 a 29) e devolvido a QA Suporte (confirmado no banco: `department_id = 18`). #65 a #68 não foram alterados; o #66 só foi lido e alvo de ação forjada recusada.

## Cenários

| #   | Cenário                                                                                                                                                                                                                                                                                        | Papel               | Status |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------ |
| 1   | Criação sem destino: `aberto`, origem = atual = QA Suporte, sem `ticket_transfer`, só `criacao` (#74 a #78; #79 em QA Infra)                                                                                                                                                                   | banco (leitura)     | PASSOU |
| 2   | "Novo chamado": Título, Descrição, Tipo, Tag; sem setor de destino nem aviso; toast `Chamado #N criado.`                                                                                                                                                                                       | QA Membro Suporte   | PASSOU |
| 3   | `/tickets/74`: Conclusão após a linha do tempo, `Solução`, `Resolver`, Anexar e Enviar com `aria-disabled="true"`, sem `disabled` nem `title`                                                                                                                                                  | QA Membro Suporte   | PASSOU |
| 4   | Vazio → `Descreva a solução.`; `curta` → mínimo de 10; 0 requests de action                                                                                                                                                                                                                    | QA Membro Suporte   | PASSOU |
| 5   | Resolver com espaços nas pontas: toast, badge `Resolvido`, solução travada sem espaços, `Resolvido em`, botões bloqueados somem, linha "Resolução" · autor · `Resolveu o chamado.`                                                                                                             | QA Membro Suporte   | PASSOU |
| 6   | Banco após o 5 (ver evidência abaixo)                                                                                                                                                                                                                                                          | banco (leitura)     | PASSOU |
| 7   | Meus chamados: #74 listado como `Resolvido`; aba Abertos por mim = 10 = banco                                                                                                                                                                                                                  | QA Membro Suporte   | PASSOU |
| 8   | Forjar `ticketId` 75 → 74: `Você não pode resolver este chamado.`; `max(ticket_history)` 99 inalterado                                                                                                                                                                                         | QA Membro Suporte   | PASSOU |
| 9   | Admin do setor resolve #75 (não é autor); `changed_by = 13`; timeline com o nome dele                                                                                                                                                                                                          | QA Admin Suporte    | PASSOU |
| 10  | Diretor resolve #76; `changed_by = 6`                                                                                                                                                                                                                                                          | Diretor             | PASSOU |
| 11  | Membro abre #78 (admin, mesmo setor): `Nenhuma solução registrada.`, sem campo, sem `Resolver`, sem botões bloqueados                                                                                                                                                                          | QA Membro Suporte   | PASSOU |
| 12  | Do formulário do #77, forjar 78: `Você não pode resolver este chamado.`; #78 segue `aberto`; histórico inalterado                                                                                                                                                                              | QA Membro Suporte   | PASSOU |
| 13  | Admin Infra cria #79; forja 77 e 999999: ambos `Chamado não encontrado.`; nada gravado (`max(ticket_history)` 103, `max(message)` 8)                                                                                                                                                           | QA Admin Infra      | PASSOU |
| 14  | `/tickets/66`: aviso amarelo, campo travado `Aguardando aprovação de QA Infra`, sem `Resolver` nem botões                                                                                                                                                                                      | QA Membro Suporte   | PASSOU |
| 15  | `/tickets/66` mesmo card; forjar 78 → 66: `Você não pode resolver este chamado.`; `updated_at` do #66 e `max(ticket_history)` (101) inalterados                                                                                                                                                | QA Admin Suporte    | PASSOU |
| 16  | Seed demo do diretor: #10 e #11 `Nenhuma solução registrada.` travado + `Resolvido em`; #12 e #9 `Nenhuma solução registrada.` sem campo; #5 formulário + botões bloqueados. Nada resolvido na Diretoria                                                                                       | Diretor             | PASSOU |
| 17  | Mouse: hover 2 s sem nada; cliques repetidos → um toast com texto exato, sem request de action, nada abre (os dois botões)                                                                                                                                                                     | QA Membro Suporte   | PASSOU |
| 18  | Teclado: Enter e Espaço mostram o toast exato, foco permanece, `aria-describedby` → `span.sr-only` com a mensagem exata, `title` vazio, sem `disabled`                                                                                                                                         | QA Membro Suporte   | PASSOU |
| 19  | Móvel 390×844 com toque, `tap` nos dois botões: toast exato, 0 requests                                                                                                                                                                                                                        | QA Membro Suporte   | PASSOU |
| 20  | `/tickets/77`: card Comentários na coluna estreita abaixo de Detalhes; `Nenhum comentário ainda.`; checkbox desmarcada; `Comentar`                                                                                                                                                             | QA Membro Suporte   | PASSOU |
| 21  | Vazio e só espaços → `Escreva o comentário.`; 5001 → `O comentário precisa ter no máximo 5000 caracteres.`; 0 requests                                                                                                                                                                         | QA Membro Suporte   | PASSOU |
| 22  | Público: toast `Comentário publicado.`, sem selo, campo vazio, checkbox desmarcada, linha do tempo idêntica antes e depois                                                                                                                                                                     | QA Membro Suporte   | PASSOU |
| 23  | Privado: aparece por último com selo `Privado`                                                                                                                                                                                                                                                 | QA Membro Suporte   | PASSOU |
| 24  | Admin comenta público e privado; os 4 na ordem de criação, 2 com selo                                                                                                                                                                                                                          | QA Admin Suporte    | PASSOU |
| 25  | Banco: 4 linhas do #77 com `user_id` e `visibility` corretos, `content` com `trim`; `max(ticket_history)` e `ticket.updated_at` do #77 inalterados                                                                                                                                             | banco (leitura)     | PASSOU |
| 26  | Diretor vê os 4, inclusive os 2 privados                                                                                                                                                                                                                                                       | Diretor             | PASSOU |
| 27  | Membro em QA Infra: detalhe abre; vê público do membro, privado do membro e público do admin; `Privado do admin` ausente do DOM, do HTML e do payload RSC (`fetch` com `RSC: 1`); Conclusão `Nenhuma solução registrada.`                                                                      | QA Membro + Diretor | PASSOU |
| 28  | Membro em QA Infra publica `[QA] Privado de fora`: aparece com selo                                                                                                                                                                                                                            | QA Membro Suporte   | PASSOU |
| 29  | Admin Suporte vê os 5, inclusive `Privado de fora`; membro devolvido a QA Suporte (banco confirma)                                                                                                                                                                                             | QA Admin Suporte    | PASSOU |
| 30  | Comentar em #74 `resolvido`: formulário presente, publicado                                                                                                                                                                                                                                    | QA Membro Suporte   | PASSOU |
| 31  | #11 `fechado` e #12 `cancelado`: sem formulário, texto `Este chamado foi encerrado e não recebe novos comentários.`                                                                                                                                                                            | Diretor             | PASSOU |
| 32  | Do formulário do #77, forjar 11: `Você não pode comentar neste chamado.`; `max(message)` 7 inalterado; nada em #11                                                                                                                                                                             | Diretor             | PASSOU |
| 33  | Do formulário do #79, forjar 77: `Chamado não encontrado.`; `max(message)` 8 inalterado                                                                                                                                                                                                        | QA Admin Infra      | PASSOU |
| 34  | Desktop 1440×900, #77 com 11 comentários: ordem das colunas correta; fim de Conclusão e de Comentários em y = 1089 nos dois (diferença 0 px); lista rola por dentro (`scrollHeight` 1236, `clientHeight` 160); página 1121 px, sem rolagem horizontal. Screenshot `.qa-output/s34-desktop.png` | QA Membro Suporte   | PASSOU |
| 35  | Desktop `/tickets/74` e `/tickets/80` (solução de 40 linhas): Conclusão cresce (fim em 1089 e em 1554); Comentários acompanha, fins iguais                                                                                                                                                     | QA Membro Suporte   | PASSOU |
| 36  | Móvel 390×844 #77: uma coluna na ordem Descrição, Linha do tempo, Conclusão, Detalhes, Comentários; lista com rolagem própria (`clientHeight` 384); `scrollWidth` = 390. Screenshot `.qa-output/s36-mobile.png`                                                                                | QA Membro Suporte   | PASSOU |
| 37  | `enum_range(history_event)` contém `resolucao`; `ticket.solution` é `text`, `is_nullable = YES`                                                                                                                                                                                                | banco (leitura)     | PASSOU |
| 38  | `get_errors` vazio em todas as verificações; sem aviso de hidratação; sem aviso do Radix ao abrir `Editar` (dialog sem `aria-describedby`, console limpo)                                                                                                                                      | todos               | PASSOU |

### Evidência do cenário 6 (chamado #74)

```sql
SELECT status, solution, resolved_at, updated_at, priority, assigned_to, origin_department_id, current_department_id FROM ticket WHERE id=74;
```

`status = resolvido`; `solution = '[QA] Reiniciei o serviço e validei o acesso.'` (sem espaços); `resolved_at = updated_at = 2026-10-02 21:23:39.487+00`; `priority = media`; `assigned_to` nulo; origem = atual = 18.

```sql
SELECT * FROM ticket_history WHERE ticket_id=74 ORDER BY id;
```

Duas linhas: `criacao` (id 95) e `resolucao` (id 99): `changed_by = 14`, `from_status = aberto`, `to_status = resolvido`, `note` nula, demais `from_*`/`to_*` nulas, `changed_at = 21:23:39.487` (igual a `resolved_at`).

### Evidência complementar (ciclo de vida)

- Para #74, #75, #76 e #80: `resolved_at = updated_at = changed_at` da linha `resolucao`, `solution` preenchida; `changed_by` = 14, 13, 6 e 14.
- Para #74 a #80: `ticket.status` = `to_status` da última linha de `ticket_history` (todos `true`); `count(ticket_transfer)` para `ticket_id >= 74` = 0.
- Comentários: `message` ids 3, 4, 6, 7, 8 e 9 a 14 no #77, e id 5 no #74; nenhuma linha de `ticket_history` gerada por comentário.

## Falhas

Nenhuma.

## Erros fora dos cenários

Nenhum erro de runtime, build ou hidratação durante a bateria (`get_errors` vazio no fim). O log do dev server tem erros `Failed query ... ticket` às 05:18, anteriores à sessão de teste (consistentes com a migration ainda não aplicada na época); a partir de 06:46 só há mensagens INFO. O console do navegador mostra avisos de preload de fonte (`woff2 preloaded but not used`) em `/registry/people`, sem relação com a feature.

## Não executados

Nenhum.

## Observações

- **Privado visível ao setor inteiro.** Um membro do setor atual do chamado vê os comentários privados de todos, inclusive do admin (`canSeeInternalComments` = diretor ou mesmo setor, como o contrato define). Isso é diferente de "privado = só admin"; vale o `df-architect` confirmar que é a intenção do produto.
- **Altura da lista de comentários no desktop.** Com a coluna larga curta (Conclusão vazia), a lista de comentários ocupa só ~160 px de rolagem. Está dentro do contrato (a coluna larga dita a altura), mas fica apertada; decisão de design, não falha.
- **Cenário 18.** O foco foi dado com `focus()` em vez de navegar com `Tab` até cada botão; o resto do cenário (Enter, Espaço, árvore de acessibilidade, `aria-describedby`) foi executado como descrito.
- **Cenário 17.** A ferramenta reporta `[disabled]` na árvore de acessibilidade do Playwright para elementos `aria-disabled`; o DOM real tem `disabled = false`.
- **Numeração de `message`.** Os ids começam em 3 (ids 1 e 2 consumidos antes desta bateria, fora do meu escopo).
- **Edição de chamado `resolvido`.** O botão `Editar` continua visível em chamado resolvido; é o previsto em `ticket-edit.md` ("janela de correções da futura feature de Conclusão").
- O #80 (`[QA] Solução longa`) e as 6 mensagens de volume do #77 foram criados além da preparação do contrato, só para exercitar o layout (cenários 34 e 35).
