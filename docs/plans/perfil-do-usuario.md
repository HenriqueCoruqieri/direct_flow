# Plano — Perfil do usuário

Aprovado em 2026-09-24 via `/consult`. Não há artboard de perfil no Figma; o visual adapta a linguagem das telas existentes (cards do Início: raio 18px, `surface`, borda `border-subtle`).

## Decisões fixadas pelo usuário

| Tema                          | Decisão                                                                                                                                                                                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Acesso                        | Item "Perfil" no menu do card do usuário (`app/(app)/_components/user-menu.tsx`), entre "Tema" e "Sair"; vale também no mobile (avatar do cabeçalho abre o mesmo menu)                                                                         |
| URL                           | `/perfil`, no grupo `(app)`, com sidebar; nenhum item da sidebar ativo                                                                                                                                                                         |
| Layout                        | Página única em seções: topo (avatar 96px, nome, "Setor · Papel", botões "Alterar foto" e "Remover"); "Dados da conta" somente leitura com aviso "Para alterar, fale com o administrador do setor"; "Segurança" com formulário de senha inline |
| Campos exibidos               | Nome, e-mail, setor, papel, situação (ativo), membro desde (`created_at`), último acesso (`last_login_at`). Fora: `email_verified`                                                                                                             |
| O que o usuário altera        | Só a própria senha e o avatar. Demais dados: admin do setor, na futura gestão de usuários (fora deste plano)                                                                                                                                   |
| Troca de senha                | Exige senha atual; revoga as **outras** sessões e mantém a atual; envia e-mail "Sua senha foi alterada"                                                                                                                                        |
| Armazenamento                 | Cloudflare R2, compatível com S3, via `@aws-sdk/client-s3`. Dois buckets: `avatars` **público** (URL estável em `users.image`) e `attachments` **privado** (URL assinada, entra na feature de anexos, não aqui)                                |
| Envio do avatar               | Navegador recorta o centro em quadrado, reduz a 256×256 WebP (PNG aceito como fallback do Safari) e envia por Server Action; cabe no limite padrão de 1 MB, sem mexer em `next.config.ts`, sem processamento de imagem no servidor             |
| Chave no bucket               | `avatars/<userId>/<id aleatório>.<ext>`; cada envio gera chave nova e apaga o anterior (cache-busting)                                                                                                                                         |
| Remover foto                  | Sim: apaga o arquivo no R2 e zera `users.image`                                                                                                                                                                                                |
| Dono de `app/_lib/storage/**` | `df-data` (agente separado só se um dia for necessário)                                                                                                                                                                                        |

## Escopo

**Entra**: item de menu, tela `/perfil`, avatar com upload/remoção no R2 e exibição (`AvatarImage` com fallback para iniciais) na sidebar, no cabeçalho mobile e no perfil; troca de senha com e-mail de aviso.

**Fora**: edição de dados por admin (gestão de usuários, que herda ADRs 003 e 008); bucket `attachments` e anexos; editor de recorte.

## Impacto no contrato

- Schema: sem mudança (`users.image` já existe). Migration: nenhuma.
- `app/_lib/types/user.ts`: `UserProfile` ganha `image: string | null`, `isActive`, `createdAt`, `lastLoginAt`.
- `app/_lib/domain/avatar.ts` (novo, puro): tamanho 256px, limite de bytes, tipos aceitos — mesma regra no navegador (redução) e na action (validação).
- `app/_lib/validation/`: extrair a regra de força de senha hoje dentro de `resetPasswordSchema` para um campo único reutilizável (DRY); `changePasswordSchema` (atual, nova, confirmação; nova ≠ atual); `avatarFileSchema` (arquivo, tipo, tamanho).
- `df-data`: `getUserProfile` com os campos novos; `updateUserImage(userId, url | null)`; `app/_lib/storage/avatars.ts` com `uploadAvatar(userId, file) → { url }` e `deleteAvatarByUrl(url)` (chave derivada da URL pública).
- `df-auth`: `changeUserPassword(input)` em `app/_lib/auth/`, chamando `auth.api.changePassword` com `revokeOtherSessions: true`; devolve `INVALID_CURRENT_PASSWORD` em senha atual errada.
- `df-actions`: `app/_lib/actions/profile.ts` com `changePassword`, `updateAvatar`, `removeAvatar`.
- `df-email`: `sendPasswordChangedEmail` + template.
- Docs: `docs/contracts/profile.md`; ADR 010 "Armazenamento de arquivos no Cloudflare R2" (dois buckets, chave, redução no navegador, envio por Server Action); ADR 007 atualizado com `changeUserPassword` como terceiro ponto de chamada sem limite de tentativas.
- `.env.example`: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_AVATARS_BUCKET`, `R2_AVATARS_PUBLIC_URL` (sem barra final).
- Regras (`.claude/**`, aprovadas pelo usuário, editadas pelo orquestrador): `stack.md` §2 com a seta `actions → storage` (storage não importa outras camadas) e §7 com `app/_lib/storage/**` → `df-data`; `df-data.md` com `@aws-sdk/client-s3` nos pacotes e `app/_lib/storage/**` no ownership.

## Ondas e agentes

- **Pré-requisito (usuário)**: buckets e token no R2 e `.env` preenchido — feito em 2026-09-24.
- **Onda 0**: orquestrador (regras em `.claude/**`) · `df-architect` (contrato, ADR 010, ADR 007, tipos, validação, domínio, `.env.example`).
- **Onda 1 (paralelo)**: `df-data` (instala `@aws-sdk/client-s3`; storage, `getUserProfile`, `updateUserImage`) · `df-auth` (`changeUserPassword`) · `df-email` (template e envio) · `df-ui` (item "Meu perfil", `UserAvatar` com `image` e `AvatarImage`, sidebar e cabeçalho passando a foto, `/perfil` com topo e "Dados da conta").
- **Onda 2 (paralelo)**: `df-actions` (`changePassword`: valida, chama auth, e-mail após sucesso, falha de e-mail só loga; `updateAvatar`/`removeAvatar`: valida, storage, `df-data`, apaga o antigo, revalida o layout) · `df-ui` (upload com redução no navegador, "Alterar foto"/"Remover", formulário de senha com React Hook Form + Zod, toast, limpa campos).
- **Onda 3**: `df-reviewer` · `df-debug` (sessão atual sobrevive à troca e as outras caem; upload e remoção reais no R2).

## Riscos

1. Safari e WebP: `canvas.toBlob` pode devolver PNG; a action aceita WebP e PNG e grava com a extensão real.
2. `changePassword` sem limite de tentativas (chamada direta pula o limitador do Better Auth) — registrado no ADR 007; exige sessão aberta.
3. `revokeOtherSessions` renova o token; o `nextCookies` precisa gravar o cookie novo — `df-debug` confere.
4. Arquivo órfão no R2 se a exclusão do antigo falhar após o update no banco — custo desprezível, fica em log.
5. Credenciais do R2 ausentes ou erradas: upload falha com erro genérico; o resto do perfil funciona.

## Critério de pronto

- "Meu perfil" entre "Tema" e "Sair" (desktop e mobile) leva a `/perfil` com sidebar.
- Os 7 campos com valores reais; datas via `@/app/_lib/date`.
- Trocar foto grava no R2 e atualiza perfil, sidebar e cabeçalho sem recarregar; o arquivo antigo some do bucket. "Remover" volta às iniciais e apaga o arquivo.
- Senha atual errada: erro no campo, nada muda. Certa: senha muda, sessão atual continua, outras caem, e-mail chega.
- `tsc`, lint e build passam; `df-reviewer` sem bloqueante.
