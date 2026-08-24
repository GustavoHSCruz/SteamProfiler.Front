/* steamprofiler.org - the about page.

   Static text in three languages and nothing live on it, so this is only the
   chrome every page hangs off lib.js: fill the strings for whichever language
   the reader picked, build the language switch, and sign the footer. */

applyStatic();
langSwitchInto(el('langs'));
