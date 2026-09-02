/* steamprofiler.org - the index of the privacy policy's revisions.

   Dates, summaries and commits only; the archived text of each one is in
   policy-text.js, which only the archive page loads. /privacy reads the newest
   date out of here, so the date on the policy cannot drift from the policy.

   `commit` is the sha in github.com/GustavoHSCruz/SteamProfiler.Front that
   carried the revision. It is null until the commit exists, and the page draws
   the link only when there is one.

   Revisions 1 to 3 all point at the initial commit, and that is not a mistake:
   they were written before the front end had a public repository, so the first
   commit is where all three of them enter the record at once. The link goes to
   the text rather than to a diff for those, and to the change itself for every
   revision after.

   Generated - see the header of policy-text.js for how to add a revision. */

const POLICY_LOG = [
  {
    version: 1,
    date: "2026-07-27",
    commit: "5423adafaf7657e9c97324d89de99c776b626655",
    summary: {
      en: "First published. Everything the site keeps, everything it does not, and who else sees anything.",
      pt: "Primeira publicação. Tudo o que o site guarda, tudo o que ele não guarda, e quem mais vê alguma coisa.",
      ru: "Первая публикация. Всё, что сайт хранит, всё, чего не хранит, и кто ещё что-то видит.",
    },
  },
  {
    version: 2,
    date: "2026-07-28",
    commit: "5423adafaf7657e9c97324d89de99c776b626655",
    summary: {
      en: "The game pages now show what a game costs, so this server asks the Steam storefront as well as the Steam Web API. Said so.",
      pt: "As páginas de jogo passaram a mostrar quanto o jogo custa, então este servidor consulta a loja da Steam além da Steam Web API. Passei a dizer isso.",
      ru: "На страницах игр появилась цена, поэтому сервер обращается не только к Steam Web API, но и к магазину Steam. Теперь об этом сказано.",
    },
  },
  {
    version: 3,
    date: "2026-07-28",
    commit: "5423adafaf7657e9c97324d89de99c776b626655",
    summary: {
      en: "Prices are now read from the shop matching the reader's language, so the language choice is sent with a price request. It used to say the choice never left your machine, and that had stopped being true.",
      pt: "Os preços passaram a ser lidos da loja correspondente ao idioma do leitor, então a escolha de idioma vai junto na consulta de preço. O texto dizia que a escolha nunca saía da sua máquina, e isso tinha deixado de ser verdade.",
      ru: "Цены теперь читаются из магазина, соответствующего языку читателя, поэтому выбор языка уходит вместе с запросом цены. Раньше было сказано, что выбор не покидает вашу машину, и это перестало быть правдой.",
    },
  },
  {
    version: 4,
    date: "2026-07-30",
    commit: "2ffe8132ae39cde7c93c4038c8df5e8668a21864",
    summary: {
      en: "I now count visits that come back, for seven days at a time, with the country and region Cloudflare reports, and I count how many times each profile was looked up per day - deliberately with no way to join the two. And I now say what an experiment on this site is worth in general, because this is the first one. The text said there was no analytics and that nothing on disk recorded when somebody came; both had stopped being true.",
      pt: "Passei a contar visitas que voltam, em janelas de sete dias, com o país e a região que a Cloudflare informa, e a contar quantas vezes cada perfil foi consultado por dia - de propósito sem nenhuma forma de ligar as duas coisas. E passei a dizer o que vale um experimento neste site em geral, porque este é o primeiro. O texto dizia que não havia analytics e que nada em disco registrava quando alguém veio; as duas coisas tinham deixado de ser verdade.",
      ru: "Теперь я считаю возвращающиеся визиты, окнами по семь дней, со страной и регионом, которые сообщает Cloudflare, и считаю, сколько раз в день смотрели каждый профиль, - намеренно без всякой возможности связать одно с другим. И теперь я говорю, чего вообще стоит эксперимент на этом сайте, потому что этот - первый. В тексте было сказано, что аналитики нет и что ничто на диске не записывает, когда кто-то приходил; и то, и другое перестало быть правдой.",
    },
  },
  {
    version: 5,
    date: "2026-07-31",
    commit: "4c339e7149939a3bbe82db94a37caec37991c8d0",
    summary: {
      en: "The home page now offers the last five profiles you looked up, so there is a second thing in your browser's localStorage. It is a list of what you typed, it stays on your machine, and there is a button that erases it - but the policy said there was one entry there, and now there are two.",
      pt: "A página inicial passou a oferecer os últimos cinco perfis que você consultou, então existe uma segunda coisa no localStorage do seu navegador. É uma lista do que você digitou, fica na sua máquina, e tem um botão que apaga - mas a política dizia que havia uma entrada lá, e agora são duas.",
      ru: "На главной странице появились последние пять профилей, которые вы искали, поэтому в localStorage вашего браузера теперь вторая запись. Это список того, что вы набрали, он остаётся на вашей машине, и есть кнопка, которая его стирает, - но в политике было сказано, что там одна запись, а теперь их две.",
    },
  },
  {
    version: 6,
    date: "2026-09-02",
    commit: "0fba3120a653b8a3708e1d4b12b57185d6557ec4",
    summary: {
      en: "The card pages can now say what finishing a badge would cost you rather than what a set costs from nothing, and the only way to know the difference is to read which of those cards a profile is already holding. So a public trading-card inventory is now among the things read from Steam, and the list of what comes back says so. An inventory set to private is not read. Nothing else changed: no sign-in, no trade, no listing, nothing held, nothing written to disk.",
      pt: "As páginas de cartas passaram a poder dizer quanto falta para você fechar um emblema, em vez de quanto custa o conjunto do zero, e o único jeito de saber a diferença é ler quais dessas cartas o perfil já tem. Então o inventário público de cartas passou a estar entre as coisas lidas da Steam, e a lista do que volta passou a dizer isso. Inventário fechado não é lido. Nada mais mudou: sem login, sem troca, sem anúncio de venda, nada guardado, nada gravado em disco.",
      ru: "Страницы карточек теперь могут сказать, сколько вам осталось доплатить за значок, а не сколько стоит набор с нуля, и узнать эту разницу можно только одним способом: прочитав, какие из этих карточек у профиля уже есть. Поэтому открытый инвентарь карточек теперь входит в то, что читается из Steam, и список того, что возвращается, об этом говорит. Закрытый инвентарь не читается. Больше ничего не изменилось: без входа, без обменов, без объявлений о продаже, ничего не хранится и ничего не пишется на диск.",
    },
  },
];
