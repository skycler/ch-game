# Schweiz-Quiz (Kantone, Nachbarländer, Seen, Flüsse)

Static web app, no build step. Serve the folder and open it:

    python3 -m http.server 8000   # then http://localhost:8000 (or just open index.html)

**Play:** drag a flag onto a canton (it highlights before you drop), or click a flag and then a canton.
Wrong canton → error, flag stays in the box. Right canton → enter the 2-letter shortcut and the capital.
Wrong answer → error, form closes. Right → canton gets coloured. Score: +4 per canton, −1 per error.
Progress is kept in localStorage (Reset button to start over). Scroll/pinch to zoom the map, drag to pan.

**Data:** cantons & lakes – swisstopo via npm `swiss-maps` (2024); rivers – OpenStreetMap (ODbL);
neighbouring countries – Natural Earth; flags – Wikimedia Commons (`flags/`).

**Structure:** `app.js` = logic and rendering only. Content lives in `data/`:
`quiz.js` (games, countries, lakes, rivers), `cantons.js`, `mountains.js`, `texts.js` (all feedback messages), `geo.js` (map geometry).

**Adding a game:** add an entry to `QUIZ.games` + `QUIZ.order` in `data/quiz.js`, an item builder in `ITEMS` in `app.js`,
and tag the matching map elements with `data-t="<game>:<key>"` in `drawMap()`.
Adding items to an existing game (e.g. a mountain) only needs a data edit.

**Modes:** lakes, rivers and mountains can be played as *Zuordnen* (match: drag/click a name onto the map object) or *Benennen* (write: click the object, type its name). Accepted spellings: the `alt` lists in the data files.
