/* steamprofiler.org - the extension page.

   Static text in three languages and nothing live on it, the same as the about
   page: fill the strings for whichever language the reader picked and build the
   language switch. The panel in the middle of it is markup, not a screenshot,
   so it is translated by the same pass as the prose around it. */

applyStatic();
langSwitchInto(el('langs'));
