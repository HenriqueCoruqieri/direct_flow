# Relatório de testes — Lista de anexos na Conclusão e download

- **Data:** 2026-10-14
- **Contrato:** `docs/contracts/ticket-attachments-list-and-download.md`
- **Commit:** `173afa9` · alterações não comitadas: sim (Etapa 2 inteira está no working tree)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento, bucket R2 real
- **Resultado:** 22 de 22 passaram · 0 falharam · 0 bloqueados · 0 não executados

## Pré-requisitos

- Dev server: `/login` respondeu 200.
- MCP: `next-devtools` (porta 3000), `playwright` (Chrome visível, aba única) e `postgres` (`SELECT` pelo `execute_sql`) responderam.
- Usuários QA e diretor existem e estão ativos (consulta a `users`: 4 linhas, `is_active = true`).
- Configuração do R2 (ADR 018): as variáveis `R2_*` estão preenchidas e o bucket funcionou de ponta a ponta (envio pelo navegador com status `Enviado`, `GET` assinado devolvendo `200` com o conteúdo). Nenhum cenário ficou bloqueado por R2.
- `RESEND_API_KEY` **preenchida**. Esta feature não envia e-mail, então nenhum cenário foi marcado como não executado por isso. Ver "Observações" sobre LA11.

## Dados criados (todos em QA Suporte)

| Id  | Título                    | Papel no teste                            | Estado final                                                                      |
| --- | ------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------- |
| 227 | `[QA] Lista de anexos K1` | K1: 3 anexos, destinatário A              | `resolvido` (A resolveu com +1 anexo)                                             |
| 229 | `[QA] Lista de anexos K2` | K2: 5 anexos na criação + 5 na resolução  | `resolvido`, 10 anexos                                                            |
| 228 | `[QA] Lista de anexos K3` | K3: sem anexo, fila                       | `recusado`, devolvido a QA Suporte                                                |
| 230 | `[QA] Lista de anexos K4` | K4: 1 anexo (`print.png`), destinatário M | `em_andamento`, com um envio pendente de `dados.csv` no uploader, nunca resolvido |

Os arquivos de teste ficaram em `.qa-output/files/` (fora do git). Não alterei #65 a #68.

## Cenários

| #    | Cenário                                                                                         | Papel     | Status |
| ---- | ----------------------------------------------------------------------------------------------- | --------- | ------ |
| LA1  | K1 em `empty`: "Nenhuma solução registrada." + `h3` Anexos com 3 blocos na ordem da consulta    | M         | PASSOU |
| LA2  | K1 em `resolvable` com `canAttach`: Solução → Anexos → Novos anexos → barra                     | A         | PASSOU |
| LA3  | `resolvable` sem `canAttach`: Solução → Anexos → barra, sem Anexar nem Novos anexos (ver nota)  | D         | PASSOU |
| LA4  | Download dos 3 anexos de K1 sem sair da página, nome e tamanho originais                        | A         | PASSOU |
| LA5  | Autor e diretoria baixam                                                                        | M, D      | PASSOU |
| LA6  | `GET /api/attachments/41`: `307`, R2, `X-Amz-Expires=60`, `no-store`; `GET` no `Location` → 200 | A         | PASSOU |
| LA7  | `Location` reaproveitado 70 s depois: recusado                                                  | A         | PASSOU |
| LA8  | Resolver K1 com `notas.txt` em Novos anexos: `resolved` com 4 blocos, Novos anexos some         | A         | PASSOU |
| LA9  | K1 resolvido, Editar/Cancelar: bloco continua visível e baixando                                | A         | PASSOU |
| LA10 | K4: Editar esconde Solução, uploader e barra; Cancelar restaura `abc` e `dados.csv` `Enviado`   | M         | PASSOU |
| LA11 | K3 `awaiting_transfer`: mensagem da transferência → Anexos com `Nenhum anexo.`, sem `<ul>`      | M (A e I) | PASSOU |
| LA12 | K3 em `resolvable` sem `canAttach`: Anexos com vazio tracejado, sem `<ul>`                      | M         | PASSOU |
| LA13 | Outro setor: página `404`; rota com os 4 `404` idênticos, sem `Location`                        | I         | PASSOU |
| LA14 | Sem cookie: redireciona para `/login`, sem `Location` para o R2                                 | —         | PASSOU |
| LA15 | Cookie de sessão inválido: redireciona para `/login` (absoluto), sem R2                         | —         | PASSOU |
| LA16 | K2 com 10 blocos: faixa rola, documento não, blocos iguais, nome de 120 caracteres em 2 linhas  | M         | PASSOU |
| LA17 | Tab pelos 10 blocos, anel inteiro, contêiner rola sozinho, `Enter` baixa                        | M         | PASSOU |
| LA18 | 390×844: sem rolagem horizontal do documento, 2 blocos + fresta, igual na edição                | M         | PASSOU |
| LA19 | Árvore de acessibilidade: `h3` Anexos, `list` Anexos com 10 `listitem`, links `Baixar <nome>`   | M         | PASSOU |
| LA20 | Tema escuro em K1 e K2: legível, hover e anel de foco visíveis                                  | M         | PASSOU |
| LA21 | Diálogo "Novo chamado": uploader continua com o título `Anexos`                                 | M         | PASSOU |
| LA22 | Sem erro nem aviso de hidratação, sem id duplicado em nenhum estado                             | todos     | PASSOU |

### Evidência por cenário

**LA1** (#227, M). Consulta de apoio:

```sql
select id, ticket_id, message_id, file_name, size_bytes, storage_key, created_at
from attachment where ticket_id = 227 order by created_at, id;
```

Linhas: `40 print.png 2056`, `41 relatório ação.pdf 1039`, `42 dados.csv 8`, todas com `message_id` nulo e o mesmo `created_at`. A Conclusão mostrou "Nenhuma solução registrada." e, abaixo, 3 `li` na mesma ordem (`PNG print.png 2 KB`, `PDF relatório ação.pdf 1 KB`, `CSV dados.csv 8 B`), nenhum `button` dentro dos blocos e nenhuma `section` com título `Anexos` na página (só o `h3` dentro da Conclusão). Screenshot `.qa-output/la1-k1-m.png`.

**LA2** (#227, A). Ordem no DOM: textarea Solução → `h3` Anexos (3 blocos) → grupo `Novos anexos` (dica, `Nenhum anexo.`) → `Anexar`, `Enviar para outro setor`, `Resolver`. Um único título `Anexos`; o grupo do uploader é nomeado por `aria-labelledby` com o texto `Novos anexos`. Screenshot `.qa-output/la2-k1-admin.png`.

**LA3** (diretor, #230). Ordem: Solução → `h3` Anexos (1 bloco) → `Enviar para outro setor`, `Resolver`. Sem `Anexar`, sem grupo `Novos anexos`. Screenshot `.qa-output/la3-k4-director.png`.

Nota: o contrato pede K1, mas K1 já estava resolvido pelo LA8 quando cheguei ao diretor. Usei K4 (#230, `resolvable`, destinatário M, 1 anexo), que exercita a mesma regra (`canAttach` falso, estado `resolvable`). Quem repetir a bateria deve rodar LA3 antes de LA8 para usar K1 com os 3 blocos.

**LA4**. Os três cliques de A em K1 geraram download sem mudar a URL (`/tickets/227`). `suggestedFilename`: `print.png`, `relatório ação.pdf`, `dados.csv`. Tamanhos dos arquivos salvos em `.qa-output/dl/`: 2056, 1039 e 8 bytes, iguais aos de `size_bytes`. M repetiu os três com o mesmo resultado (LA5).

**LA5**. M: 3 downloads (acima). D: clique em `relatório ação.pdf` baixou com o nome original; `GET /api/attachments/41` devolveu `307`.

**LA6** (A, anexo 41). `GET` sem seguir redirecionamento: `307`, `Cache-Control: private, no-store`, `Location` em `direct-flow-attachments.<conta>.r2.cloudflarestorage.com/tickets/<uuid>.pdf` com `X-Amz-Expires=60`. `GET` imediato no `Location`: `200`, `Content-Type: application/pdf`, `Content-Length: 1039`, `Content-Disposition: attachment; filename="relat_rio a__o.pdf"; filename*=UTF-8''relat%C3%B3rio%20a%C3%A7%C3%A3o.pdf`.

**LA7**. `Location` emitido às 17:23:45 (BRT); `GET` aos 18 s devolveu `200` (controle), e depois de 70 s devolveu `403` com `<Code>ExpiredRequest</Code><Message>Request has expired</Message>`.

**LA8** (A, #227). Solução `[QA] solução K1`, `notas.txt` em Novos anexos, `Resolver`. Estado `resolved`: Solução travada → `Resolvido em 14/10/2026 17:24` → `Editável até 21/10/2026 17:24` → `h3` Anexos com 4 blocos (`print.png`, `relatório ação.pdf`, `dados.csv`, `notas.txt` por último). Grupo `Novos anexos` ausente. Banco: `ticket.status = resolvido`, última linha de `ticket_history` com `to_status = resolvido`.

**LA9** (A, #227). Em edição: textarea editável com `[QA] solução K1`, legendas e, depois delas, o `h3` Anexos com 4 blocos (1 `#ticket-attachments-heading`, 1 `h3` Anexos). Clique em `Baixar notas.txt` durante a edição baixou `notas.txt`. Depois de `Cancelar`: mesmo conteúdo de antes, 4 blocos. Screenshot `.qa-output/la9-k1-edit.png`.

**LA10** (M, #230). Antes: Solução `abc` e `dados.csv` enviado em Novos anexos. Em edição: "Nenhuma solução registrada." → Anexos (1 bloco `print.png`); nenhum `textarea`, nenhum botão e nenhum grupo Novos anexos visíveis na Conclusão. Depois de `Cancelar`: textarea com `abc`, bloco `print.png` em Anexos, `dados.csv` `Enviado` no uploader, barra de volta. Screenshot `.qa-output/la10-k4-edit.png`.

**LA11/LA12** (#228). LA12 (M, antes): `Solução` → Anexos com `Nenhum anexo.` (`border-style: dashed`, mesmas classes do uploader, sem `<ul>`) → só `Resolver`. Screenshot `.qa-output/la12-k3.png`. LA11: A enviou K3 a QA Infra pelo diálogo; M abriu e viu o aviso "Aguardando aprovação de QA Infra" e, na Conclusão, a mensagem da transferência (`LockedSolutionField` com `state.message`, `ticket-conclusion.tsx:98-104`) seguida de Anexos com `Nenhum anexo.` tracejado, sem `<ul>` e sem botões. Screenshot `.qa-output/la11-k3-awaiting.png`. Banco depois do envio: `ticket.status = aguardando_aprovacao`, `current_department_id = 19`, última linha de `ticket_history` com `to_status = aguardando_aprovacao`; `ticket_transfer` id 41 `pendente`, de 18 para 19. I recusou com `[QA] devolvido`: `ticket.status = recusado`, `current_department_id = 18`, histórico com `to_status = recusado`; `ticket_transfer` 41 `rejeitado`, `review_note = [QA] devolvido`, 18 → 19. Transferência não ficou pendente.

**LA13** (I). `/tickets/227`: `404` do Next. `/api/attachments/41`, `/999999999`, `/abc` e `/0`: os quatro `404`, `Content-Type: text/plain; charset=utf-8`, `Cache-Control: private, no-store`, corpo `Anexo não encontrado.` idêntico, sem `Location`.

**LA14/LA15** (cliente HTTP puro, sem navegador). Sem cookie: `307` com `Location: /login` (relativo, do `proxy.ts`). Com `better-auth.session_token=invalido` (e também `invalido.assinatura`): `307` com `Location: http://localhost:3000/login` (absoluto, da rota, passo 2). Nenhum `Location` para o R2.

**LA16** (M, 1440×900, #229). Faixa: `scrollWidth 1440 > clientWidth 722`, `scrollHeight 138 = clientHeight 138`, `overflow-x: auto`. Documento: `scrollWidth 1425 = clientWidth 1425`. Os 10 `li` com 136×130 px, todos no mesmo `top` (uma linha), `flex-wrap: nowrap`. O PNG de 120 caracteres: 2 linhas, `title` com 120 caracteres. Contêiner sem `tabindex` e sem `role`. Screenshot `.qa-output/la16-k2.png`.

**LA17** (M, #229). Do textarea Solução, 10 `Tab` pararam nos 10 links na ordem; o contêiner não é ponto de tabulação (o 1º `Tab` vai direto ao 1º link). Folga do 1º bloco à borda: 4 px à esquerda; do 10º: 4 px à direita; o anel é `ring-3` (3 px), então cabe inteiro. `scrollLeft` foi 0 → 431 → 718 ao avançar. `Enter` no 10º bloco baixou `dados.csv`. Screenshot `.qa-output/la17-focus-last.png` mostra o anel completo no último bloco.

**LA18** (M, 390×844, #229). Documento `scrollWidth 375 = clientWidth 375`; faixa `scrollWidth 1440 > clientWidth 301`; blocos 1 e 2 inteiros e o 3º com 9 px visíveis. Em edição: mesmos números (2 blocos inteiros, 3º começando a 292 px). Screenshots `.qa-output/la18-mobile-k2.png` e `.qa-output/la18-mobile-k2-edit.png`.

**LA19** (M, #229). `ariaSnapshot` da Conclusão: `heading "Anexos" [level=3]`, `list "Anexos"` com 10 `listitem`, cada `link "Baixar <nome>"` com o texto do tamanho. O `aria-describedby` de cada link aponta para `ticket-attachment-<id>-size`, cujo texto é igual ao tamanho exibido (`604 B`, `9 B`, `308 B`, `607 B`, `612 B`, `2 KB`, `8 B`). Nenhum `region`/`section` dentro da Conclusão além dela mesma; nenhum id duplicado na página.

**LA20** (M). Com `colorScheme: dark`, `html.dark`: blocos em `rgb(26, 35, 48)`, hover em `rgb(31, 41, 55)` com borda `rgb(42, 53, 71)`, texto `rgb(231, 236, 243)`, anel de foco `ring-3` com cor do tema. Screenshots `.qa-output/la20-dark-k2-hover.png` e `.qa-output/la20-dark-k1-focus.png`.

**LA21** (M). O grupo do diálogo "Novo chamado" tem nome acessível `Anexos`.

**LA22**. `get_errors` devolveu `configErrors: []` e `sessionErrors: []` depois de cada bloco. Console do navegador desta bateria: 0 avisos e 0 erros de hidratação; o único `[ERROR]` é o `404` esperado de `/tickets/227` aberto por I (LA13). `#ticket-attachments-heading` apareceu uma vez em todos os estados medidos: `empty`, `resolvable` (com e sem `canAttach`), `resolved`, `awaiting_transfer`, e dentro e fora da edição.

## Falhas

Nenhuma.

## Erros fora dos cenários

Nenhum durante esta bateria. O `browser_console_messages` com `all: true` e o `next-development.log` mostram erros de compilação e de execução (`ticket-conclusion.tsx:118` "Unexpected token", `listTicketAttachments is not defined`, `attachments.length` de `undefined`, `500` em `/tickets/226`), todos anteriores ao início desta bateria. Eles são do estado intermediário da implementação, com o `df-ui` e o `df-data` ainda editando: os registros são das 17:09–17:11 (BRT), o primeiro teste meu foi às 17:16, e nenhum deles reaparece depois.

## Não executados

Nenhum.

## Observações

- **E-mail em LA11.** `RESEND_API_KEY` está preenchida. O envio para outro setor e a recusa disparam notificação na aplicação, e eu não conferi nem desliguei isso. Como os destinos são `@directflow.test`, não deve chegar a ninguém, mas pode haver tentativa de envio real. O contrato desta etapa não prevê e-mail, então não afeta o resultado.
- **LA3 com K4.** Ver a nota sob o cenário. É desvio de dado de teste, não de comportamento.
- **Preparação dos arquivos.** A interface valida a assinatura binária de cada extensão (`app/_lib/domain/attachment.ts:35-124`). Arquivos `.xlsx`, `.docx`, `.pptx`, `.zip`, `.rar` e `.webp` precisam começar com os bytes de cada formato (`PK\x03\x04`, `Rar!\x1a\x07`, `RIFF....WEBP`); a seção "Como gerar os arquivos de teste" do contrato anterior pode citar isso, porque com bytes qualquer o envio é recusado em silêncio. Não é falha da feature.
- **Estética.** Quando a faixa de blocos é baixa, o card da Conclusão estica até a altura da coluna da direita e sobra espaço vazio abaixo da barra de rolagem (`.qa-output/la16-k2.png`). O contrato não define esse caso; registrado só para o `df-ui` avaliar.
- **Ordem de criação.** Em K1, `created_at` dos três anexos é idêntico (um só `INSERT`), então a ordem exibida depende do desempate por `id`, que o contrato prevê (`created_at asc, id asc`).
- A janela do navegador foi deixada aberta, logada como I (`qa.admin.infra@directflow.test`).
