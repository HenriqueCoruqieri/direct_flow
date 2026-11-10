# Relatório de testes — FormField genérico, Etapa 2 (Setores, Pessoas, Tags, Perfil)

- **Data:** 2026-11-10
- **Contrato:** `docs/contracts/form-field.md` (cenários G1–G10)
- **Commit:** `2e01aa9` · alterações não comitadas: sim (os cinco arquivos da migração: `change-password-form.tsx`, `department-form-dialog.tsx`, `person-form-dialog.tsx`, `tag-form-dialog.tsx`, `combobox.tsx`)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 9 de 10 passaram · 0 falharam · 0 bloqueados · 1 parcial (G5, G9 e parte de G8 não executados por restrição do pedido; ver abaixo)

Papéis usados: Diretor (`diretorqa@gmail.com`, sessão já aberta) e Administrador do setor Suporte (`cazalbe@gmail.com`). Nenhum membro (M) foi usado, conforme o pedido. Nenhuma senha foi gravada aqui.

## Cenários

| #   | Cenário                                                                                                                                                                                                                                                                                                                | Papel | Status                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------- |
| G1  | Novo setor: `*` em "Nome do setor", dica visível, `*` fica com 1 caractere e some com 3, sem erro até salvar                                                                                                                                                                                                           | D     | PASSOU                                                  |
| G2  | Setores: salvar vazio (erro com foco, dica substituída); nome existente `suporte` (outra caixa) dá erro do servidor no campo, com foco                                                                                                                                                                                 | D     | PASSOU                                                  |
| G3  | Renomear setor: abre sem `*`; apagar o nome faz o `*` voltar, sem erro                                                                                                                                                                                                                                                 | D     | PASSOU                                                  |
| G4  | Nova pessoa: `*` em Nome, E-mail, Setor, sem `*` em Papel; `abc` mantém `*`, e-mail válido tira; Admin vê só Nome e E-mail, ambos com `*`                                                                                                                                                                              | D / A | PASSOU                                                  |
| G5  | Pessoa vazia: erro nos 3 obrigatórios, foco no primeiro; só Setor faltando: foco no Combobox; e-mail existente: erro do servidor com foco no e-mail (criar `[QA]` válida **não executado**, proibido pelo pedido)                                                                                                      | D     | PASSOU (parcial)                                        |
| G6  | Nova tag: `*` em Setor e Nome, sem `*` em Prioridade; salvar vazio dá erro nos dois, foco no Combobox de Setor; nome duplicado no setor dá erro com foco; criar `[QA] FormField` com "Sem prioridade" funciona                                                                                                         | D / A | PASSOU                                                  |
| G7  | Editar tag sem prioridade (`[QA] FormField`): abre sem nenhum `*`; apagar o nome traz o `*`; salvar vazio dá erro com foco; nome existente dá erro do servidor com foco; renomear válido salva e fecha                                                                                                                 | D     | PASSOU                                                  |
| G8  | Perfil: `*` nos 3 campos; somem ao preencher (Nova senha só com 8+); senhas diferentes: erro só ao salvar, em "Confirmar", com foco; senha atual errada (1 tentativa): "Senha atual incorreta." no campo, com foco. "Nova igual à atual" **não executado** (exigiria a senha real); executado como Diretor, não como M | D     | PASSOU (parcial)                                        |
| G9  | Trocar senha com sucesso                                                                                                                                                                                                                                                                                               | —     | NÃO EXECUTADO (proibido: "não troque senha de ninguém") |
| G10 | Inspeção dos 4 formulários: `aria-required` só nos obrigatórios, `aria-invalid`/`aria-describedby` coerentes, nenhuma legenda "Campos com \*…"                                                                                                                                                                         | D / A | PASSOU                                                  |

## Evidências (resumo por campo)

- **Setores (criar/renomear):** `input[name=name]` com `aria-required="true"`, `aria-describedby` = `…-description` (dica) na abertura; após salvar vazio vira `…-error`, `aria-invalid="true"`, dica sumiu, foco em `name`. Texto do erro: "Informe o nome do setor." Servidor (`suporte`): "Já existe um setor com esse nome. Se ele estiver inativo, reative-o em vez de criar outro.", foco em `name`, sem `*` (valor válido pelo schema). Renomear abre com `*` = 0.
- **Pessoas:** botão do Combobox de Setor com `aria-required="true"`, label "Setor *" ligado por `for`/`id`; Papel sem `aria-required` e sem `*`. Salvar vazio: 3 `aria-invalid="true"` apontando para `…-error`, foco em `name`. Com Nome e E-mail válidos e Setor vazio: foco em `_r_2_-control` (`role=combobox`). `*` do Setor some ao escolher "QA Suporte". `cazalbe@gmail.com` (existente): "Já existe uma pessoa com esse e-mail.", foco em `email`. Edição (QA Diretor, Diretoria): 0 `*`, 3 `aria-required` (Nome, E-mail, Setor), Papel desabilitado com a dica "Na Diretoria o papel é sempre Administrador."; apagar o nome traz o `*` sem erro; e-mail existente na edição: erro e foco em `email`.
- **Tags:** salvar vazio: erros "Selecione o setor." e "Informe o nome da tag.", foco no Combobox de Setor, dica do nome substituída pelo erro. Nome `[qa] acesso` (existe `[QA] Acesso` no QA Suporte): "Já existe uma tag com esse nome neste setor.", foco em `name`. Criação `[QA] FormField` sem prioridade: Dialog fechou, linha "Ativo / — / 0". Edição: `aria-required` só no nome; Prioridade com `aria-describedby` da dica, sem `*`. Consulta de conferência: `SELECT id,name,is_active,priority FROM tag WHERE name ILIKE '[QA] FormField%'` → `id 42, "[QA] FormField editada", is_active=false, priority=null`.
- **Perfil:** 3 `*` na abertura, `aria-required="true"` nos 3, labels ligados (`profile-current-password` etc.). Atual preenchida: 2 `*`; Nova com `abc`: 2 (Nova e Confirmar); Nova com 8+: 1 (Confirmar); Confirmar com texto diferente: 0 `*` e 0 alertas até salvar. Ao salvar: "As senhas não conferem." sob Confirmar, foco em `profile-confirm-password`. Corrigido o Confirmar e salvo com atual errada: "Senha atual incorreta.", `aria-invalid` só em `profile-current-password`, foco nele, sem toast, valores mantidos. Campos esvaziados ao fim; nenhum campo preenchido capturado em snapshot.
- **`get_errors` (next-devtools):** `{"configErrors":[],"sessionErrors":[]}` após Setores, Pessoas, Tags e ao fim do papel Admin. **Console do navegador:** 0 erros e 0 avisos (`browser_console_messages`, nível warning, sessão inteira). Nenhum aviso de `Description` do Radix.
- **Nenhuma legenda** "Campos com \*…" em nenhum dos formulários (regex `/obrigat/i` sem ocorrência nos textos de Setores, Pessoas e Perfil; textos de Tags conferidos por leitura).

## Falhas

Nenhuma.

## Erros fora dos cenários

Nenhum.

## Não executados

- **G5, parte "criar `[QA]` válida":** o pedido proíbe criar pessoas. A validação de erros e de e-mail duplicado foi coberta.
- **G8, "nova igual à atual → erro":** exigiria digitar a senha real como Atual e Nova; evitado por segurança. Executado como Diretor, não como Membro.
- **G9 (troca de senha com sucesso e restauração):** proibido pelo pedido.
- **Criar setor válido / renomear com sucesso:** proibido (não criar setores). Cobertos apenas abertura, validação e erro do servidor.

## Observações

- **Dados alterados:** criada a tag `[QA] FormField` (QA Suporte, id 42), renomeada para `[QA] FormField editada` e **desativada** ao final. Nenhum setor, pessoa ou senha foi criado ou alterado. Duas tentativas de salvar com e-mail existente (Pessoas, criação e edição) e uma com nome de setor existente foram recusadas pelo servidor sem gravar nada.
- **Ambiguidade do contrato (G4/G6 "D / A"):** para o Administrador de setor, "Nova pessoa" mostra só Nome e E-mail (sem Setor e sem Papel) e "Nova tag" mostra só Nome e Prioridade (sem Setor). O contrato descreve `*` em Setor "para D / A"; pelo comportamento atual o setor do Admin é fixo e o campo não aparece. Parece intencional (escopo por setor), mas o `df-architect` pode confirmar e ajustar o texto de G4/G6.
- **Sessão:** a janela do navegador ficou aberta, logada como Administrador (`cazalbe@gmail.com`).
- **Ordem de execução:** o Diretor foi testado primeiro; o Admin só nos formulários de Pessoas e Tags (abertura e validação).
