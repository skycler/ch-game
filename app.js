(() => {
  const $ = s => document.querySelector(s);
  const svg = d3.select('#map');

  // =====================================================================
  //  GAME DEFINITIONS – to add a new challenge, add an entry here.
  //  items:  [{key, name, flag?, answers?}]   (answers => a form is shown after a correct drop)
  //  The map side must tag the matching element with data-t="<game>:<key>" (see drawMap).
  // =====================================================================
  const cantonItems = Object.entries(CANTONS).map(([id, c]) => ({
    key: c.code, name: c.name, id: +id, flag: `flags/${c.code}.svg`,
    answers: {short: [c.code], capital: [c.capital, ...c.alt]}
  }));
  const countryItems = [
    {key: 'DE', geo: 'Germany', name: 'Deutschland', capital: ['Berlin'], short: ['D', 'DE']},
    {key: 'FR', geo: 'France', name: 'Frankreich', capital: ['Paris'], short: ['F', 'FR']},
    {key: 'IT', geo: 'Italy', name: 'Italien', capital: ['Rom', 'Roma'], short: ['I', 'IT']},
    {key: 'AT', geo: 'Austria', name: 'Österreich', capital: ['Wien', 'Vienna'], short: ['A', 'AT']},
    {key: 'LI', geo: 'Liechtenstein', name: 'Liechtenstein', capital: ['Vaduz'], short: ['FL', 'LI']}
  ].map(c => ({key: c.key, geo: c.geo, name: c.name, flag: `flags/countries/${c.key}.svg`, answers: {short: c.short, capital: c.capital}}));
  // lake ids = swisstopo/BFS lake numbers
  const lakeItems = [
    ['Genfersee', 9757], ['Bodensee', 9326], ['Lago Maggiore', 9711], ['Neuenburgersee', 9151], ['Luganersee', 9710],
    ['Vierwaldstättersee', 9179], ['Zürichsee', 9050], ['Thunersee', 9073], ['Brienzersee', 9089], ['Bielersee', 9148],
    ['Zugersee', 9175], ['Walensee', 9267], ['Murtensee', 9294], ['Sempachersee', 9163], ['Hallwilersee', 9172]
  ].map(([name, id]) => ({key: name, name, id}));
  // river keys = names used in data/geo.js
  const riverItems = [
    ['Rhein'], ['Rhône', 'Rhone'], ['Aare'], ['Reuss'], ['Limmat'], ['Inn'], ['Ticino'], ['Doubs'], ['Thur'], ['Saane'], ['Emme'], ['Maggia'], ['Hinterrhein'], ['Vorderrhein']
  ].map(([data, shown]) => ({key: data, name: shown || data}));

  const mountainItems = MOUNTAINS.map(m => ({key: m.name, name: m.name, lon: m.lon, lat: m.lat, ele: m.ele}));

  const GAMES = {
    cantons: {
      title: 'Kantone', box: 'Flaggen', points: 4, items: cantonItems,
      hint: 'Flagge auf einen Kanton ziehen – oder Flagge anklicken und dann den Kanton anklicken.',
      form: {text: 'Richtiger Kanton! Jetzt die Angaben ausfüllen:', short: 'Kürzel (2 Buchstaben)', capital: 'Hauptort'},
      wrongMsg: () => 'Das ist nicht der richtige Kanton für diese Flagge.'
    },
    countries: {
      title: 'Nachbarländer', box: 'Flaggen', points: 4, items: countryItems,
      hint: 'Flagge auf ein Nachbarland ziehen – oder Flagge anklicken und dann das Land anklicken.',
      form: {text: 'Richtiges Land! Jetzt die Angaben ausfüllen:', short: 'Länderkürzel (z. B. Autokennzeichen)', capital: 'Hauptstadt'},
      wrongMsg: () => 'Das ist nicht das richtige Land für diese Flagge.'
    },
    lakes: {
      title: 'Seen', box: 'Seen', points: 2, items: lakeItems, text: true,
      hint: 'Seename auf den See ziehen – oder Namen anklicken und dann den See anklicken. Zoomen hilft bei kleinen Seen.',
      wrongMsg: it => `Das ist nicht der ${it.name}.`
    },
    mountains: {
      title: 'Berge', box: 'Berge', points: 2, items: mountainItems, text: true,
      hint: 'Bergname auf das Dreieck ▲ ziehen – oder Namen anklicken und dann den Berg anklicken.',
      wrongMsg: it => `Das ist nicht der richtige Berg für «${it.name}».`
    },
    rivers: {
      title: 'Flüsse', box: 'Flüsse', points: 2, items: riverItems, text: true,
      hint: 'Flussname auf den Fluss ziehen – oder Namen anklicken und dann den Fluss anklicken.',
      wrongMsg: it => `Das ist nicht der Fluss «${it.name}».`
    }
  };
  const ORDER = Object.keys(GAMES);
  const itemOf = (g, key) => GAMES[g].items.find(i => i.key === key);

  // ---------- state ----------
  const KEY = 'ch-quiz-v2', OLD_KEY = 'ch-cantons-quiz-v1';
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const fresh = g => ({done: [], score: 0, errors: 0, order: shuffle(GAMES[g].items.map(i => i.key))});
  let state = load();
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    if (!s || !s.g) {
      s = {cur: 'cantons', g: {}};
      try { const o = JSON.parse(localStorage.getItem(OLD_KEY)); if (o && Array.isArray(o.done)) s.g.cantons = o; } catch (e) {}
    }
    for (const g of ORDER) if (!s.g[g]) s.g[g] = fresh(g);
    // keep saved state in sync with the current item lists (items may have been added/removed)
    for (const g of ORDER) {
      const keys = GAMES[g].items.map(i => i.key), st = s.g[g];
      st.order = st.order.filter(k => keys.includes(k)).concat(shuffle(keys.filter(k => !st.order.includes(k))));
      st.done = st.done.filter(k => keys.includes(k));
    }
    if (!GAMES[s.cur]) s.cur = 'cantons';
    return s;
  }
  const save = () => localStorage.setItem(KEY, JSON.stringify(state));
  const who = () => state.name || 'du';
  const pick = arr => arr[Math.random() * arr.length | 0];
  const G = () => state.g[state.cur];
  const game = () => GAMES[state.cur];

  let selected = null;   // item key selected in the box
  let pending = null;    // item key waiting for the form

  // ---------- geo ----------
  const cantons = topojson.feature(GEO.topo, GEO.topo.objects.cantons).features;
  const lakes = topojson.feature(GEO.topo, GEO.topo.objects.lakes).features;
  const countries = GEO.countries.map(c => ({type: 'Feature', properties: {name: c.name}, geometry: c.geometry}));
  const rivers = GEO.rivers.filter(r => !['Lütschine', 'Töss', 'Glatt', 'Simme', 'Sihl', 'Kander'].includes(r.name));
  const MAJOR = new Set(['Rhein', 'Rhône', 'Aare', 'Reuss', 'Inn', 'Ticino', 'Doubs']);

  const COUNTRY_LABELS = {DE: [8.9, 48.2], FR: [5.6, 47.3], IT: [8.3, 45.55], AT: [10.85, 47.3], LI: [9.55, 47.17]};
  const RIVER_ANCHOR = {Rhein: [8.0, 47.58], 'Rhône': [7.2, 46.2], Aare: [7.95, 47.42], Reuss: [8.3, 47.2], Inn: [10.1, 46.75],
    Ticino: [8.85, 46.4], Doubs: [6.95, 47.3], Limmat: [8.45, 47.4], Thur: [9.1, 47.5], Saane: [7.15, 46.7],
    Emme: [7.75, 47.0], Maggia: [8.65, 46.3], Hinterrhein: [9.35, 46.62], Vorderrhein: [8.95, 46.73]};

  function nearestPoint(name, lon, lat) {
    const r = GEO.rivers.find(x => x.name === name); if (!r) return [lon, lat];
    let best = null, bd = 1e9;
    for (const l of r.lines) for (const p of l) { const d = (p[0] - lon) ** 2 + (p[1] - lat) ** 2; if (d < bd) { bd = d; best = p; } }
    return best;
  }
  function largestPolygon(f) {
    if (f.geometry.type === 'Polygon') return f;
    let best = null, ba = -1;
    for (const c of f.geometry.coordinates) { const g = {type: 'Polygon', coordinates: c}, a = d3.geoArea(g); if (a > ba) { ba = a; best = g; } }
    return best;
  }
  // position (lon/lat) where the name of an item is placed on the map
  function labelPos(g, key) {
    if (g === 'mountains') { const m = itemOf(g, key); return [m.lon, m.lat]; }
    if (g === 'cantons') return d3.geoCentroid(largestPolygon(cantons.find(f => f.id === itemOf(g, key).id)));
    if (g === 'countries') return COUNTRY_LABELS[key];
    if (g === 'lakes') return d3.geoCentroid(lakes.find(f => f.id === itemOf(g, key).id));
    if (g === 'rivers') return nearestPoint(key, ...RIVER_ANCHOR[key]);
  }

  // ---------- map ----------
  let zoomT = d3.zoomIdentity, zoom, proj, path, gRoot;
  const hue = s => [...s].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) * 137.5 % 360;
  const colour = (g, key) => `hsl(${hue(g + key)} 65% 72%)`;
  const dark = (g, key) => `hsl(${hue(g + key)} 75% 38%)`;

  function drawMap() {
    const el = $('#map'); const w = el.clientWidth, h = el.clientHeight;
    svg.selectAll('*').remove();
    proj = d3.geoMercator().fitExtent([[12, 12], [w - 12, h - 12]], {type: 'FeatureCollection', features: cantons});
    path = d3.geoPath(proj);
    gRoot = svg.append('g');
    const geoToKey = Object.fromEntries(countryItems.map(c => [c.geo, c.key]));
    const lakeById = Object.fromEntries(lakeItems.map(l => [l.id, l.key]));
    const riverKeys = new Set(riverItems.map(r => r.key));

    gRoot.append('g').selectAll('path').data(countries).join('path').attr('class', d => 'neighbour tgt')
      .attr('data-t', d => 'countries:' + geoToKey[d.properties.name]).attr('d', path);
    gRoot.append('g').selectAll('path').data(cantons).join('path').attr('class', 'canton tgt')
      .attr('data-t', d => 'cantons:' + CANTONS[d.id].code).attr('d', path);
    gRoot.append('g').selectAll('path').data(lakes).join('path').attr('class', d => 'lake' + (lakeById[d.id] ? ' tgt' : ''))
      .attr('data-t', d => lakeById[d.id] ? 'lakes:' + lakeById[d.id] : null).attr('d', path);
    const rv = rivers.map(r => ({name: r.name, d: path({type: 'MultiLineString', coordinates: r.lines})}));
    gRoot.append('g').selectAll('path').data(rv).join('path')
      .attr('class', d => 'river' + (MAJOR.has(d.name) ? ' major' : ''))
      .attr('data-k', d => riverKeys.has(d.name) ? 'rivers:' + d.name : null).attr('d', d => d.d);
    gRoot.append('g').selectAll('path').data(rv.filter(r => riverKeys.has(r.name))).join('path')
      .attr('class', 'hit').attr('data-t', d => 'rivers:' + d.name).attr('d', d => d.d);

    // static labels (switchable) – and labels of solved items (always visible)
    const lg = gRoot.append('g');
    const put = (txt, p, cls, parent = lg) => { const q = proj(p); parent.append('text').attr('class', 'lbl ' + cls).attr('x', q[0]).attr('y', q[1] + (cls === 'code' ? 4 : 0)).text(txt); };
    countryItems.forEach(c => put(c.name, COUNTRY_LABELS[c.key], 'country'));
    lakeItems.forEach(l => put(l.name, labelPos('lakes', l.key), 'lake'));
    riverItems.forEach(r => put(r.name, labelPos('rivers', r.key), 'river'));
    // mountain markers (only visible in the mountain game)
    const pk = gRoot.append('g').attr('class', 'peaks');
    const pkp = mountainItems.map(m => ({key: m.key, p: proj([m.lon, m.lat])}));
    pk.selectAll('text').data(pkp).join('text').attr('class', 'peak').attr('x', d => d.p[0]).attr('y', d => d.p[1] + 1)
      .attr('data-k', d => 'mountains:' + d.key).text('▲');
    pk.selectAll('circle').data(pkp).join('circle').attr('class', 'peakhit').attr('cx', d => d.p[0]).attr('cy', d => d.p[1] - 3)
      .attr('data-t', d => 'mountains:' + d.key);
    gRoot.append('g').attr('id', 'codes');
    ORDER.forEach(g => state.g[g].done.forEach(k => markDone(g, k)));

    zoom = d3.zoom().scaleExtent([1, 14]).translateExtent([[0, 0], [w, h]]).extent([[0, 0], [w, h]])
      .on('zoom', ev => { zoomT = ev.transform; gRoot.attr('transform', zoomT); svg.style('--k', zoomT.k); });
    svg.call(zoom).on('dblclick.zoom', null);
    svg.call(zoom.transform, zoomT);
    svg.classed('nolabels', !$('#labels').checked);
    setGameClass();
  }
  const setGameClass = () => ORDER.forEach(g => svg.classed('g-' + g, g === state.cur));

  function markDone(g, key) {
    const t = `${g}:${key}`;
    gRoot.selectAll('[data-t],[data-k]').filter(function () { return this.dataset.t === t || this.dataset.k === t; })
      .classed('done', true).style('--c', colour(g, key)).style('--d', dark(g, key));
    const it = itemOf(g, key);
    const q = proj(labelPos(g, key));
    gRoot.select('#codes').append('text').attr('class', 'lbl code' + (g === 'mountains' ? ' m' : '')).attr('x', q[0]).attr('y', q[1] + (g === 'mountains' ? -9 : 4))
      .text(g === 'cantons' ? key : it.name);
  }

  let lastHover = null;
  function hover(key) {
    const t = key == null ? null : `${state.cur}:${key}`;
    if (t === lastHover) return; lastHover = t;
    svg.selectAll('[data-t],[data-k]').classed('hover', function () {
      return t != null && (this.dataset.t === t || this.dataset.k === t) && !this.classList.contains('done');
    });
  }
  function targetAt(x, y) {
    const e = document.elementFromPoint(x, y);
    const t = e && e.closest && e.closest('[data-t]');
    const pre = state.cur + ':';
    return t && t.dataset.t.startsWith(pre) ? t.dataset.t.slice(pre.length) : null;
  }
  svg.on('click', ev => { if (!selected) return; const k = targetAt(ev.clientX, ev.clientY); if (k != null) guess(selected, k); });
  svg.on('pointermove', ev => { if (!drag) hover(selected ? targetAt(ev.clientX, ev.clientY) : null); });
  svg.on('pointerleave', () => { if (!drag) hover(null); });

  // ---------- box ----------
  const tileHTML = it => game().text ? it.name : `<img src="${it.flag}" alt="Flagge" draggable="false">`;
  function renderBox() {
    const box = $('#box'); box.innerHTML = ''; box.classList.toggle('text', !!game().text);
    for (const key of G().order) {
      if (G().done.includes(key)) continue;
      const d = document.createElement('div');
      d.className = 'flag'; d.dataset.key = key; d.innerHTML = tileHTML(itemOf(state.cur, key));
      box.appendChild(d);
    }
    $('#boxtitle').textContent = game().box;
    $('#hint').textContent = game().hint;
    updateStats();
  }
  const tileEl = key => document.querySelector(`.flag[data-key="${CSS.escape(key)}"]`);
  function updateStats() {
    const g = G(), n = game().items.length;
    $('#score').textContent = g.score; $('#done').textContent = g.done.length; $('#total').textContent = n; $('#errors').textContent = g.errors;
    $('#left').textContent = `(noch ${n - g.done.length})`;
    renderTabs();
  }
  function renderTabs() {
    $('#tabs').innerHTML = ORDER.map(g => `<button data-g="${g}" class="${g === state.cur ? 'active' : ''}">${GAMES[g].title}<small>${state.g[g].done.length}/${GAMES[g].items.length}</small></button>`).join('');
  }
  $('#tabs').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.dataset.g === state.cur) return;
    state.cur = b.dataset.g; save(); select(null); hover(null); lastHover = null; setGameClass(); renderBox();
    if (G().done.length === game().items.length) win();
  });
  function select(key) {
    selected = key;
    document.querySelectorAll('.flag').forEach(f => f.classList.toggle('selected', f.dataset.key === key));
  }

  // drag & drop (pointer events: mouse, touch, pen)
  let drag = null;
  $('#box').addEventListener('pointerdown', ev => {
    const f = ev.target.closest('.flag'); if (!f || ev.button > 0) return;
    drag = {key: f.dataset.key, el: f, x: ev.clientX, y: ev.clientY, active: false, ghost: null};
    f.setPointerCapture(ev.pointerId);
  });
  $('#box').addEventListener('pointermove', ev => {
    if (!drag) return;
    if (!drag.active) {
      if (Math.hypot(ev.clientX - drag.x, ev.clientY - drag.y) < 6) return;
      drag.active = true; drag.el.classList.add('dragging');
      const g = document.createElement('div'); g.id = 'ghost'; g.className = game().text ? 'text' : '';
      g.innerHTML = tileHTML(itemOf(state.cur, drag.key)); document.body.appendChild(g); drag.ghost = g;
    }
    drag.ghost.style.left = ev.clientX + 'px'; drag.ghost.style.top = ev.clientY + 'px';
    hover(targetAt(ev.clientX, ev.clientY));
  });
  const endDrag = ev => {
    if (!drag) return;
    const d = drag; drag = null;
    if (d.active) {
      d.ghost.remove(); d.el.classList.remove('dragging');
      const k = ev.type === 'pointerup' ? targetAt(ev.clientX, ev.clientY) : null;
      hover(null);
      if (k != null) guess(d.key, k); else select(null);
    } else if (ev.type === 'pointerup') {
      select(selected === d.key ? null : d.key);
    }
  };
  $('#box').addEventListener('pointerup', endDrag);
  $('#box').addEventListener('pointercancel', endDrag);

  // ---------- game logic ----------
  function guess(key, targetKey) {
    const g = state.cur, it = itemOf(g, key), hit = itemOf(g, targetKey);
    if (G().done.includes(targetKey)) { toast(`${who()}, ${hit.name} hast du schon gelöst – such dir den nächsten!`, 'err'); select(null); return; }
    if (targetKey !== key) { fail(pick([`Nicht ganz, ${who()}!`, `Fast, ${who()}!`, `Gute Idee, ${who()}, aber nicht ganz.`]) + ' ' + GAMES[g].wrongMsg(it) + pick([' Probier es nochmal!', ' Du schaffst das!', ' Bleib dran!']), key); return; }
    if (!it.answers) { succeed(key); return; }
    pending = key;
    const f = GAMES[g].form;
    $('#mflag').src = it.flag; $('#mname').textContent = it.name; $('#mtext').textContent = f.text;
    $('#l1').textContent = f.short; $('#l2').textContent = f.capital;
    $('#short').value = ''; $('#capital').value = '';
    $('#modal').hidden = false;
    setTimeout(() => $('#short').focus(), 30);
  }

  const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  $('#form').addEventListener('submit', ev => {
    ev.preventDefault();
    const key = pending, f = GAMES[state.cur].form, a = itemOf(state.cur, key).answers;
    const okShort = a.short.some(s => s.toUpperCase() === $('#short').value.trim().toUpperCase());
    const cap = norm($('#capital').value);
    const okCap = a.capital.some(c => norm(c) === cap);
    pending = null; $('#modal').hidden = true;
    if (okShort && okCap) succeed(key, a.capital[0]);
    else {
            fail(pick([`Fast, ${who()}!`, `Nicht ganz, ${who()}.`, `Knapp daneben, ${who()}!`]) + ` Bei ${itemOf(state.cur, key).name} stimmt eine Angabe noch nicht. Die Flagge ist wieder in der Box – beim nächsten Mal klappt's!`, key);
    }
  });
  function succeed(key, capital) {
    const g = state.cur, it = itemOf(g, key), pts = GAMES[g].points;
    G().done.push(key); G().score += pts; save();
    markDone(g, key); tileEl(key)?.remove(); select(null); updateStats();
    const left = GAMES[g].items.length - G().done.length;
    const extra = left === 0 ? '' : left === 1 ? ' Nur noch eins!' : G().done.length === Math.ceil(GAMES[g].items.length / 2) ? ' Halbzeit – super Tempo!' : '';
    toast(pick([`Super, ${who()}!`, `Bravo, ${who()}!`, `Genau richtig, ${who()}!`, `Stark, ${who()}!`, `Top, ${who()}!`, `Das sitzt, ${who()}!`]) +
      ` ${it.name}${capital ? ' (' + capital + ')' : it.ele ? ' (' + it.ele + ' m)' : ''} geschafft. +${pts} Punkte.` + extra, 'ok');
    if (G().done.length === GAMES[g].items.length) win();
  }
  const cancel = () => { if (pending == null) return; const k = pending; pending = null; $('#modal').hidden = true; select(null); bounce(k); };
  $('#cancel').addEventListener('click', cancel);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { cancel(); select(null); } });

  function bounce(key) { const f = tileEl(key); if (f) { f.classList.add('bounce'); setTimeout(() => f.classList.remove('bounce'), 500); } }
  function fail(msg, key) {
    G().errors++; G().score = Math.max(0, G().score - 1); save();
    updateStats(); select(null); bounce(key);
    toast(msg, 'err');
  }
  let tt; function toast(msg, cls) {
    const t = $('#toast'); t.textContent = msg; t.className = 'show ' + cls;
    clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), Math.min(9000, Math.max(2500, 1500 + msg.length * 60)));
  }
  function win() {
    $('#wintitle').textContent = `🎉 Bravo, ${who()}!`;
    const next = ORDER[(ORDER.indexOf(state.cur) + 1) % ORDER.length];
    $('#winmsg').textContent = `Du hast «${game().title}» komplett gelöst! Punkte: ${G().score} · Fehler: ${G().errors}. Weiter geht's mit «${GAMES[next].title}» – du bist auf einem super Weg!`;
    $('#win').hidden = false;
  }
  $('#win').addEventListener('click', e => { if (e.target.id === 'win') $('#win').hidden = true; });
  function reset() {
    state.g[state.cur] = fresh(state.cur); save();
    selected = null; $('#win').hidden = true;
    renderBox(); drawMap();
  }
  $('#reset').addEventListener('click', () => { if (confirm(`${who()}, «${game().title}» wirklich neu beginnen und Punkte zurücksetzen?`)) reset(); });
  $('#again').addEventListener('click', reset);

  // controls
  $('#zin').onclick = () => svg.transition().duration(250).call(zoom.scaleBy, 1.6);
  $('#zout').onclick = () => svg.transition().duration(250).call(zoom.scaleBy, 1 / 1.6);
  $('#zreset').onclick = () => svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
  $('#labels').onchange = e => svg.classed('nolabels', !e.target.checked);
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(drawMap, 150); });

  // ---------- player name ----------
  function renderWho() { $('#who').textContent = '👤 ' + (state.name || ''); }
  function askName() {
    $('#nameinput').value = state.name || '';
    $('#welcome').hidden = false;
    setTimeout(() => { $('#nameinput').focus(); $('#nameinput').select(); }, 30);
  }
  $('#nameform').addEventListener('submit', ev => {
    ev.preventDefault();
    const first = !state.name;
    state.name = $('#nameinput').value.trim().slice(0, 24) || 'du'; save();
    $('#welcome').hidden = true; renderWho();
    toast(first ? `Hallo ${state.name}! Los geht's – du schaffst das! 🇨🇭` : `Alles klar, ${state.name}!`, 'ok');
  });
  $('#who').addEventListener('click', askName);

  renderBox(); drawMap(); renderWho();
  if (!state.name) askName();
  else if (G().done.length === game().items.length) win();
})();
