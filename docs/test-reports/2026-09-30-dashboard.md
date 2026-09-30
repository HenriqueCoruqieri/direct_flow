# Relatório de testes — Dashboard Início

- **Data:** 2026-09-30
- **Contrato:** `docs/contracts/dashboard.md`
- **Commit:** `8845545` · alterações não comitadas: sim (só infraestrutura de teste: `.claude/**`, `.mcp.json`, `.env.example`, `.gitignore`, `db/seed.ts`; nenhum código da aplicação)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento (Neon)
- **Resultado:** 11 de 12 passaram · 1 falhou · 0 bloqueados · 0 não executados

## Pré-requisitos

- Dev server: `/login` respondeu 200.
- MCP `playwright` e `next-devtools` disponíveis (servidor descoberto na porta 3000).
- Usuários de teste existem e estão ativos: diretor (Diretoria), `qa.admin.suporte`, `qa.member.suporte` (QA Suporte), `qa.admin.infra` (QA Infra).
- `RESEND_API_KEY` está preenchida. Não afeta esta feature (sem e-mail).
- Gabarito: a demo da Diretoria tem 29 chamados, todos de 02/08 a 24/09. Hoje (30/09) e a semana atual não têm chamado, então `hoje` e `semana` esperam 0 e `—`. Contagens feitas por leitura direta no banco, com `America/Sao_Paulo` e `[start, end)`.

## Cenários

| #   | Cenário                                                                                                                                                                                                                                                                                                                     | Papel                             | Status |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------ |
| 1   | Caminho feliz: `/dashboard` abre em `hoje`; `hoje` 0 e `—`, `semana` 0 e `—` (28 set – 4 out 2026), `mes` 22 e `DIRETORIA_ACESSO_SISTEMAS` 7 chamados (1–30 set 2026). Bate com o banco                                                                                                                                     | Diretor                           | PASSOU |
| 2   | Personalizado por URL contra o banco: 21–21 set = 3 (1 chamado na tag topo); 21–24 = 15 (6); 24–24 = 5 (4); 1–31 ago = 7 (3); 31 ago–1 set = 2 (`Impressora` 1). O chamado de 31/08 22h SP (01/09 01:00Z) cai em agosto, não em setembro. Fuso e `[start, end)` corretos                                                    | Diretor                           | PASSOU |
| 3   | Parâmetros inválidos caem em `hoje`, status 200, sem erro: `periodo=foo`, `personalizado` sem datas, `de` só, `2026-02-30`, `ate < de`, `periodo=` vazio, `MES` maiúsculo, `periodo[]=mes`. `hoje&periodo=mes` usa o primeiro valor. `mes&de=abc` descarta `de` e mostra `mes`                                              | Diretor                           | PASSOU |
| 4   | Pílulas `Hoje`, `Semana`, `Mês` são links com a URL do contrato, e a pílula ativa acompanha o período (inclusive `Personalizado`). Clique em `Semana` navega para `?periodo=semana`                                                                                                                                         | Diretor                           | PASSOU |
| 5   | Calendário, clique único em 24/09 + Aplicar: URL `de=2026-09-24&ate=2026-09-24`, subtítulo `24 set 2026`, cards 5 e 4 chamados. Aplicar fica desabilitado antes da seleção                                                                                                                                                  | Diretor                           | PASSOU |
| 6   | Calendário, intervalo 31/08 a 01/09 + Aplicar: URL correta, 2 chamados, `Impressora`. Reabrir mostra a seleção atual. Cancelar fecha sem alterar a URL                                                                                                                                                                      | Diretor                           | PASSOU |
| 7   | Calendário abre com a semana começando na segunda-feira (contrato, seção "Datas": `ptBR` dá "início da semana na segunda")                                                                                                                                                                                                  | Diretor                           | FALHOU |
| 8   | Isolamento por setor: `qa.member.suporte` vê 0 e `—` em `hoje`, `semana`, `mes` e num personalizado de 01/08 a 30/09. `qa.admin.infra` vê 0 e `—` em `mes`. Nenhum vê os 29 chamados da Diretoria. Cabeçalho mostra `QA Suporte · Membro` / `QA Infra · Administrador`                                                      | Membro QA Suporte, Admin QA Infra | PASSOU |
| 9   | Shell desktop: sidebar com "Início", card `Henrique Coruqieri` / `Diretoria · Administrador`, iniciais `HC`, barra superior com busca (placeholder `Buscar por #, título ou tag`) e "Novo chamado". Menu do usuário com Tema e Sair; Sair leva a `/login`, e `/dashboard` sem sessão volta a `/login`                       | Diretor                           | PASSOU |
| 10  | Responsivo 390×844 (diretor e membro): sidebar oculta, cabeçalho mobile com avatar, `Olá, Henrique` e `Diretoria · Administrador`; sem rolagem horizontal (scrollWidth 390); pílulas, `Personalizado`, busca e "Novo chamado" visíveis; popover do calendário cabe na tela. Screenshot em `.qa-output/dashboard-mobile.png` | Diretor, Membro QA Suporte        | PASSOU |
| 11  | `get_errors` do `next-devtools` depois de cada bloco: `configErrors` e `sessionErrors` vazios. Console do navegador sem erro nem aviso                                                                                                                                                                                      | Todos                             | PASSOU |
| 12  | Validação da mensagem "A data final precisa ser igual ou posterior à inicial." na interface                                                                                                                                                                                                                                 | Diretor                           | PASSOU |

Observação sobre o cenário 12: a interface nunca mostra essa mensagem. O calendário não deixa montar `ate < de` e a URL inválida cai em `hoje` sem erro (cenário 3), que é o comportamento do contrato. Marcado como PASSOU pelo comportamento observado.

Não aplicáveis a esta feature (sem mutação nem e-mail): ciclo de vida do ticket e notificação por e-mail.

## Falhas

### #7 — Calendário começa a semana no domingo

- **Papel:** Diretor (`SEED_ADMIN_EMAIL`)
- **Passos:** 1. Login. 2. `/dashboard?periodo=personalizado&de=2026-09-21&ate=2026-09-24`. 3. Clicar em "Personalizado".
- **Esperado:** `docs/contracts/dashboard.md`, seção Datas: o `ptBR` serve para "nomes de mês e dia, início da semana na segunda". O período `semana` do dashboard também vai de segunda a domingo.
- **Obtido:** Cabeçalho do calendário `dom seg ter qua qui sex sab`, primeira linha de setembro começando em domingo 30/08. Nomes em português corretos. O calendário e o filtro `Semana` usam semanas diferentes.
- **Evidência:** snapshot `.qa-output/page-2026-09-30T22-08-48-820Z.yml` (colunas e linhas do grid). Nenhum erro em `get_errors`.
- **Camada provável:** app (prop do `Calendar` em `custom-period-picker.tsx`). O locale `ptBR` do `date-fns` tem `weekStartsOn = 0`, então o contrato pode ter partido de uma premissa errada.
- **Dono:** `df-ui` (se a segunda-feira for mesmo o desejado, o contrato precisa dizer como forçar; ver Observações para `df-architect`)

## Erros fora dos cenários

Nenhum.

## Não executados

Nenhum. Ciclo de vida e e-mail são não aplicáveis (ver acima).

## Observações

- A demo da Diretoria foi gerada em 24/09, então `hoje` e `semana` mostram 0 e `—` na data do teste. O caso em que `hoje` tem chamados e o teste de fuso "ontem 21h–23h59 já é hoje em UTC" só foram verificados por datas passadas (31/08 22h SP). Rodar o seed demo no mesmo dia do teste cobriria `hoje` e `semana` com dado.
- Ambiguidade para o `df-architect`: o contrato diz que o `ptBR` faz a semana começar na segunda, mas o locale do `date-fns` começa no domingo. Decidir se o contrato muda ou se a UI passa `weekStartsOn={1}`.
- O menu do usuário tem um item "Perfil" além de Tema e Sair. O contrato do dashboard só prevê Tema e Sair; o item vem de `docs/contracts/profile.md` e não foi avaliado aqui.
- O contrato diz que empate de tag desempata por nome. Não havia empate real nos dados dos períodos testados; a regra de desempate não foi exercitada.
- A tag de maior contagem na Diretoria tem nome `DIRETORIA_ACESSO_SISTEMAS`, não `Acesso` como o seed do contrato prevê. A tag já existia no setor (dado anterior ao seed demo). Sem impacto nos cálculos.
- Senhas não constam deste relatório.

## Reteste 1

- **Data:** 2026-09-30
- **Commit:** `8845545` · alterações não comitadas: sim (inclui a correção `WEEK_STARTS_ON` em `app/_lib/date.ts` e `custom-period-picker.tsx`)
- **Resultado:** 2 de 2 passaram

| #   | Cenário                                                                                                                                                                                                                                                                                               | Papel   | Status |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ |
| 7   | `/dashboard?periodo=personalizado&de=2026-09-21&ate=2026-09-24`, clique em "Personalizado": cabeçalho `seg ter qua qui sex sab dom`; primeira linha de setembro vai de 31/08 (segunda) a 06/09; seleção 21, 22, 23 e 24/09 continua marcada. Screenshot em `.qa-output/dashboard-calendar-retest.png` | Diretor | PASSOU |
| 1R  | Regressão do `weekStartKey`: `?periodo=semana` mostra `28 set – 4 out 2026`, 0 e `—`; `?periodo=mes` mostra `1–30 set 2026`, 22 chamados e `DIRETORIA_ACESSO_SISTEMAS` com 7. Iguais ao cenário 1                                                                                                     | Diretor | PASSOU |

`get_errors` ao final: `configErrors` e `sessionErrors` vazios.
