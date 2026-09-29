# 009 — Calendário da aplicação no fuso de São Paulo

## Contexto

O Início filtra chamados por "hoje", "semana" e "mês". Essas palavras só têm
sentido num fuso. O servidor roda provavelmente em UTC e o navegador pode estar em
qualquer fuso; um chamado aberto às 22h de Brasília já é "amanhã" em UTC. Se cada
camada calcular o dia no próprio fuso, o mesmo chamado aparece em períodos
diferentes conforme quem faz a conta.

## Decisão

- O calendário da aplicação é **`America/Sao_Paulo`**, fixo, exportado como
  `APP_TIME_ZONE` de `app/_lib/date.ts`. Não depende de `TZ` do processo nem do
  fuso do navegador.
- Um dia do calendário é representado por **`DateKey`**, string `YYYY-MM-DD`.
  Aritmética de dias e meses é feita sobre a chave (calendário puro, sem fuso);
  só na borda a chave vira instante, pela meia-noite de São Paulo
  (`zonedDateTime`).
- Todo período vira intervalo **meio-aberto `[start, end)`** de instantes
  (`DateRange`), comparado contra `timestamptz` no banco. O fim é a meia-noite do
  dia seguinte ao último dia incluído, nunca `23:59:59.999`.
- O calendário do shadcn entrega `Date` na meia-noite **local do navegador**. Essa
  `Date` não é um instante de negócio: é convertida em `DateKey` pelos componentes
  locais (`calendarDateToKey`) e só então segue para a URL. O caminho inverso usa
  `dateKeyToCalendarDate`.
- O `react-day-picker` depende de `date-fns`. Import direto de `date-fns` é
  proibido em qualquer arquivo. Há **uma** exceção:
  `import { ptBR } from "react-day-picker/locale"` em
  `app/(app)/dashboard/_components/custom-period-picker.tsx`. Esse módulo só
  repassa `date-fns/locale`, e o import serve apenas para configurar o locale do
  `Calendar` (nomes de mês e de dia, início da semana). Ele não formata nem
  calcula data; isso continua sendo feito só por `app/_lib/date.ts`.

## Consequência

- Um chamado das 21h–0h de Brasília cai no dia certo em qualquer servidor. O seed
  demo cria chamados nessa faixa justamente para provar isso.
- Quem precisar de "dia" em outra feature usa `DateKey` e as funções de
  `app/_lib/date.ts`; `new Date().getDate()` e similares são erro de desenho.
- Usuário em outro fuso vê o calendário de São Paulo. Se um dia houver setor fora
  do Brasil, o fuso vira dado do setor e `APP_TIME_ZONE` vira parâmetro — mudança
  localizada em `app/_lib/date.ts`.
