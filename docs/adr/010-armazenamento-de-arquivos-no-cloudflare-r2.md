# 010 — Armazenamento de arquivos no Cloudflare R2

## Contexto

O perfil do usuário passa a ter foto, e a feature de anexos de chamado vem logo
depois. O banco guarda só a referência ao arquivo (`users.image`, e mais tarde
`attachment`), então o arquivo precisa de um lugar fora do Postgres.

Os dois casos têm exposição oposta. A foto de perfil aparece em toda tela para
qualquer usuário logado e não é sigilosa. O anexo de chamado pode conter dado
interno de setor e só pode ser lido por quem tem acesso ao chamado.

Restrições do projeto que pesam na escolha:

- Server Action tem limite padrão de 1 MB no corpo
  (`node_modules/next/dist/docs/01-app/02-guides/server-actions.md:83`), e
  mutação da interface é sempre Server Action (seção 3 do `stack.md`).
- Nenhuma biblioteca de processamento de imagem no servidor está na stack.
- Uma camada não pode crescer para dentro da outra (seção 2 do `stack.md`).

## Decisão

**Provedor.** Cloudflare R2, pela API compatível com S3, via
`@aws-sdk/client-s3`. Endpoint `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`,
região `auto`.

**Dois buckets, com exposição diferente.**

| Bucket        | Acesso                                    | URL gravada no banco                               | Entra em          |
| ------------- | ----------------------------------------- | -------------------------------------------------- | ----------------- |
| `avatars`     | público (domínio `r2.dev` ou customizado) | URL pública estável, em `users.image`              | Perfil do usuário |
| `attachments` | privado                                   | só a chave; leitura por URL assinada de curta vida | Anexos de chamado |

O bucket privado não é criado nem configurado nesta feature.

**Chave.** `avatars/<userId>/<id aleatório>.<ext>`. Cada envio gera uma chave nova
e apaga a anterior depois de o banco apontar para a nova. A URL muda a cada troca,
então nenhum cache (navegador, CDN) serve a foto antiga: o cache-busting sai da
chave, sem query string. A extensão vem do tipo real do arquivo (`webp` ou `png`),
pela tabela `AVATAR_EXTENSIONS` de `app/_lib/domain/avatar.ts`.

**Redução no navegador.** O cliente recorta o centro em quadrado, reduz para
256×256 em canvas e exporta WebP (PNG quando o navegador não codifica WebP, caso
do Safari antigo). O arquivo final fica muito abaixo de 1 MB — o limite do
domínio é 512 KB, e um PNG RGBA de 256×256 sem compressão nenhuma tem 256 KB de
pixels —, então o limite da Server Action não é tocado e o servidor não processa
imagem. O servidor **valida** tipo e tamanho com o mesmo `avatarFileSchema` e não
confia no cliente.

**Conteúdo conferido pela assinatura.** O tipo declarado no `File` é escolha do
cliente: o `df-debug` publicou no bucket um arquivo de texto declarado
`image/png`. A action lê os primeiros bytes com `detectAvatarMimeType`
(`app/_lib/domain/avatar.ts`) — PNG `89 50 4E 47 0D 0A 1A 0A`; WebP `RIFF` nos
bytes 0-3 e `WEBP` nos bytes 8-11 — e rejeita quando a detecção dá `null` ou
diverge de `file.type`. O `ContentType` gravado no R2 e a extensão da chave vêm
do tipo **detectado**. A assinatura prova o formato, não que a imagem inteira seja
válida; como o arquivo só é exibido em `<img>` e servido com `ContentType` de
imagem, isso basta para que o bucket público não sirva outro tipo de conteúdo.

**Envio por Server Action.** O arquivo vai no `FormData` de uma Server Action
(`updateAvatar`), não por URL pré-assinada direto para o bucket. Com arquivo de
poucos KB, a ida extra pelo servidor custa pouco e mantém validação, autorização
e gravação no banco num lugar só.

**Camada.** `app/_lib/storage/` (dono `df-data`) é o único lugar que importa
`@aws-sdk/client-s3` e lê as variáveis `R2_*`. Ele **não importa**
`app/_lib/data/`, `app/_lib/auth/` nem `app/_lib/email/`: grava, apaga e devolve
URL. Pode importar `app/_lib/domain/` e `app/_lib/types/`, que são puros. Quem
orquestra arquivo e banco é a action.

## Consequência

- A ordem da action é fixa: gravar arquivo novo → atualizar `users.image` →
  apagar o antigo. Se o upload falhar, nada muda. Se o banco falhar, a action
  tenta apagar o arquivo novo. Se essa limpeza ou a exclusão do antigo falhar,
  sobra um arquivo órfão: custa centavos, fica registrado no log e não há rotina
  de limpeza.
- `deleteAvatarByUrl` só apaga URL que começa com `R2_AVATARS_PUBLIC_URL`. URL de
  outra origem em `users.image` (seed, dado antigo) é ignorada, nunca vira
  exclusão de objeto arbitrário.
- Qualquer pessoa com a URL de uma foto consegue abri-la sem sessão. É aceito para
  foto de perfil e **proibido** para anexo — anexo nunca vai para o bucket público.
- Credencial ausente derruba só o upload e a remoção: o storage lança erro claro
  na primeira chamada, não no carregamento do módulo, para que o resto do perfil e
  do app continue funcionando sem R2 configurado.
- A imagem é exibida com `<img>` (o `AvatarImage` do shadcn), não com
  `next/image`, então `next.config.ts` não ganha `images.remotePatterns`. Se um dia
  a foto passar por `next/image`, o domínio público do bucket entra ali.
- Trocar de provedor mexe só em `app/_lib/storage/` e nas variáveis `R2_*`.
- **`updateAvatar` não tem limite de chamadas.** Cada chamada grava um objeto no
  R2 e apaga outro, então dá para disparar gravação e exclusão em laço. Risco
  aceito por enquanto: a action exige sessão de usuário **ativo**
  (`requireSession` + checagem de `isActive`), o arquivo tem no máximo 512 KB e
  o custo por chamada é baixo — o bucket nunca acumula mais de um avatar por
  usuário, salvo órfão de falha. Entra na mesma decisão de camada de limite do
  ADR 007, tomada antes do deploy, contando por usuário da sessão.
