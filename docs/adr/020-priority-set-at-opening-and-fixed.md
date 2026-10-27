# 020 — Prioridade definida na abertura e fixa

## Contexto

O plano `docs/plans/tag-priority.md` (aprovado em 2026-10-26) deixa o admin de
setor dar uma prioridade opcional a cada tag. Chamado aberto com tag que tem
prioridade recebe a da tag, sem escolha do autor; tag sem prioridade mantém a
escolha livre (ADR 019 e `docs/contracts/ticket-priority-and-sla.md`).

A tag de um chamado muda depois da abertura (edição pelo responsável, aceite de
transferência com nova tag), e a prioridade da própria tag pode ser editada no
cadastro. É preciso decidir se a prioridade do chamado acompanha essas mudanças.

## Decisão

1. **A prioridade é resolvida uma vez, na abertura, e gravada em
   `ticket.priority`** (e em `ticket_history.to_priority` do evento `criacao`).
   A regra é `resolveTicketPriority(tagPriority, chosen)`
   (`app/_lib/domain/tag-priority.ts`): prioridade da tag, se houver; senão, a
   escolhida.
2. **Nada depois da abertura recalcula a prioridade.** Trocar a tag do chamado
   ou mudar a prioridade da tag no cadastro não altera chamados existentes.
3. **O servidor é a autoridade.** A trava do Select na UI é conveniência. A
   resolução acontece dentro da transação de `insertTicket`, na mesma leitura
   `for share` da tag que já valida setor e situação: a prioridade lida é a que
   vale no instante do insert, e uma edição concorrente da tag espera o commit.
   O valor enviado pelo cliente é ignorado quando a tag tem prioridade.
4. `tag.priority` é nullable e reaproveita o enum `ticket_priority`. Sem valor
   padrão: tag existente continua sem prioridade.

## Alternativas descartadas

- **Prioridade derivada da tag em tempo de leitura.** Mudaria o SLA (ADR 019)
  de chamados antigos a cada edição do cadastro e apagaria o que o autor
  escolheu.
- **Ler a prioridade da tag na action, antes do insert.** Duas leituras da
  mesma linha e uma janela em que o admin muda a prioridade entre elas.

## Consequências

- O SLA de um chamado depende só da prioridade gravada; editar a tag no
  cadastro é seguro para chamados em andamento.
- Mudança de prioridade em transferência e edição manual depois da abertura
  ficam para decisão futura; quando entrarem, gravam evento próprio no
  histórico, e este ADR continua valendo para a abertura.
- Migration `0019_tag_priority.sql`: `ALTER TABLE "tag" ADD COLUMN "priority"
"ticket_priority"`, não destrutiva.
