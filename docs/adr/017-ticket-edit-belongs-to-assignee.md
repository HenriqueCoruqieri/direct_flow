# 017 — Edição do chamado pertence ao destinatário

## Contexto

Desde a edição (`docs/contracts/ticket-edit.md`), só o **autor** editava
título, descrição, tipo, tag, destinatário e, na janela de 7 dias, a solução,
desde que o chamado estivesse no setor dele. Com a fila como destinatário
padrão, o "Assumir", o "Enviar" e o envio para outro setor (ADR 016), quem
trabalha no chamado passou a ser, quase sempre, outra pessoa: o autor corrigia
um chamado que já não estava com ele, e quem o atendia não podia corrigir a
classificação nem registrar a solução certa.

O plano `docs/plans/assignee-edit-and-handoff-comment.md` (aprovado em
2026-10-12) muda o dono da edição.

## Decisão

1. **Só o destinatário atual edita** (`ticket.assigned_to = quem edita`). Sem
   exceção para autor, admin do setor ou diretoria. Chamado na fila
   (`assigned_to` nulo) não é editável por ninguém até alguém assumi-lo.
2. Continuam valendo, como salvaguarda, o setor (`current_department_id` igual
   ao setor de quem edita), a transferência pendente, a janela de 7 dias e o
   mapa de status editáveis (agora `TICKET_STATUS_IS_EDITABLE`, sem "autor" no
   nome). O destinatário edita mesmo antes de "Atender".
3. A tag escolhida continua tendo de ser do setor de quem edita. No setor de
   destino de uma transferência, a primeira edição recategoriza o chamado com
   uma tag do destino.
4. O botão "Editar" esmaecido ("Aguarde a solução ou devolutiva de X") deixa de
   existir: com transferência pendente o chamado está na fila do destino, sem
   destinatário, e o aviso de transferência pendente já informa a espera. A
   regra do botão vira booleana (`canEditTicketDetail`).
5. Para que o chamado da fila tenha dono e alguém possa corrigir a solução na
   janela, **resolver um chamado sem destinatário torna o resolvedor
   destinatário** (`resolutionAssigneeFor`), com uma linha `atribuicao` antes
   da `resolucao`, desde que ele seja um destinatário válido (ativo e do setor
   do chamado). A diretoria resolvendo chamado de outro setor não vira
   destinatária: o chamado fica sem destinatário, como antes.
6. O detalhe ganha o botão "Assumir" (mesma regra e mesma action da Fila), para
   que quem abre um chamado da fila chegue ao "Editar" sem voltar à lista.

## Alternativas descartadas

- **Manter o autor.** Deixa a correção com quem não atende o chamado e não
  alcança chamados transferidos (o autor fica fora do setor).
- **Destinatário + admin do setor + diretoria.** Mais flexível, mas reabre a
  pergunta "quem mexeu por último" que a regra de um dono só fecha, e a
  diretoria editaria chamados de setores cujas tags e pessoas ela não escolhe.
  Quem precisa corrigir um chamado de outra pessoa pode assumi-lo ou enviá-lo
  a si (admin e diretoria já podem pela Fila).

## Consequências

- **Autores perdem a edição** de chamados em que não são destinatários,
  inclusive os já existentes. Quem abre um chamado na fila não o edita até
  assumi-lo.
- **Quem troca o destinatário pelo "Editar" perde a edição** assim que salva
  (deixa de ser o destinatário).
- **Chamados resolvidos antes desta decisão sem destinatário** ficam sem
  edição de solução até a janela vencer; sem backfill (somem com o
  fechamento automático em até 7 dias).
- **Recategorização de tag**: no setor de destino, a primeira edição troca a
  tag por uma do setor de quem edita, e a linha `mudanca_tag` registra a troca.
- O invariante "destinatário é do setor do chamado" continua valendo também na
  resolução (item 5).
- Nenhuma mudança de schema nem migration.
