# Relatório de testes — Cadastros → Empresas (Etapa 2: editar, desativar, reativar)

- **Data:** 2026-11-06
- **Contrato:** `docs/contracts/registry-companies.md`
- **Commit:** `1691eec` · alterações não comitadas: sim (a Etapa 2 está no working tree)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 14 de 14 passaram · 0 falharam · 0 bloqueados · 0 não executados

## Pré-requisitos

- Dev server no ar (`/login` respondeu 200). MCP `playwright`, `next-devtools` e `postgres` respondendo (`SELECT 1` ok).
- Contas informadas pelo comando: Diretor `diretorqa@gmail.com` (já havia sessão aberta no navegador, sem novo login), Administrador `cazalbe@gmail.com` e Membro `rodalv@gmail.com` (uma tentativa cada, ambas entraram). As senhas não constam aqui.
- Estado inicial do banco conferido: ids 1–3 (seed: Alfa ativa, Beta ativa, Gama inativa) e ids 4, 5, 9, 10 (`[QA]`, todas ativas).
- Divergência de e-mail em relação à tabela "Usuários de teste" do agente: o comando passou outras contas; usei as do comando.

## Cenários

| #                 | Cenário                                                | Papel                | Status |
| ----------------- | ------------------------------------------------------ | -------------------- | ------ |
| E1                | Coluna de ações com Ativo e Inativo                    | Diretor              | PASSOU |
| E2                | Dialog "Editar empresa" preenchido (id 4)              | Diretor              | PASSOU |
| E3                | Editar nome fantasia e cidade                          | Diretor              | PASSOU |
| E4                | Apagar e recriar o Secundário                          | Diretor              | PASSOU |
| E5                | Limpar dias e horários                                 | Diretor              | PASSOU |
| E6                | CNPJ de empresa ativa, de inativa e o próprio          | Diretor              | PASSOU |
| E6b               | Trocar CNPJ do id 9 para o reserva                     | Diretor              | PASSOU |
| E7                | Editar QA Alfa (seed) e cancelar                       | Diretor              | PASSOU |
| E8                | Desativar `[QA] Empresa Mínima` (Cancelar e confirmar) | Diretor              | PASSOU |
| E9                | Reativar `[QA] Empresa Mínima`                         | Diretor              | PASSOU |
| E10               | Desativar a Alfanumérica e editar inativa              | Diretor              | PASSOU |
| E11               | `/registry/companies` por Admin e Membro               | Admin, Membro        | PASSOU |
| E12               | Estado final: ids 4, 5, 9, 10 inativos, seed intacto   | Diretor              | PASSOU |
| E13               | Sem erro/hidratação no dev server                      | Diretor/Admin/Membro | PASSOU |
| Regressão Etapa 1 | "Nova empresa" abre vazio depois de abrir edição       | Diretor              | PASSOU |

## Evidências por cenário

- **E1** (screenshot `.qa-output/e1-lista.png`): com Ativo e Inativo marcados, as 6 linhas ativas mostram "Editar|Desativar" e `QA Gama` (inativa) mostra "Editar|Reativar". Os botões ficam na mesma posição horizontal em todas as linhas (x=1123 e x=1203). Nenhuma ação de excluir.
- **E2**: título "Editar empresa", subtítulo "Campos com * são obrigatórios."; CNPJ `11.222.333/0001-81`, CEP `01310-100`, primário `(11) 3333-4444`, secundário `(11) 98765-4321`, contato do responsável `(11) 98888-7777`, UF `SP — São Paulo`, complemento `Sala 12`, Seg a Sex com `data-state=on` (Sáb e Dom off), `08:00` e `18:00`; rodapé "Cancelar" e "Salvar alterações".
- **E3**: toast "Empresa atualizada."; linha passou a `[QA] Empresa Completa 2`, `Santo André / SP`. SQL `select ... from company where id=4`: `trade_name='[QA] Empresa Completa 2'`, `city='Santo André'`, `updated_at` foi de `2026-11-06 23:38:41` para `2026-11-07 02:13:48`. Os contatos tiveram `updated_at` regravado (02:13:48).
- **E4**: Secundário apagado → toast "Empresa atualizada."; `company_contact` do id 4 ficou só com `primary:1133334444`. Depois digitado `11977665544` (máscara exibiu `(11) 97766-5544`) → `secondary:11977665544` de volta (nova linha id 14).
- **E5**: desmarcados Seg a Sex e apagados Das/Às → toast "Empresa atualizada."; `business_days`, `opens_at`, `closes_at` nulos (`notes` mantida).
- **E6**: CNPJ `12.345.678/0001-95` → erro no campo "Já existe uma empresa com este CNPJ."; `45.678.901/0001-75` → "Já existe uma empresa inativa com este CNPJ." (sem "Reative-a…"). Nos dois: foco no input do CNPJ, Dialog aberto, zero toast. Banco: id 4 continuou `11222333000181`; ids 1 e 3 intactos (`updated_at` do seed inalterado). Voltando ao próprio CNPJ → "Empresa atualizada." e Dialog fechou (`updated_at` 02:14:32).
- **E6b**: id 9 → `24.681.357/0001-40`, toast "Empresa atualizada."; tabela mostra `24.681.357/0001-40`; banco `cnpj='24681357000140'`.
- **E7**: `QA Alfa` abre com CNPJ `12.345.678/0001-95`, CEP `01310-100`, primário `(11) 3333-4444`, secundário `(11) 99888-7777`, complemento `Sala 101`. Alterado o nome para "QA Alfa ALTERADO", Cancelar, reabrir → "QA Alfa". Banco: id 1 com `trade_name='QA Alfa'` e `updated_at` original (`2026-11-06 23:29:28`).
- **E8**: dialog "Desativar [QA] Empresa Mínima?" com o texto "A empresa sai da lista de ativas. Os dados ficam guardados e você pode reativá-la depois."; botões Cancelar/Desativar. Cancelar: linha continua Ativo e banco `is_active=true`, `updated_at` inalterado. Confirmar: toast "Empresa desativada."; banco `is_active=false`. Depois de recarregar a página (filtro padrão Ativo) a linha não aparece; ao marcar Inativo aparece com badge "Inativo". (Antes do reload ela seguia na lista porque o filtro Inativo estava marcado na sessão.)
- **E9**: "Reativar" → toast "Empresa ativada."; badge Ativo; banco `is_active=true`.
- **E10**: id 10 desativada (toast "Empresa desativada."); com Inativo visível, Editar → cidade `Contagem` → toast "Empresa atualizada."; badge continua Inativo; banco `city='Contagem'`, `is_active=false`.
- **E11**: Admin (`cazalbe@gmail.com`, Suporte) e Membro (`rodalv@gmail.com`, Suporte) abrindo `/registry/companies` pela URL: HTTP 404 nos dois. Menu do Membro sem "Cadastros".
- **E12**: SQL final `select id, trade_name, is_active from company order by id`: ids 4, 5, 9, 10 com `is_active=false`; id 1 e 2 `true`, id 3 `false`; `updated_at` do seed (ids 1–3) ainda `2026-11-06 23:29:28`.
- **E13**: `get_errors` (next-devtools) devolveu `configErrors:[]` e `sessionErrors:[]` após cada bloco e no fim; console do navegador sem erro ou aviso na sessão atual.
- **Regressão Etapa 1**: depois de abrir "Editar", digitar "lixo" no nome fantasia e Cancelar, o Dialog "Nova empresa" abriu com todos os campos vazios, UF "Selecione", nenhum dia marcado, título "Nova empresa", botão "Salvar empresa". Clicar em Salvar com tudo vazio mostrou 13 erros (os 13 obrigatórios). Nenhuma empresa criada.

## Falhas

Nenhuma.

## Erros fora dos cenários

- O log do dev server (`.next/dev/logs/next-development.log`) tem erros de compilação às 11:30:17–11:30:58 ("Export setCompanyActive/updateCompany doesn't exist in target module"). São do hot-reload no meio da implementação (actions ainda sem exportar), anteriores ao início deste teste (primeira navegação às ~11:35) e ao último `Compiled` das 11:31:20. Não reapareceram.
- O console do navegador acumulado da sessão (`all: true`) traz esses mesmos erros e quatro `404` em `/registry/companies`, esses últimos esperados (testes de acesso negado de rodadas anteriores).
- Log de rodadas anteriores: `unhandledRejection: Error: Invalid element at key "email": expected a Zod schema` às 08:48 (antes desta rodada, sem relação com os cenários E).

## Não executados

Nenhum. Não testáveis pelo navegador, conforme o contrato (ficam para o `df-debug`): `FORBIDDEN` da action para não-diretor, `NOT_FOUND` por id inexistente, corrida de CNPJ.

## Observações

- Cada salvamento de edição reescreve o `updated_at` do contato primário (upsert), mesmo sem mudança no telefone. É o comportamento descrito no contrato (passo 2 de `updateCompany`); registrado só como fato.
- Uma sessão de Membro (`rodalv@gmail.com`) ficou aberta no navegador ao fim, com a janela mantida aberta.
- Empresas `[QA]` terminam desativadas e com os nomes/CNPJs alterados: id 4 = `[QA] Empresa Completa 2` (cidade Santo André, sem expediente, secundário `11977665544`), id 9 CNPJ `24681357000140`, id 10 cidade Contagem. O seed (ids 1–3) não foi alterado.
