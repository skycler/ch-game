(() => {
  const $ = s => document.querySelector(s);
  const svg = d3.select('#map');

  // ---------- games (definitions and content live in data/quiz.js, texts in data/texts.js) ----------
  const T = TEXTS;
  const fmt = (s, v = {}) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
  const pick = arr => arr[Math.random() * arr.length | 0];

  // build the item list of every game; items need {key, name}; flag games also {flag, answers}
  const ITEMS = {
    cantons: () => Object.entries(CANTONS).map(([id, c]) => ({
      key: c.code, name: c.name, id: +id, flag: `flags/${c.code}.svg`,
      answers: {short: [c.code], capital: [c.capital, ...c.alt]}
    })),
    countries: () => QUIZ.countries.map(c => ({
      key: c.key, geo: c.geo, name: c.name, label: c.label, flag: `flags/countries/${c.key}.svg`,
      answers: {short: c.short, capital: c.capital}
    })),
    lakes: () => QUIZ.lakes.map(l => ({key: l.name, name: l.name, id: l.id, alt: l.alt || []})),
    mountains: () => MOUNTAINS.map(m => ({key: m.name, name: m.name, lon: m.lon, lat: m.lat, ele: m.ele, alt: m.alt || []})),
    rivers: () => QUIZ.rivers.map(r => ({key: r.key, name: r.name || r.key, anchor: r.anchor, major: !!r.major, alt: r.alt || []}))
  };
  const GAMES = Object.fromEntries(QUIZ.order.map(g => [g, {...QUIZ.games[g], items: ITEMS[g]()}]));
  const countryItems = GAMES.countries.items, lakeItems = GAMES.lakes.items,
        mountainItems = GAMES.mountains.items, riverItems = GAMES.rivers.items;
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
    s.mode = s.mode || {};
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
  const who = () => state.name || T.anonymous;
  const G = () => state.g[state.cur];
  const isWrite = () => !!GAMES[state.cur].write && state.mode[state.cur] === 'write';
  const game = () => GAMES[state.cur];

  let selected = null;   // item key selected in the box
  let pending = null;    // item key waiting for the form
  let pendingWrite = false;

  // ---------- geo ----------
  const cantons = topojson.feature(GEO.topo, GEO.topo.objects.cantons).features;
  const lakes = topojson.feature(GEO.topo, GEO.topo.objects.lakes).features;
  const countries = GEO.countries.map(c => ({type: 'Feature', properties: {name: c.name}, geometry: c.geometry}));
  const rivers = GEO.rivers.filter(r => !QUIZ.hiddenRivers.includes(r.name));
  const MAJOR = new Set(riverItems.filter(r => r.major).map(r => r.key));

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
    if (g === 'countries') return itemOf(g, key).label;
    if (g === 'lakes') return d3.geoCentroid(lakes.find(f => f.id === itemOf(g, key).id));
    if (g === 'rivers') return nearestPoint(key, ...itemOf(g, key).anchor);
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
    countryItems.forEach(c => put(c.name, c.label, 'country'));
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
  svg.on('click', ev => {
    const k = targetAt(ev.clientX, ev.clientY);
    if (k == null) return;
    if (isWrite()) { askToName(k); return; }
    if (selected) guess(selected, k);
  });
  svg.on('pointermove', ev => { if (!drag && pending == null) hover(selected || isWrite() ? targetAt(ev.clientX, ev.clientY) : null); });
  svg.on('pointerleave', () => { if (!drag && pending == null) hover(null); });

  // ---------- box ----------
  const tileHTML = it => game().text ? it.name : `<img src="${it.flag}" alt="${T.flagAlt}" draggable="false">`;
  function renderBox() {
    const box = $('#box'); box.innerHTML = ''; box.classList.toggle('text', !!game().text);
    const writing = isWrite();
    box.classList.toggle('writing', writing);
    if (writing) box.innerHTML = `<p class="writehint">${fmt(T.writeHintBox, {click: game().write.click})}</p>`;
    for (const key of writing ? [] : G().order) {
      if (G().done.includes(key)) continue;
      const d = document.createElement('div');
      d.className = 'flag'; d.dataset.key = key; d.innerHTML = tileHTML(itemOf(state.cur, key));
      box.appendChild(d);
    }
    $('#boxtitle').textContent = game().box;
    $('#hint').textContent = writing ? fmt(T.writeHintMap, {click: game().write.click}) : game().hint;
    const modes = $('#modes'); modes.hidden = !game().write;
    modes.querySelectorAll('button').forEach(b => b.classList.toggle('active', (b.dataset.m === 'write') === writing));
    updateStats();
  }
  const tileEl = key => document.querySelector(`.flag[data-key="${CSS.escape(key)}"]`);
  function updateStats() {
    const g = G(), n = game().items.length;
    $('#score').textContent = g.score; $('#done').textContent = g.done.length; $('#total').textContent = n; $('#errors').textContent = g.errors;
    $('#left').textContent = fmt(T.left, {n: n - g.done.length});
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
  $('#modes').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    state.mode[state.cur] = b.dataset.m; save(); select(null); hover(null); lastHover = null; renderBox();
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
    if (G().done.includes(targetKey)) { toast(fmt(T.alreadyDone, {who: who(), name: hit.name}), 'err'); select(null); return; }
    if (targetKey !== key) { fail(fmt(pick(T.wrongPrefix), {who: who()}) + ' ' + fmt(GAMES[g].wrong, {name: it.name}) + pick(T.wrongSuffix), key); return; }
    if (!it.answers) { succeed(key); return; }
    pending = key; pendingWrite = false;
    modalLayout(false);
    const f = GAMES[g].form;
    $('#mflag').src = it.flag; $('#mname').textContent = it.name; $('#mtext').textContent = f.text;
    $('#l1').textContent = f.short; $('#l2').textContent = f.capital;
    $('#short').value = ''; $('#capital').value = '';
    $('#modal').hidden = false;
    setTimeout(() => $('#short').focus(), 30);
  }

  function modalLayout(write) {
    $('#short').closest('label').hidden = write; $('#short').required = !write;
    $('#mflag').hidden = write; $('#mname').hidden = write;
  }
  function askToName(k) {
    const g = state.cur, it = itemOf(g, k);
    if (G().done.includes(k)) { toast(fmt(T.alreadyDoneWrite, {who: who(), name: it.name}), 'err'); return; }
    pending = k; pendingWrite = true; hover(k);
    modalLayout(true);
    $('#mtext').textContent = fmt(T.askName, {noun: GAMES[g].write.noun});
    $('#l2').textContent = T.nameLabel; $('#short').value = ''; $('#capital').value = '';
    $('#modal').hidden = false;
    setTimeout(() => $('#capital').focus(), 30);
  }
  const lev = (a, b) => { const d = Array.from({length: a.length + 1}, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1)); return d[a.length][b.length]; };
  // exact match (ignoring case, accents, spaces, punctuation); one typo tolerated for longer names
  const nameOk = (input, it) => { const x = norm(input).replace(/ /g, ''); if (!x) return false;
    return [it.name, ...(it.alt || [])].some(n => { const y = norm(n).replace(/ /g, ''); return x === y || (y.length >= 6 && lev(x, y) <= 1); }); };
  const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  $('#form').addEventListener('submit', ev => {
    ev.preventDefault();
    const key = pending;
    if (pendingWrite) {
      const ok = nameOk($('#capital').value, itemOf(state.cur, key));
      pending = null; pendingWrite = false; $('#modal').hidden = true; hover(null);
      if (ok) succeed(key);
      else fail(fmt(pick(T.formWrongPrefix), {who: who()}) + pick(T.writeWrong) + T.writeWrongEnd, key);
      return;
    }
    const f = GAMES[state.cur].form, a = itemOf(state.cur, key).answers;
    const okShort = a.short.some(s => s.toUpperCase() === $('#short').value.trim().toUpperCase());
    const cap = norm($('#capital').value);
    const okCap = a.capital.some(c => norm(c) === cap);
    pending = null; $('#modal').hidden = true;
    if (okShort && okCap) succeed(key, a.capital[0]);
    else {
            fail(fmt(pick(T.formWrongPrefix), {who: who()}) + fmt(T.formWrong, {name: itemOf(state.cur, key).name}), key);
    }
  });
  function succeed(key, capital) {
    const g = state.cur, it = itemOf(g, key), pts = GAMES[g].points + (isWrite() ? 1 : 0);
    G().done.push(key); G().score += pts; save();
    markDone(g, key); tileEl(key)?.remove(); select(null); updateStats();
    const left = GAMES[g].items.length - G().done.length;
    const extra = left === 0 ? '' : left === 1 ? T.lastOne : G().done.length === Math.ceil(GAMES[g].items.length / 2) ? T.halfway : '';
    const detail = capital ? ` (${capital})` : it.ele ? ` (${it.ele} m)` : '';
    toast(fmt(pick(T.success), {who: who()}) + fmt(T.successLine, {name: it.name, detail, pts}) + extra, 'ok');
    if (G().done.length === GAMES[g].items.length) win();
  }
  const cancel = () => { if (pending == null) return; const k = pending; pending = null; pendingWrite = false; $('#modal').hidden = true; select(null); hover(null); bounce(k); };
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
    $('#wintitle').textContent = fmt(T.winTitle, {who: who()});
    const next = ORDER[(ORDER.indexOf(state.cur) + 1) % ORDER.length];
    $('#winmsg').textContent = fmt(T.winText, {title: game().title, score: G().score, errors: G().errors, next: GAMES[next].title});
    $('#win').hidden = false;
  }
  $('#win').addEventListener('click', e => { if (e.target.id === 'win') $('#win').hidden = true; });
  function reset() {
    state.g[state.cur] = fresh(state.cur); save();
    selected = null; $('#win').hidden = true;
    renderBox(); drawMap();
  }
  $('#reset').addEventListener('click', () => { if (confirm(fmt(T.confirmReset, {who: who(), title: game().title}))) reset(); });
  $('#again').addEventListener('click', reset);

  // controls
  $('#zin').onclick = () => svg.transition().duration(250).call(zoom.scaleBy, 1.6);
  $('#zout').onclick = () => svg.transition().duration(250).call(zoom.scaleBy, 1 / 1.6);
  $('#zreset').onclick = () => svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
  $('#labels').onchange = e => svg.classed('nolabels', !e.target.checked);
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(drawMap, 150); });

  // ---------- player name ----------
  function renderWho() { $('#who').textContent = '👤 ' + (state.name || ''); }
  function askPlayer() {
    $('#nameinput').value = state.name || '';
    $('#welcome').hidden = false;
    setTimeout(() => { $('#nameinput').focus(); $('#nameinput').select(); }, 30);
  }
  $('#nameform').addEventListener('submit', ev => {
    ev.preventDefault();
    const first = !state.name;
    state.name = $('#nameinput').value.trim().slice(0, 24) || T.anonymous; save();
    $('#welcome').hidden = true; renderWho();
    toast(fmt(first ? T.welcome : T.renamed, {who: state.name}), 'ok');
  });
  $('#who').addEventListener('click', askPlayer);

  renderBox(); drawMap(); renderWho();
  if (!state.name) askPlayer();
  else if (G().done.length === game().items.length) win();
})();
