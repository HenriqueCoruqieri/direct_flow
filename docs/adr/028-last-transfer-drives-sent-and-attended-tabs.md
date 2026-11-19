# 028 — O último envio decide as abas "Enviados e recusados" e "Atendidos"

Contrato: `docs/contracts/my-tickets-sent-and-attended.md`. Complementa o ADR
016 (o envio move o chamado antes do aceite), que continua valendo.

## Contexto

Em 2026-11-18 o usuário trocou as abas "Abertos por mim" e "Aguardando
aprovação" de Meus chamados por "Enviados e recusados" e "Atendidos". As duas
abas novas falam de **quem enviou**, não de quem abriu: o remetente acompanha o
que mandou para outro setor até o destino aceitar, recusar ou repassar.

O envio entre setores grava uma linha em `ticket_transfer` (`requested_by`,
`to_user_id` opcional, `status` `pendente` → `aprovado` ou `rejeitado`). O
repasse **dentro** do setor (`assignTicket`, modos "Assumir" e "Enviar") e a
troca de destinatário na edição e na resolução **não** gravam
`ticket_transfer`; gravam só `ticket_history.atribuicao`.

## Decisão

- A pertença às duas abas é decidida pela linha **mais recente** de
  `ticket_transfer` do chamado (`created_at desc, id desc`), comparando
  `requested_by` com o usuário. Nenhuma coluna nova: o histórico de envios já
  é append-only e a linha mais recente é sempre a que vale.
- "Enviados e recusados": último envio `pendente` com chamado em
  `aguardando_aprovacao`, ou `rejeitado` com chamado em `recusado`.
- "Atendidos": último envio `aprovado`, chamado em status ativo **e**
  `ticket.assigned_to = ticket_transfer.reviewed_by`. A terceira condição
  cobre o repasse que não grava `ticket_transfer`: quando quem aceitou passa o
  chamado a outra pessoa, devolve à fila ou outra pessoa assume, o chamado sai
  de "Atendidos" do remetente.
- A regra fica em `MY_TICKETS_TAB_RULES` como dado
  (`relation: "lastTransferRequester"`, `lastTransfer: MyTicketsLastTransferMatch[]`),
  e o `df-data` monta o SQL a partir dela, como já fazia com
  `relation/statuses/departmentScope`.
- Aba antiga na URL (`?tab=opened`, `?tab=awaiting`) não é mapeada: cai na
  aba padrão pela validação que já existe.
- **Quem fez o último envio vê o chamado** (decisão do usuário,
  2026-11-18). `TicketVisibilityFacts` ganha `lastTransferRequestedBy` (o
  `requested_by` da linha mais recente de `ticket_transfer`, ou nulo) e
  `canViewTicket` passa quando ele é o usuário. Com isso o remetente abre o
  detalhe, comenta e baixa anexos, porque essas permissões já seguem
  `canViewTicket`. Editar, resolver, assumir, atender e enviar continuam
  exigindo destinatário ou setor e não abrem. Comentário interno continua só
  para o setor atual (`canSeeInternalComments`). O acesso acaba quando outra
  pessoa faz um envio mais recente. Isso revisa a consequência "quem enviou
  perde o acesso" do ADR 016.
- Envio dentro do próprio setor (`assignTicket`, "Enviar") não grava
  `ticket_transfer`, então não entra nas abas novas nem dá acesso por esta
  regra (decisão do usuário).
- **Só grava comentário interno quem pode ver comentário interno.** Com o
  acesso do remetente, quem não é do setor atual passa a comentar; sem uma
  regra de escrita, ele gravaria um comentário `interna` que não consegue
  ler (o autor de fora do setor já tinha esse buraco). O domínio ganha
  `canWriteInternalComment` (igual a `canSeeInternalComments`) e
  `ticketCommentWriteBlockFor` / `canWriteTicketComment`, que somam o
  bloqueio `INTERNAL_NOT_ALLOWED` ao de `ticketCommentBlockFor` quando a
  visibilidade é `interna`. A checagem roda em `insertTicketMessage`, dentro
  da trava do chamado; a tela esconde o checkbox "Comentário privado" de quem
  não passa (`allowInternal` no estado `open` do formulário).
  `ticketCommentBlockFor` não muda, porque também decide editar e excluir.

## Consequência

- Chamado aberto pela pessoa e parado na fila do setor, sem atribuição e sem
  envio, não aparece em nenhuma aba de Meus chamados; está na Fila do setor.
- Um chamado pode estar em "Atribuídos a mim" e em "Enviados e recusados" ao
  mesmo tempo (recusa devolvida a quem enviou). Aceito.
- Se quem aceitou devolver o chamado à fila e depois o reassumir, ele volta a
  "Atendidos" do remetente: a regra olha o estado atual, não a sequência.
- Quem envia para outro setor **sempre** continua vendo o chamado logo
  depois do envio: `canViewTicketAfterTransfer` passa a ser verdadeira para
  quem envia, `actorKeepsAccess` vem sempre verdadeiro no envio, e o ramo
  "sair do detalhe sem acesso" do diálogo de envio deixa de ocorrer. Na
  recusa, quem recusou continua perdendo o acesso, salvo se ele mesmo for o
  remetente do envio recusado.
- Toda leitura que monta `TicketVisibilityFacts` precisa carregar o
  `requested_by` do último envio. O filtro SQL da busca do topo, que espelha
  `canViewTicket`, ganha a mesma condição.
- O remetente vê os comentários públicos e os anexos do chamado inteiro,
  inclusive os de depois do envio.
