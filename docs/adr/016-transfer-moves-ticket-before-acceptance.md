# 016 — Envio para outro setor move o chamado antes do aceite

## Contexto

O schema nasceu com `ticket_transfer` (pendente → aprovado/rejeitado/cancelado)
e o status `aguardando_aprovacao`, pensando numa "caixa de aprovações" em que
um admin do destino aprovaria a transferência com o chamado ainda no setor de
origem. Nenhum código criava transferência até aqui.

O fluxo aprovado pelo usuário em 2026-10-08 (`docs/contracts/department-transfer.md`)
é outro: quem envia tira o chamado da fila de origem na hora, o chamado aparece
na fila do destino e **qualquer pessoa do setor de destino** o aceita
("Atender") ou recusa. Não existe tela de aprovações.

## Decisão

1. **Posse muda no envio.** O pedido grava, numa transação,
   `ticket.current_department_id = destino`, `assigned_to = null`,
   `status = 'aguardando_aprovacao'` e uma linha `ticket_transfer` pendente
   (`from` = setor que tinha o chamado, `to` = destino). A transferência
   pendente é a "trava" do estado: enquanto existir, editar, atribuir, resolver
   e reenviar ficam bloqueados (regras já existentes), e só aceite ou recusa a
   encerram.
2. **Uma linha de histórico por ato de transferência**, carregando todos os
   de/para que o ato muda (setor, status, destinatário):
   `transferencia_solicitada`, `transferencia_aprovada`,
   `transferencia_rejeitada`. Nenhuma `mudanca_status` nem `atribuicao` extra
   para o mesmo ato. O ciclo de vida continua completo (o status de origem e de
   destino estão na própria linha) e a linha do tempo mostra uma frase por ato.
3. **`ticket_transfer` continua sendo a fonte da pendência.** Nada novo no
   schema na Etapa 1 e 2; a Etapa 3 só acrescenta `recusado` a `ticket_status`
   (`ADD VALUE`, não destrutivo). `request_reason` fica nulo (o envio não pede
   motivo); `review_note` guarda o motivo da recusa.
4. **Aceite e recusa são de quem é do setor de destino**, inclusive a
   Diretoria só quando o destino for a própria Diretoria: o aceite atribui o
   chamado a quem aceitou, e o projeto já exige que destinatário seja do setor
   do chamado (`isUsableTicketAssignee`).

## Consequências

- Visibilidade segue `canViewTicket` sem mudança: o setor de destino vê o
  chamado (e os comentários privados do setor de origem) desde o envio; quem
  enviou e não é autor, diretoria nem destinatário perde o acesso ao detalhe no
  mesmo instante. A interface sai do detalhe depois do envio
  (`actorKeepsAccess`).
- Sem acesso, a action não chama `revalidatePath` nenhum: no Next 16
  instalado, qualquer revalidação dentro da action faz o servidor
  re-renderizar a página atual na resposta, sem conferir o caminho
  (`revalidate.js`, `TODO: only revalidate if the path matches`;
  `action-handler.js`, `skipPageRendering`), e o detalhe chegaria como 404
  disputando com a navegação da UI. As listas são dinâmicas, então nada fica
  desatualizado.
- `ticket.origin_department_id` passa a ter papel de leitura: as abas do autor
  em Meus chamados mostram só chamados em posse do setor de origem.
- O desenho original de "admin do destino aprova numa caixa de aprovações"
  fica superado. `approval_status = 'cancelado'` continua sem uso.
- Dados legados são alinhados por uma migration só de dados
  (`0011_align_legacy_transfers`, aprovada pelo usuário em 2026-10-08):
  chamado com transferência pendente passa para o setor de destino, sem
  destinatário (como se tivesse sido enviado pela regra nova, e sem linha nova
  de histórico, porque a `transferencia_solicitada` já descreve o ato); chamado
  em `aguardando_aprovacao` sem transferência pendente volta a `aberto`, com uma
  `mudanca_status` de "Sistema" explicando o ajuste. Depois dela, todo chamado
  em `aguardando_aprovacao` tem exatamente uma transferência pendente, e toda
  pendente aponta para o setor atual do chamado.
