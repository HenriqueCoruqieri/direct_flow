# Relatório de testes — Anexos em blocos com ícone por tipo

- **Data:** 2026-10-13
- **Contrato:** `docs/contracts/attachment-tiles.md` (plano `docs/plans/ticket-attachments.md`)
- **Commit:** `c52436c` · alterações não comitadas: sim (Etapa 2 e a mudança de blocos estão no working tree)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento, R2 real (bucket privado)
- **Resultado:** 14 de 14 passaram · 0 falharam · 0 bloqueados · 0 não executados

## Pré-requisitos

- Dev server: `/login` respondeu 200.
- MCP: `next-devtools` (porta 3000), `playwright` e `postgres` (`SELECT` em `users` e `ticket`) responderam.
- Usuários QA (13 `qa.admin.suporte`, 14 `qa.member.suporte`, 15 `qa.admin.infra`) existem e estão ativos. A bateria inteira usou só o membro `qa.member.suporte@directflow.test` (M), que já estava logado na janela do Chrome.
- `RESEND_API_KEY` está preenchida no `.env`. Nenhum cenário desta bateria dispara e-mail, então nenhum foi marcado como não executado por isso. Nenhuma linha de envio nem de `RESEND_API_KEY não configurada` apareceu no log do dev server.
- Arquivos de teste gerados em `.qa-output/tiles/` (fora do git), com as assinaturas do contrato: `relatorio.pdf`, `notas.txt`, `servidor.log`, `dados.csv`, `planilha.xlsx`, `doc.docx`, `apresentacao.pptx`, `logs.zip` (1 KB), `backup.rar`, `foto.jpg`, `foto.jpeg`, `imagem.webp`, `print.png`, o PNG de 120 caracteres, `relatório ação.pdf`, `setup.pdf` (MZ) e `pagina.html`.

## Dados criados

| Chamado | Título                     | Uso                                                                                                |
| ------- | -------------------------- | -------------------------------------------------------------------------------------------------- |
| #220    | `[QA] Blocos criação` (K1) | AK1 a AK3, AK11 a AK13. 5 anexos na criação + 5 na Conclusão; hoje `resolvido`                     |
| #221    | `[QA] Blocos conclusão`    | AK10 (diálogo, Conclusão e card em 390 px). 2 anexos na criação + 2 na Conclusão; hoje `resolvido` |

Tudo em QA Suporte. Nada de #65 a #68 foi tocado.

## Cenários

| #    | Cenário                                                                   | Papel | Status |
| ---- | ------------------------------------------------------------------------- | ----- | ------ |
| AK1  | Novo chamado: 5 blocos com ícone, extensão, nome, tamanho e status        | M     | PASSOU |
| AK2  | Criar o chamado e conferir o card `Anexos` com 5 blocos                   | M     | PASSOU |
| AK3  | Conclusão com PPTX, RAR, ZIP, CSV e LOG; card com 10 blocos               | M     | PASSOU |
| AK4  | JPG, JPEG e WEBP; cancelar e reabrir com lista vazia                      | M     | PASSOU |
| AK5  | Status por bloco: `Enviando…` → `Enviado` e `Falha no envio` com mensagem | M     | PASSOU |
| AK6  | Remover o bloco do meio pelo X; foco volta ao `Anexar`                    | M     | PASSOU |
| AK7  | Limite de 5 (6º com 5 na lista; lote de 6 com lista vazia)                | M     | PASSOU |
| AK8  | `setup.pdf` e `pagina.html` recusados, nenhum bloco                       | M     | PASSOU |
| AK9  | Nome de 120 caracteres sem espaço no bloco                                | M     | PASSOU |
| AK10 | 390×844: diálogo, Conclusão e card                                        | M     | PASSOU |
| AK11 | Card: Tab + Enter e clique no ícone baixam com o nome original            | M     | PASSOU |
| AK12 | Árvore de acessibilidade do card (nome, descrição, 10 `listitem`)         | M     | PASSOU |
| AK13 | Tema escuro em `/tickets/220` (e no diálogo)                              | M     | PASSOU |
| AK14 | Erros, hidratação, CORS e e-mail em toda a bateria                        | todos | PASSOU |

## Falhas

Nenhuma.

## Evidências por cenário

Cores conferidas contra `getComputedStyle(document.documentElement).getPropertyValue('--file-*')`; classe do SVG dentro do wrapper `aria-hidden="true"`.

- **AK1 (claro, 1440×900):** `<ul class="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2">` com 5 `<li>` em 3 colunas (144 px) × 2 linhas (altura 132 px). Ordem interna: ícone, extensão, nome, tamanho, status.

  | Arquivo         | Ext.   | Classe do SVG                                   | Cor (claro)         | Token             |
  | --------------- | ------ | ----------------------------------------------- | ------------------- | ----------------- |
  | `print.png`     | `PNG`  | `lucide-file-image text-file-image`             | `rgb(112, 71, 201)` | `#7047c9`         |
  | `relatorio.pdf` | `PDF`  | `lucide-file-text text-file-pdf`                | `rgb(181, 54, 54)`  | `#b53636`         |
  | `notas.txt`     | `TXT`  | `lucide-file text-muted-foreground`             | `rgb(91, 103, 120)` | `#5b6778`         |
  | `planilha.xlsx` | `XLSX` | `lucide-file-spreadsheet text-file-spreadsheet` | `rgb(33, 117, 56)`  | `#217538`         |
  | `doc.docx`      | `DOCX` | `lucide-file-text text-file-document`           | `rgb(37, 99, 201)`  | `#2563c9` (≠ PDF) |

  A transição `Enviando…` (spinner `animate-spin`) → `Enviado` foi observada por `MutationObserver` no AK4 e no AK5 (mesmo componente; no AK1 o PUT terminou antes da primeira leitura). Screenshot: `.qa-output/ak1-dialog-claro.png`.

- **AK2 (#220, claro):** toast `Chamado #220 criado.`; consulta `SELECT … FROM attachment WHERE ticket_id=220` devolveu 5 linhas (ids 23 a 27, `message_id` nulo, `uploaded_by` 14, `mime_type` da tabela, `size_bytes` 68, 1039, 4, 1028, 1028). Card em 2 colunas (159×150 px) na ordem de envio, cada bloco com ícone e extensão do AK1, nome, tamanho, `QA Membro Suporte` e `13/10/2026 22:15`. `aria-label="Baixar <nome>"` e `href="/api/attachments/<id>"`. Screenshot: `.qa-output/ak2-card-claro.png`.
- **AK3 (#220):** no uploader da Conclusão, `PPTX` `lucide-presentation text-file-presentation` `rgb(194, 65, 12)` (`#c2410c`); `RAR` e `ZIP` `lucide-library text-file-archive` `rgb(143, 82, 5)` (`#8f5205`); `CSV` `lucide-file-spreadsheet` `rgb(33, 117, 56)`; `LOG` `lucide-file` neutro. Área larga: 5 colunas de 136 px. Depois de `Resolver`: `ticket.status = resolvido` e última linha de `ticket_history` com `to_status = resolvido`; 10 linhas de `attachment` (ids 23 a 32, `message_id` nulo), card com 10 blocos, os 5 novos depois dos 5 da criação, com os mesmos ícones e extensões. Screenshot: `.qa-output/ak3-conclusao-claro.png`.
- **AK4:** `JPG`, `JPEG`, `WEBP` com `lucide-file-image text-file-image` (`rgb(183, 156, 255)` no tema escuro em que o cenário rodou). Log do observador: os três em `Enviando…` com spinner, depois `Enviado`. Cancelar e reabrir: 0 `<ul>`, texto `Nenhum anexo.`. Screenshot: `.qa-output/ak4-enviando-escuro.png`.
- **AK5:** PUT atrasado em 10 s para `print.png` (`Enviando…` de 78,7 s a 89,6 s no relógio da página, depois `Enviado`); com a rota trocada por `route.abort()`, `dados.csv` caiu em `Falha no envio` com `Falha no envio. Remova o arquivo e tente de novo.` completa dentro do bloco (`scrollHeight` = `clientHeight`; os dois blocos com 184 px). `ariaSnapshot` da região `aria-live="polite"`: `paragraph: "print.png: Enviado"` e `paragraph: "dados.csv: Falha no envio"` seguido da mensagem. O único erro de console da bateria é o `net::ERR_FAILED` do PUT abortado, previsto neste cenário. Screenshot: `.qa-output/ak5-status-por-bloco.png`.
- **AK6:** ordem de Tab a partir do `Anexar`: `Remover foto.jpg`, `Remover foto.jpeg`, `Remover imagem.webp`, depois o campo `Tipo`. X do bloco do meio a 4 px do topo e 4 px da direita, 28×28 px. Depois de remover ficaram `foto.jpg` e `imagem.webp`; `document.activeElement` = botão `Anexar`.
- **AK7:** com 5 blocos, selecionar `planilha.xlsx`: toast `Anexe no máximo 5 arquivos.`, lista continua com 5. Lote de 6 com a lista vazia: toast igual; máximo de `<li>` observado a cada mutação do DOM = 5 (nunca 6).
- **AK8:** toasts `setup.pdf: O conteúdo do arquivo não corresponde à extensão.` e `pagina.html: Tipo de arquivo não aceito. Envie PNG, JPEG, WebP, PDF, TXT, CSV, LOG, DOCX, XLSX, PPTX, ZIP ou RAR.`; 0 blocos, `Nenhum anexo.` mantido.
- **AK9:** `<li>` de 149 px = largura da coluna (149,33 px), igual ao bloco de `print.png`; nome com `line-clamp: 2` e 2 linhas, reticências visíveis; `title` e `textContent` com 120 caracteres; extensão `PNG` acima; `[role="dialog"]` sem rolagem horizontal. O mesmo vale para o card em 390 px (143 px, 2 linhas, 120 caracteres no `title`). Screenshot: `.qa-output/ak9-nome-longo.png`.
- **AK10 (390×844, claro):** documento `scrollWidth` 390 e `clientWidth` 390; `[role="dialog"]` 343 e 343 (sem rolagem horizontal). Diálogo, Conclusão de #221 e card de #220 (10 blocos) em 2 colunas de 143 px. X alcançável (28×28 dentro da coluna). Rodapé do diálogo fora da tela de início, alcançável por rolagem interna (`scrollIntoView`, `elementFromPoint` devolve `Abrir chamado`). No card, autor e data visíveis em cada um dos 10 blocos; bloco mais alto 150 px (166 px com nome de 2 linhas). Screenshots: `.qa-output/ak10-dialog-390.png`, `.qa-output/ak10-dialog-390-rodape.png`, `.qa-output/ak10-conclusao-390.png`, `.qa-output/ak10-card-390.png`.
- **AK11:** Tab a partir do início da página chegou ao primeiro bloco (`/api/attachments/23`) na 5ª tecla; `:focus-visible` verdadeiro, `outline: none` e anel de 3 px (`box-shadow`, `ring-ring/50`). `Enter` baixou `print.png`; clique no `svg` do segundo bloco baixou `relatorio.pdf` (`suggestedFilename` = nome original), sem navegar. Screenshot: `.qa-output/ak11-foco.png`.
- **AK12:** `ariaSnapshot` do `<ul>`: 10 `listitem`, cada um com `link "Baixar <nome>"` e `/url: /api/attachments/<id>`, seguido do texto do nome, tamanho, `QA Membro Suporte` e `time`. Ícone e extensão ausentes da árvore (wrapper `aria-hidden="true"`). `aria-describedby="attachment-<id>-details"` aponta para o `<span>` com `68 B | QA Membro Suporte | 13/10/2026 22:15`.
- **AK13 (`prefers-color-scheme: dark`, classe `dark` na raiz):** `--file-*` escuros `#f07a7a`, `#86d993`, `#6aa8ff`, `#fb923c`, `#b79cff`, `#f2b45a`; cada SVG computa exatamente esses valores (`rgb(240, 122, 122)` PDF, `rgb(106, 168, 255)` DOCX, `rgb(242, 180, 90)` RAR/ZIP etc.). Extensão `rgb(141, 154, 174)` sobre fundo `rgb(26, 35, 48)`: razão de contraste ≈ 5,6:1 (acima dos 4,5:1). Screenshot: `.qa-output/ak13-detalhe-escuro.png`.
- **AK14:** `get_errors` do `next-devtools`: `{"configErrors":[],"sessionErrors":[]}`. Logs de console da sessão (`.qa-output/console-2026-10-14T*.log`): zero ocorrências de `hydrat`; zero warnings; um único `[ERROR]`, o `net::ERR_FAILED` do PUT abortado do AK5. Nenhum erro de CORS fora do AK5. Sem e-mail no log do servidor.

## Erros fora dos cenários

- `browser_console_messages(all)` lista quatro `WebSocket … /_next/hmr … ERR_CONNECTION_REFUSED`. Vêm de arquivos de console de sessões anteriores (`console-2026-10-13T23-06-22-147Z.log`, quando o dev server estava fora do ar); nenhum deles é da bateria desta rodada (os arquivos `console-2026-10-14T*.log` não os têm).
- `next-development.log` guarda um `SECURITY WARNING` do `pg` sobre os modos SSL `prefer`/`require` (emitido na subida do servidor, 00:00:05, antes da bateria). Sem relação com anexos.

## Não executados

Nenhum.

## Observações

- **Densidade na coluna da direita (1440 px):** o card tem ~325 px de largura útil e comporta 2 blocos de ~159×150 px por linha. Com 10 anexos (máximo 5 na criação + 5 na Conclusão) o card ocupa 5 linhas, ~790 px de altura, mais que a coluna da esquerda no chamado resolvido (a coluna da direita passa da altura da Conclusão e da Linha do tempo juntas). Com 4 a 6 anexos o aspecto é bom e os blocos ficam legíveis; com 10 a coluna fica longa mas sem quebra de layout. É decisão de produto se vale um limite visual (ex.: recolher depois de N blocos); o contrato diz "o card cresce".
- **Bloco com nome de 2 linhas** fica 16 px mais alto que o de nome curto (166 × 150 px), e os blocos da mesma linha igualam a altura (`stretch`); em linhas mistas o espaço vazio aparece nos blocos curtos, mas o alinhamento da grade se mantém.
- **Largura do uploader da Conclusão:** em tela larga a lista ocupa 5 colunas de 136 px (largura mínima), blocos mais compactos que no diálogo (3 colunas de ~144 a 149 px). O contrato só especifica diálogo (~3), card (~2) e 390 px (2); comportamento coerente com o `auto-fill`.
- **Hover/clique:** o bloco do card muda de `bg-surface-muted` (`rgb(26, 35, 48)` no escuro) para `bg-surface-active` (`rgb(31, 41, 55)`) sob o mouse, como previsto.
- **Pontos que o `snapshot` do `playwright` MCP mostra diferente:** o `browser_snapshot` lista a extensão (`PNG`) como nó de texto mesmo dentro do wrapper `aria-hidden="true"`; o DOM e o `ariaSnapshot` do Playwright confirmam que ela está fora da árvore de acessibilidade. Não é falha do produto, só limitação do formato do snapshot.
- **Fuso:** `created_at` `2026-10-14 01:15 UTC` aparece como `13/10/2026 22:15` (America/Sao_Paulo), como no resto do app.
- **Regressões (AT2, AT12 a AT14, AR3, AR8 a AR10):** não reexecutadas por inteiro; foram exercitados o fluxo de criação com anexos (AT2/AR14), resolução com anexos (AR3), remoção pelo X (AT12), PUT atrasado e abortado (AT13/AT14 no nível do bloco), recusa de tipo (AT7) e limite de 5 (AT11), todos com a nova forma dos blocos e sem divergência.
- **Contrato:** sem ambiguidades encontradas. A tabela de cores/ícones do contrato bate com o renderizado nas sete categorias, nos dois temas.
