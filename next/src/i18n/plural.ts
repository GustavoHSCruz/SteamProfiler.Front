/* The one helper a dictionary line may call.

   The built dictionaries next to this file are the same lines as the served
   site's dict.<lang>.js, and some of those lines are functions because a
   sentence that counts has to pick its own plural. In the served site
   plural() is a global that reads the active language; a module has no such
   global, so each built file binds one to its own language here. */

export type Vars = Record<string, string | number>;
export type Dict = Record<string, string | ((v: Vars) => string)>;

/** Russian needs three plural forms; Chinese one; English and Portuguese two.
 *  `n` is the raw number, never the formatted one: `1,001` is plural. */
export function pluralFor(lang: string) {
  return (n: string | number, forms: string[]): string => {
    const x = Math.abs(Number(n));
    if (lang === 'ru') {
      const m10 = x % 10, m100 = x % 100;
      if (m10 === 1 && m100 !== 11) return forms[0];
      if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return forms[1];
      return forms[2] ?? forms[1];
    }
    if (lang.startsWith('zh-')) return forms[0];
    return x === 1 ? forms[0] : forms[1];
  };
}
