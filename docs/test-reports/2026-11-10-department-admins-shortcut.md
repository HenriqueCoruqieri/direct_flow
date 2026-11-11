# Relatório de testes — Administradores na edição do setor

- **Data:** 2026-11-10
- **Contrato:** `docs/contracts/department-admins-shortcut.md`
- **Commit:** `200d7a9d9c` · alterações não comitadas: sim
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 10 de 19 passaram · 0 falharam · 0 bloqueados · 9 não executados

Escopo combinado com o usuário: escrita só no setor "QA Suporte" (marcar e desmarcar admins, renomear e voltar). Cenários que exigem outra aba/sessão, payload forjado ou alteração de outros setores e pessoas ficaram fora.

## Estado inicial e final (leitura via MCP `postgres`)

| Item                           | Antes           | Depois          |
| ------------------------------ | --------------- | --------------- |
| `department` 18 `name`         | `QA Suporte`    | `QA Suporte`    |
| `users` 13 (QA Admin Suporte)  | `role = admin`  | `role = admin`  |
| `users` 14 (QA Membro Suporte) | `role = member` | `role = member` |

Só mudaram `updated_at` (esperado): `department` 18 e `users` 13 e 14. Nenhum outro setor, pessoa, senha ou conta foi gravado. Nenhum setor foi criado.

## Cenários

| #   | Cenário                                     | Papel          | Status           |
| --- | ------------------------------------------- | -------------- | ---------------- |
| A1  | "Novo setor" só com nome                    | Diretor        | PASSOU           |
| A2  | Editar setor comum: membros, admin marcado  | Diretor        | PASSOU           |
| A3  | Trocar dois papéis, salvar                  | Diretor        | PASSOU           |
| A4  | Renomear e trocar papel juntos              | Diretor        | PASSOU           |
| A5  | Nome duplicado + troca de papel             | Diretor        | PASSOU           |
| A6  | Desmarcar todos: aviso e grava              | Diretor        | PASSOU           |
| A7  | Editar Diretoria                            | Diretor        | PASSOU           |
| A8  | Editar Não alocado                          | Diretor        | PASSOU           |
| A9  | Editar setor inativo                        | Diretor        | PASSOU (parcial) |
| A10 | Setor ativo sem ninguém                     | Diretor        | PASSOU (parcial) |
| A11 | Membro desativado/movido em outra aba       | Diretor        | NÃO EXECUTADO    |
| A12 | Membro movido para o setor em outra aba     | Diretor        | NÃO EXECUTADO    |
| A13 | Rebaixado vê "Cadastros" sumir              | Admin do setor | NÃO EXECUTADO    |
| A14 | Promovido vê "Cadastros" aparecer           | Membro         | NÃO EXECUTADO    |
| A15 | Admin e membro em `/registry/departments`   | Admin, Membro  | PASSOU           |
| A16 | `renameDepartment` forjado por admin        | Admin          | NÃO EXECUTADO    |
| A17 | `admins` forjado para Diretoria/Não alocado | Diretor        | NÃO EXECUTADO    |
| A18 | `adminIds` fora de `memberIds`              | Diretor        | NÃO EXECUTADO    |
| A19 | Sem `*` no "Administradores"                | Diretor        | PASSOU           |

Verificações adicionais do foco combinado:

| Item                                                                                     | Status                                                  |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Botão "Editar" (`aria-label` `Editar {nome}`) em todas as linhas e título "Editar setor" | PASSOU                                                  |
| Descrição, rótulo, descrição do campo e textos de nota                                   | PASSOU (textos idênticos ao contrato)                   |
| `role=group` com `aria-labelledby` -> "Administradores"                                  | PASSOU                                                  |
| Foco no primeiro checkbox quando o grupo tem erro                                        | NÃO EXECUTADO (erro do grupo só vem de payload forjado) |
| Foco no campo nome em `NAME_TAKEN`                                                       | PASSOU                                                  |
| `MEMBERS_CHANGED` (toast e fechamento)                                                   | NÃO EXECUTADO                                           |

## Evidências

- **A1:** Dialog "Novo setor" com só "Nome do setor *", zero checkboxes, sem "Administradores". Aberto e cancelado, nada criado. `.qa-output/a1-novo-setor.png`.
- **A2/A19:** "Editar QA Suporte": título "Editar setor", checkbox de QA Admin Suporte `aria-checked=true`, de QA Membro Suporte `false`, nome e e-mail por linha, sem `*` no grupo. `.qa-output/a2-qa-suporte.png`.
- **A3:** trocou os dois (13 virou member, 14 virou admin), toast `Setor atualizado.`, Dialog fechou. SQL `select id,role,updated_at from users where department_id=18`: 13 `member`, 14 `admin`, os dois com `updated_at 2026-11-10 23:49:01.99`; `department.updated_at` igual. Em Cadastros -> Pessoas os papéis aparecem coerentes com o banco no estado final.
- **A4:** nome `QA Suporte Renomeado` com papéis revertidos; toast `Setor atualizado.`; `department.name = QA Suporte Renomeado`, 13 `admin`, 14 `member`, `updated_at 23:49:17.491` nos três.
- **A5:** com a troca marcada e nome `suporte` (existente): Dialog permaneceu aberto, mensagem "Já existe um setor com esse nome. Se ele estiver inativo, reative-o em vez de criar outro." no campo nome, `aria-invalid=true`, foco no nome, sem toast. Banco inalterado (13 `member`, 14 `admin`, `updated_at` anteriores `23:49:01.99`, nome `QA Suporte`).
- **A6:** aviso "Sem administrador, só a Diretoria gerencia as pessoas e as tags deste setor e distribui os chamados dele." aparece ao desmarcar o único admin, antes de salvar, e some ao remarcar. Salvo com zero: 13 e 14 `member`; `updated_at` do 14 permaneceu `23:49:17.491` (só quem mudou foi atualizado). `.qa-output/a6-warning.png`, `.qa-output/a19-zero.png`.
- **A7:** Diretoria: sem checkbox, nota "Na Diretoria todas as pessoas são sempre administradoras." `.qa-output/a-diretoria.png`.
- **A8:** Não alocado: sem checkbox, nota "Quem está em Não alocado não administra nenhum setor. Para mudar o papel, realoque a pessoa em Cadastros → Pessoas." `.qa-output/a-naoalocado.png`.
- **A9 (parcial):** `[QA] Setor inativo`: sem campo e sem nota. Salvar o renome não foi testado (escrita fora do QA Suporte).
- **A10 (parcial):** P&D (0 pessoas ativas): "Administradores" + "Nenhuma pessoa ativa neste setor." Salvar o renome não foi testado (escrita fora do QA Suporte).
- **A15:** `cazalbe@gmail.com` (Administrador) e `rodalv@gmail.com` (Membro, "Suporte · Membro"): `/registry/departments` responde HTTP 404 e título "404: This page could not be found."; o item Setores não está no menu do admin.
- **`get_errors`:** `{"configErrors":[],"sessionErrors":[]}` após A1, e de novo no fim.
- **Console:** 3 erros `Failed to load resource ... 404` em `/registry/departments`, todos das visitas de admin/membro (esperados no A15). Nenhum aviso de hydration.

## Falhas

Nenhuma.

## Erros fora dos cenários

Nenhum.

## Não executados

- **A11, A12 / `MEMBERS_CHANGED`:** exigem desativar ou mover pessoas em outra aba, o que altera pessoas fora do que foi autorizado (marcar/desmarcar admins no QA Suporte).
- **A13, A14:** exigem login com as contas QA (a senha `SEED_QA_PASSWORD` fica no `.env`, que não foi lido por instrução) e mudar o papel de contas reais de outras sessões.
- **A16, A17, A18:** exigem chamar a Server Action com payload forjado; a UI não gera esse payload e não há ferramenta de escrita fora da interface.
- **Foco no primeiro checkbox em erro do grupo:** o erro de `admins.adminIds` só acontece com payload forjado (A18). Não há tratamento de foco no `department-admins-field.tsx`; o foco depende do `ref` repassado pelo `FormField`, não confirmado em execução.
- **A9/A10 salvar renome:** exigiria gravar em setores fora do QA Suporte.

## Observações

- Na edição, o campo "Nome do setor" abre sem `*` (a marca depende do valor preenchido, como no `FormField` compartilhado); na criação, com o campo vazio, aparece `*`. Comportamento coerente com o componente; sem ambiguidade de contrato.
- O navegador já abriu com uma sessão de Membro ("Suporte · Membro", Álvaro) e a visita a `/registry/departments` nela também deu 404; saí e entrei como Diretor para os testes.
- Sessão final do navegador: membro `rodalv@gmail.com` logado; janela deixada aberta.
