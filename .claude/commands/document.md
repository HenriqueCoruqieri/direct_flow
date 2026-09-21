---
description: Cria ou atualiza a documentação do Direct Flow a partir do código real
argument-hint: [o que documentar] — sem argumento, sincroniza a documentação com o código atual
---

Documente no **Direct Flow**: $ARGUMENTS

Você é o **orquestrador**. `docs/**` pertence ao **`df-architect`** — é ele quem
escreve. `README.md` na raiz também passa por ele, por ser documentação.

Regra que vale para o comando inteiro: **documentação descreve o que o código
faz, não o que se pretendia que fizesse.** Toda afirmação sai de um arquivo que
você leu. Se você não confirmou, não escreve.

## 1. Levantar o estado real

Não delegue esta parte — leia você mesmo, é leitura e não precisa de dono:

```bash
git diff --name-only main...HEAD    # o que mudou e pode ter desatualizado docs
ls docs/ docs/adr/ docs/contracts/  # o que já existe
```

Leia `db/schema.ts`, `app/_lib/domain/`, `app/_lib/validation/`, `app/_lib/actions/` e as rotas
em `app/`. O schema e as regras puras são a fonte de verdade do domínio.

Se algum comportamento não ficar claro só lendo, acione `df-debug` para
confirmar o que acontece em execução. Documentar suposição é pior que não
documentar.

## 2. Identificar o que está desatualizado

Compare o que você leu com o que os documentos afirmam. Procure especificamente:

- contrato em `docs/contracts/` cuja assinatura não bate mais com o código
- status, enum ou transição documentados que não existem mais no schema
- ADR decidindo algo que foi revertido depois
- `README.md` com passo de setup que não funciona mais (variável de ambiente
  nova, comando renomeado)
- fluxo do ticket documentado divergindo de `app/_lib/domain/`

Documento errado é pior que documento ausente, porque alguém confia nele.

## 3. O que documentar, e onde

**`docs/contracts/<fluxo>.md`** — tabelas, schemas Zod, funções de `app/_lib/domain/`,
funções de dados e Server Actions, com assinatura. É o que permite os agentes
trabalharem em paralelo; mantê-lo vivo é a documentação mais valiosa do projeto.

**`docs/adr/NNN-titulo.md`** — decisão técnica: contexto, decisão, consequência.
Curto. Uma por arquivo. Não reescreva ADR antiga que foi superada — escreva uma
nova marcando que substitui a anterior. O histórico da decisão tem valor.

**`docs/fluxos/ticket.md`** — o ciclo de vida do ticket em prosa: quem pode
fazer o quê, em que estado, o que exige aprovação, o que dispara e-mail. É a
documentação que a proposta do projeto pede e a que mais gente vai ler.

**`README.md`** — o que é o sistema, stack, como rodar, variáveis de ambiente,
comandos. Mantenha curto e correto. Detalhe vai para `docs/`.

Não documente o óbvio do código (`// incrementa o contador`) e não gere
referência de API a partir de assinatura — isso o TypeScript já faz melhor, e
duplicar fere o DRY.

## 4. Escrever

Acione o **`df-architect`** com o levantamento: o que está desatualizado, o que
falta, e os trechos de código que sustentam cada afirmação.

Português, prosa, sem encher de bullet. Código só quando o exemplo esclarece.

Se, documentando, aparecer inconsistência no **código** — regra que contradiz
outra, status inalcançável — não corrija aqui. Anote, reporte ao usuário e
sugira `/fix`.

## 5. Verificar

Releia o que foi escrito contra o código. Toda afirmação rastreável a um
arquivo. Todo comando do README de fato executável.

Não é necessário rodar o `df-reviewer` em mudança só de documentação, salvo se
algum arquivo de código tiver sido tocado.

## 6. Encerramento

Commit `docs: ...`.

Reporte: o que foi criado, o que foi atualizado, e qualquer divergência entre
código e documentação que você encontrou mas não resolveu.
