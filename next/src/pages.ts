/* The privacy policy and the about page, as a shape.

   Neither the words nor the order of them are written here: both are read
   straight out of the shells the served site publishes, by a script, and the
   strings themselves come out of the same dictionaries. That is deliberate
   and it is the only way a prototype is allowed to carry a privacy policy at
   all - a second, hand-typed copy of what a site promises about data is a
   copy that will disagree with the first one, and the disagreement will be
   found by somebody who trusted the wrong half.

   So this file says which cards there are, which key is the heading of each,
   and which keys are its paragraphs and its lists. It says nothing about what
   any of them mean. */

export type Block =
  | { t: 'p' | 'note'; k: string }
  | { t: 'ul'; items: { k: string; href?: string }[] };

export type Card = { head: string | null; tag: string | null; blocks: Block[] };

export const PRIVACY: Card[] = [
  {
    head: "priv.flow",
    tag: "priv.flow_tag",
    blocks: [
      {"t": "p", "k": "priv.flow_1"},
      {"t": "p", "k": "priv.flow_2"},
      {"t": "p", "k": "priv.flow_3"},
    ],
  },
  {
    head: "priv.kept",
    tag: "priv.kept_tag",
    blocks: [
      {"t": "p", "k": "priv.kept_intro"},
      { "t": "ul", "items": [{"k": "priv.kept_msg"}, {"k": "priv.kept_hash"}, {"k": "priv.kept_count"}, {"k": "priv.kept_origin"}, {"k": "priv.kept_lang"}, {"k": "priv.kept_recent"}, {"k": "priv.kept_log"}, {"k": "priv.kept_cache"}] },
    ],
  },
  {
    head: "priv.none",
    tag: "priv.none_tag",
    blocks: [
      { "t": "ul", "items": [{"k": "priv.none_track"}, {"k": "priv.none_cookie"}, {"k": "priv.none_login"}, {"k": "priv.none_history"}, {"k": "priv.none_sell"}] },
    ],
  },
  {
    head: "priv.exp",
    tag: "priv.exp_tag",
    blocks: [
      {"t": "p", "k": "priv.exp_intro"},
      { "t": "ul", "items": [{"k": "priv.exp_data"}, {"k": "priv.exp_time"}, {"k": "priv.exp_end"}, {"k": "priv.exp_decide"}, {"k": "priv.exp_rights"}] },
      {"t": "p", "k": "priv.exp_now"},
    ],
  },
  {
    head: "priv.third",
    tag: "priv.third_tag",
    blocks: [
      {"t": "p", "k": "priv.third_intro"},
      { "t": "ul", "items": [{"k": "priv.third_valve"}, {"k": "priv.third_cdn"}, {"k": "priv.third_tunnel"}, {"k": "priv.third_pay"}, {"k": "priv.third_rates"}, {"k": "priv.third_index"}, {"k": "priv.third_proton"}] },
    ],
  },
  {
    head: "priv.subject",
    tag: "priv.subject_tag",
    blocks: [
      {"t": "p", "k": "priv.subject_1"},
      {"t": "p", "k": "priv.subject_2"},
    ],
  },
  {
    head: "priv.rights",
    tag: "priv.rights_tag",
    blocks: [
      {"t": "p", "k": "priv.rights_1"},
      {"t": "p", "k": "priv.rights_2"},
      {"t": "p", "k": "priv.rights_3"},
    ],
  },
];

export const ABOUT: Card[] = [
  {
    head: "abt.why",
    tag: "abt.why_tag",
    blocks: [
      {"t": "p", "k": "abt.why_1"},
      {"t": "p", "k": "abt.why_2"},
      {"t": "p", "k": "abt.why_3"},
    ],
  },
  {
    head: "abt.safe",
    tag: "abt.safe_tag",
    blocks: [
      {"t": "p", "k": "abt.safe_1"},
      { "t": "ul", "items": [{"k": "abt.safe_login"}, {"k": "abt.safe_key"}, {"k": "abt.safe_trade"}, {"k": "abt.safe_store"}] },
      {"t": "p", "k": "abt.safe_2"},
    ],
  },
  {
    head: "abt.made",
    tag: "abt.made_tag",
    blocks: [
      {"t": "p", "k": "abt.made_1"},
      {"t": "p", "k": "abt.made_2"},
    ],
  },
  {
    head: "abt.find",
    tag: "abt.find_tag",
    blocks: [
      { "t": "ul", "items": [{"k": "abt.gh", "href": "https://github.com/GustavoHSCruz"}, {"k": "abt.repo_front", "href": "https://github.com/GustavoHSCruz/SteamProfiler.Front"}, {"k": "abt.repo_api", "href": "https://github.com/GustavoHSCruz/SteamProfiler.Api"}, {"k": "abt.mine", "href": "/u/gordziilla"}, {"k": "abt.ext", "href": "/extension"}, {"k": "abt.status", "href": "/status"}, {"k": "abt.translate", "href": "/translate"}, {"k": "abt.say", "href": "/feedback"}, {"k": "abt.help", "href": "/support"}] },
      {"t": "note", "k": "abt.note"},
    ],
  },
];
