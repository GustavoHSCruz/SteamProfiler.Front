/* steamprofiler.org - the index of the privacy policy's revisions.

   Dates, summaries and commits only; the archived text of each one is in
   policy-text.js, which only the archive page loads. /privacy reads the newest
   date out of here, so the date on the policy cannot drift from the policy.

   `commit` is the sha in github.com/GustavoHSCruz/SteamProfiler that carried
   the revision. It is null until the commit exists, and the page draws the
   link only when there is one.

   Generated - see the header of policy-text.js for how to add a revision. */

const POLICY_LOG = [
  {
    version: 1,
    date: "2026-07-27",
    commit: null,
    summary: {
      en: "First published. Everything the site keeps, everything it does not, and who else sees anything.",
      pt: "Primeira publicação. Tudo o que o site guarda, tudo o que ele não guarda, e quem mais vê alguma coisa.",
      ru: "Первая публикация. Всё, что сайт хранит, всё, чего не хранит, и кто ещё что-то видит.",
    },
  },
  {
    version: 2,
    date: "2026-07-28",
    commit: null,
    summary: {
      en: "The game pages now show what a game costs, so this server asks the Steam storefront as well as the Steam Web API. Said so.",
      pt: "As páginas de jogo passaram a mostrar quanto o jogo custa, então este servidor consulta a loja da Steam além da Steam Web API. Passei a dizer isso.",
      ru: "На страницах игр появилась цена, поэтому сервер обращается не только к Steam Web API, но и к магазину Steam. Теперь об этом сказано.",
    },
  },
  {
    version: 3,
    date: "2026-07-28",
    commit: null,
    summary: {
      en: "Prices are now read from the shop matching the reader's language, so the language choice is sent with a price request. It used to say the choice never left your machine, and that had stopped being true.",
      pt: "Os preços passaram a ser lidos da loja correspondente ao idioma do leitor, então a escolha de idioma vai junto na consulta de preço. O texto dizia que a escolha nunca saía da sua máquina, e isso tinha deixado de ser verdade.",
      ru: "Цены теперь читаются из магазина, соответствующего языку читателя, поэтому выбор языка уходит вместе с запросом цены. Раньше было сказано, что выбор не покидает вашу машину, и это перестало быть правдой.",
    },
  },
  {
    version: 4,
    date: "2026-07-30",
    commit: null,
    summary: {
      en: "I now count visits that come back, for seven days at a time, with the country and region Cloudflare reports, and I count how many times each profile was looked up per day - deliberately with no way to join the two. And I now say what an experiment on this site is worth in general, because this is the first one. The text said there was no analytics and that nothing on disk recorded when somebody came; both had stopped being true.",
      pt: "Passei a contar visitas que voltam, em janelas de sete dias, com o país e a região que a Cloudflare informa, e a contar quantas vezes cada perfil foi consultado por dia - de propósito sem nenhuma forma de ligar as duas coisas. E passei a dizer o que vale um experimento neste site em geral, porque este é o primeiro. O texto dizia que não havia analytics e que nada em disco registrava quando alguém veio; as duas coisas tinham deixado de ser verdade.",
      ru: "Теперь я считаю возвращающиеся визиты, окнами по семь дней, со страной и регионом, которые сообщает Cloudflare, и считаю, сколько раз в день смотрели каждый профиль, - намеренно без всякой возможности связать одно с другим. И теперь я говорю, чего вообще стоит эксперимент на этом сайте, потому что этот - первый. В тексте было сказано, что аналитики нет и что ничто на диске не записывает, когда кто-то приходил; и то, и другое перестало быть правдой.",
    },
  },
];
