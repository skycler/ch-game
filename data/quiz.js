// Game definitions and quiz content (German UI). The app (app.js) only contains logic and rendering.
//
// games.<id>:  title, box (heading of the item box), points (per solved item; "write" mode adds +1),
//              hint, text (true = items are shown as text tiles instead of flags),
//              write {noun, click} (optional write mode), form {text, short, capital} (optional follow-up form),
//              wrong (message for a wrong drop; {name} = name of the item being placed)
// Items for cantons come from data/cantons.js, mountains from data/mountains.js, the rest from below.
window.QUIZ = {
  order: ['cantons', 'countries', 'lakes', 'mountains', 'rivers'],   // tab order

  games: {
    cantons: {
      title: 'Kantone', box: 'Flaggen', points: 4,
      hint: 'Flagge auf einen Kanton ziehen – oder Flagge anklicken und dann den Kanton anklicken.',
      form: {text: 'Richtiger Kanton! Jetzt die Angaben ausfüllen:', short: 'Kürzel (2 Buchstaben)', capital: 'Hauptort'},
      wrong: 'Das ist nicht der richtige Kanton für diese Flagge.'
    },
    countries: {
      title: 'Nachbarländer', box: 'Flaggen', points: 4,
      hint: 'Flagge auf ein Nachbarland ziehen – oder Flagge anklicken und dann das Land anklicken.',
      form: {text: 'Richtiges Land! Jetzt die Angaben ausfüllen:', short: 'Länderkürzel (z. B. Autokennzeichen)', capital: 'Hauptstadt'},
      wrong: 'Das ist nicht das richtige Land für diese Flagge.'
    },
    lakes: {
      title: 'Seen', box: 'Seen', points: 2, text: true, write: {noun: 'See', click: 'einen See'},
      hint: 'Seename auf den See ziehen – oder Namen anklicken und dann den See anklicken. Zoomen hilft bei kleinen Seen.',
      wrong: 'Das ist nicht der {name}.'
    },
    mountains: {
      title: 'Berge', box: 'Berge', points: 2, text: true, write: {noun: 'Berg', click: 'ein Dreieck ▲'},
      hint: 'Bergname auf das Dreieck ▲ ziehen – oder Namen anklicken und dann den Berg anklicken.',
      wrong: 'Das ist nicht der richtige Berg für «{name}».'
    },
    rivers: {
      title: 'Flüsse', box: 'Flüsse', points: 2, text: true, write: {noun: 'Fluss', click: 'einen Fluss'},
      hint: 'Flussname auf den Fluss ziehen – oder Namen anklicken und dann den Fluss anklicken.',
      wrong: 'Das ist nicht der Fluss «{name}».'
    }
  },

  // key = ISO code (flag file: flags/countries/<key>.svg), geo = name used in data/geo.js,
  // short/capital = accepted answers, label = [lon, lat] of the map label
  countries: [
    {key: 'DE', geo: 'Germany',       name: 'Deutschland',   short: ['D', 'DE'],  capital: ['Berlin'],        label: [8.9, 48.2]},
    {key: 'FR', geo: 'France',        name: 'Frankreich',    short: ['F', 'FR'],  capital: ['Paris'],         label: [5.6, 47.3]},
    {key: 'IT', geo: 'Italy',         name: 'Italien',       short: ['I', 'IT'],  capital: ['Rom', 'Roma'],   label: [8.3, 45.55]},
    {key: 'AT', geo: 'Austria',       name: 'Österreich',    short: ['A', 'AT'],  capital: ['Wien', 'Vienna'], label: [10.85, 47.3]},
    {key: 'LI', geo: 'Liechtenstein', name: 'Liechtenstein', short: ['FL', 'LI'], capital: ['Vaduz'],         label: [9.55, 47.17]}
  ],

  // id = swisstopo/BFS lake number (see data/geo.js); alt = accepted alternative spellings in write mode
  lakes: [
    {name: 'Genfersee',          id: 9757, alt: ['Lac Léman', 'Léman', 'Lake Geneva']},
    {name: 'Bodensee',           id: 9326, alt: ['Lake Constance']},
    {name: 'Lago Maggiore',      id: 9711, alt: ['Langensee', 'Lac Majeur']},
    {name: 'Neuenburgersee',     id: 9151, alt: ['Lac de Neuchâtel']},
    {name: 'Luganersee',         id: 9710, alt: ['Lago di Lugano', 'Lago Ceresio']},
    {name: 'Vierwaldstättersee', id: 9179, alt: ['Vierwaldstaettersee', 'Lac des Quatre-Cantons']},
    {name: 'Zürichsee',          id: 9050},
    {name: 'Thunersee',          id: 9073},
    {name: 'Brienzersee',        id: 9089},
    {name: 'Bielersee',          id: 9148, alt: ['Lac de Bienne']},
    {name: 'Zugersee',           id: 9175},
    {name: 'Walensee',           id: 9267},
    {name: 'Murtensee',          id: 9294, alt: ['Lac de Morat']},
    {name: 'Sempachersee',       id: 9163},
    {name: 'Hallwilersee',       id: 9172}
  ],

  // key = river name in data/geo.js, name = displayed name (defaults to key),
  // anchor = [lon, lat] near which the label is placed, major = drawn thicker
  rivers: [
    {key: 'Rhein',       anchor: [8.0, 47.58],  major: true, alt: ['Rhin', 'Reno']},
    {key: 'Rhône',       anchor: [7.2, 46.2],   major: true, name: 'Rhone', alt: ['Rhone']},
    {key: 'Aare',        anchor: [7.95, 47.42], major: true},
    {key: 'Reuss',       anchor: [8.3, 47.2],   major: true},
    {key: 'Limmat',      anchor: [8.45, 47.4]},
    {key: 'Inn',         anchor: [10.1, 46.75], major: true, alt: ['En']},
    {key: 'Ticino',      anchor: [8.85, 46.4],  major: true, alt: ['Tessin']},
    {key: 'Doubs',       anchor: [6.95, 47.3],  major: true},
    {key: 'Thur',        anchor: [9.1, 47.5]},
    {key: 'Saane',       anchor: [7.15, 46.7],  alt: ['Sarine', 'La Sarine']},
    {key: 'Emme',        anchor: [7.75, 47.0]},
    {key: 'Maggia',      anchor: [8.65, 46.3]},
    {key: 'Hinterrhein', anchor: [9.35, 46.62]},
    {key: 'Vorderrhein', anchor: [8.95, 46.73]}
  ],
  hiddenRivers: ['Lütschine', 'Töss', 'Glatt', 'Simme', 'Sihl', 'Kander']   // in data/geo.js but not drawn
};
