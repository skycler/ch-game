# Schweiz-Quiz (Kantone, Nachbarländer, Seen, Flüsse)

Static web app, no build step. Serve the folder and open it:

    python3 -m http.server 8000   # then http://localhost:8000 (or just open index.html)

**Play:** drag a flag onto a canton (it highlights before you drop), or click a flag and then a canton.
Wrong canton → error, flag stays in the box. Right canton → enter the 2-letter shortcut and the capital.
Wrong answer → error, form closes. Right → canton gets coloured. Score: +4 per canton, −1 per error.
Progress is kept in localStorage (Reset button to start over). Scroll/pinch to zoom the map, drag to pan.

**Data:** cantons & lakes – swisstopo via npm `swiss-maps` (2024); rivers – OpenStreetMap (ODbL);
neighbouring countries – Natural Earth; flags – Wikimedia Commons (`flags/`).

**Adding a game:** add an entry to `GAMES` in `app.js` (items, points, hint, optional form), and tag the matching map
elements with `data-t="<game>:<key>"` in `drawMap()`.
