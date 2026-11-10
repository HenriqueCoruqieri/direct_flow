# Relatório de testes — FormField genérico, Etapa 1 (Dialog de Empresas)

- **Data:** 2026-11-10
- **Contrato:** `docs/contracts/form-field.md` (F1–F12) e `docs/contracts/registry-companies.md` (seções do Dialog)
- **Commit:** `471d615` · alterações não comitadas: sim (refatoração em curso)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 12 de 12 passaram · 0 falharam · 0 bloqueados · 0 não executados

## Cenários

| #   | Cenário                                                                          | Papel   | Status |
| --- | -------------------------------------------------------------------------------- | ------- | ------ |
| F1  | Abertura: 13 `*` vermelhos, sem legenda, opcionais sem `*`                       | Diretor | PASSOU |
| F2  | `*` do CNPJ: DV errado mantém, válido some, apagar volta                         | Diretor | PASSOU |
| F3  | `*` de UF, Razão social (1 vs 3 caracteres), e-mail, telefone, CEP               | Diretor | PASSOU |
| F4  | Salvar vazio: 13 erros, foco no CNPJ, opcionais sem erro                         | Diretor | PASSOU |
| F5  | Corrigir campo após salvar: erro some                                            | Diretor | PASSOU |
| F6  | Acessibilidade: aria-required, label/for, grupo dos Dias                         | Diretor | PASSOU |
| F7  | Máscaras com cursor estável (CNPJ, telefone, CEP)                                | Diretor | PASSOU |
| F8  | Expediente: dia sem horário, horário sem dia, Às antes de Das, foco              | Diretor | PASSOU |
| F9  | Criar `[QA] FormField` (duplo clique em Salvar)                                  | Diretor | PASSOU |
| F10 | `CNPJ_TAKEN` com CNPJ de QA Alfa, foco no CNPJ                                   | Diretor | PASSOU |
| F11 | Editar: abre sem `*`; apagar Nome fantasia traz `*`; cancelar e reabrir restaura | Diretor | PASSOU |
| F12 | Editar e salvar alteração válida                                                 | Diretor | PASSOU |

Evidências por cenário (todas lidas do DOM em `next dev`, com o `get_errors` limpo ao fim):

- **F1.** Título "Nova empresa"; `aria-describedby` do dialog ausente; texto "Campos com" ausente. 13 rótulos com `<span aria-hidden="true" class="text-destructive">*</span>`: CNPJ, Razão social, Nome fantasia, E-mail, Primário, CEP, UF, Logradouro, Número, Bairro, Cidade, Responsável, Contato do responsável. Sem `*`: Secundário, Complemento, Dias, Das, Às, Observação.
- **F2.** Digitando `11222333000182`: `11.222.333/0001-82`, `*` presente, sem alerta. Backspace + `1` → `…-81`, `*` some. Backspace → `…-8`, `*` volta. Nenhum `[role=alert]` em nenhum momento.
- **F3.** UF "SP — São Paulo" → `*` some. Razão social "A" → `*`; "Abc" → some. E-mail `abc` → `*`; `abc@x.com` → some. Telefone `(11) 9999-9` → `*`; `(11) 99999-9999` → some. CEP `0131` → `*`; `01310-100` → some. Sem erro até salvar.
- **F4.** Dialog reaberto após Escape veio vazio, UF "Selecione", 13 `*` (reabrir após cancelar restaura). Salvar vazio: 13 controles com `aria-invalid="true"` e `aria-describedby` apontando para a mensagem do contrato (ex. "Informe o CNPJ.", "Selecione a UF."); `document.activeElement` = CNPJ; Secundário, Complemento, Dias, Das, Às, Observação com `aria-invalid="false"`. Os 13 `*` continuam depois do erro.
- **F5.** Preenchido o CNPJ `13.579.246/0001-01`, o erro dele sumiu (`aria-invalid="false"`), sem salvar de novo (captura `.qa-output/state1.png`).
- **F6.** Obrigatórios com `aria-required="true"` (com ou sem `*`), opcionais sem o atributo; cada `label[for]` aponta para o `id` do controle (`…-control`); UF é `BUTTON` com label associado. Grupo dos Dias: `data-slot=toggle-group`, `aria-labelledby` → "Dias", sem `aria-required` (nem nos itens).
- **F7.** CNPJ: caret no meio, Backspace → `11.223.330/0018-1` caret 2; digitar `2` → `11.222.333/0001-81` caret 4. Telefone: caret em 5, Backspace → `(19) 9999-9999` caret 2; digitar `9` → `(19) 99999-9999` caret 3. CEP: caret 3, Backspace → `01101-00` caret 2; digitar `1` → `01110-100` caret 3. Cursor estável e sem salto para o fim.
- **F8.** Seg sem horário + salvar: erros "Informe o horário de abertura." e "Informe o horário de fechamento." sob Das e Às; Dias sem `*`. Com UF vazia no mesmo submit, o foco foi para a UF (primeiro erro na ordem do formulário). Das 18:00 / Às 08:00: "O horário de fechamento precisa ser depois do de abertura." sob Às, foco em Às. Seg desmarcado com horários: "Marque os dias de atendimento ou apague os horários." sob os dias, foco no botão "Seg".
- **F9.** Toast "Empresa criada.", Dialog fechou, sem `*` com tudo válido. Duplo clique em "Salvar empresa" gerou 1 linha. Consulta: `select id, cnpj, trade_name, state, is_active from company where cnpj='13579246000101'` → `21 | 13579246000101 | [QA] FormField | SP | true`; `count(*) ... like '[QA] FormField%'` = 1. CNPJ `13.579.246/0001-01` (primeiro da reserva ainda livre; os anteriores já estavam em uso por empresas `[QA]` de outras rodadas) tem DV válido, conferido por cálculo.
- **F10.** Com CNPJ `12.345.678/0001-95` (QA Alfa) e demais campos válidos: alerta "Já existe uma empresa com este CNPJ." no CNPJ, `aria-invalid` só nele, foco em `name=cnpj`. Dialog continuou aberto; cancelado em seguida, nada gravado.
- **F11.** Editar `[QA] FormField`: título "Editar empresa", 0 `*`, sem `aria-describedby`, sem legenda, CNPJ `13.579.246/0001-01`. Nome fantasia apagado: só "Nome fantasia" ganha `*`, 0 alertas. Cancelar e reabrir: Nome fantasia `[QA] FormField`, 0 `*`.
- **F12.** Complemento "Sala 42" + "Salvar alterações": toast "Empresa atualizada.", Dialog fechou. Consulta: `select ... from company where id=21` → `complement = 'Sala 42'`.

Limpeza: `[QA] FormField` (id 21) desativada pela interface ("Empresa desativada."); consulta confirma `is_active = false`. Nenhuma outra empresa foi alterada.

Console e servidor: `get_errors` do `next-devtools` devolveu `configErrors: []` e `sessionErrors: []` após a abertura, após o fluxo de criação/edição e no fim. Console do navegador (`all`): 4 mensagens, 0 erros, 0 avisos, só o INFO do React DevTools e o `[HMR] connected`; nenhum aviso do Radix sobre `Description`/`aria-describedby`.

## Falhas

Nenhuma.

## Erros fora dos cenários

Nenhum.

## Não executados

Nenhum. Não houve cenário com e-mail nesta bateria.

## Observações

- O grupo dos Dias renderiza com `role="toolbar"` (padrão do `ToggleGroup` do primitivo), não `role="group"` como a seção 7 do contrato descreve. O `aria-labelledby` para "Dias" e a ausência de `aria-required` estão corretos; é só divergência de redação do contrato (ARIA 1.2 também não permite `aria-required` em `toolbar`). Para o `df-architect` decidir se ajusta o texto.
- O rótulo "Dias" é um `data-slot=field-label` sem `for` (é o `FieldTitle`); no DOM ele casa com `[data-slot=field-label]`, o que é coerente com o primitivo.
- O alerta de desativação é `alertdialog`, não `dialog`: seletores de teste devem usar `getByRole('alertdialog')`.
- Senha do Diretor usada apenas no login; não gravada em arquivo nem relatório. Screenshots em `.qa-output/state1.png` e `.qa-output/state2.png`.
