// Feedback and UI messages (German). Placeholders: {who} player name, {name} item, {title}, {pts}, {n} ...
// Arrays = one entry is picked at random.
window.TEXTS = {
  welcome: "Hallo {who}! Los geht's – du schaffst das! 🇨🇭",
  renamed: 'Alles klar, {who}!',
  left: '(noch {n})',
  anonymous: 'du',
  flagAlt: 'Flagge',
  nameLabel: 'Name',
  askName: 'Wie heisst dieser {noun}?',
  writeHintBox: 'Klicke auf {click} auf der Karte und schreibe den Namen.<br>Zoomen hilft bei kleinen Objekten.',
  writeHintMap: 'Klicke auf {click} und schreibe den Namen.',

  alreadyDone: '{who}, {name} hast du schon gelöst – such dir den nächsten!',
  alreadyDoneWrite: '{who}, {name} hast du schon gelöst – such dir einen anderen!',

  wrongPrefix: ['Nicht ganz, {who}!', 'Fast, {who}!', 'Gute Idee, {who}, aber nicht ganz.'],
  wrongSuffix: [' Probier es nochmal!', ' Du schaffst das!', ' Bleib dran!'],

  formWrongPrefix: ['Fast, {who}!', 'Nicht ganz, {who}.', 'Knapp daneben, {who}!'],
  formWrong: " Bei {name} stimmt eine Angabe noch nicht. Die Flagge ist wieder in der Box – beim nächsten Mal klappt's!",
  writeWrong: [' Der Name stimmt noch nicht – schau dir die Karte nochmal genau an.', ' Das ist nicht der richtige Name. Probier es gleich nochmal!'],
  writeWrongEnd: ' Du schaffst das!',

  success: ['Super, {who}!', 'Bravo, {who}!', 'Genau richtig, {who}!', 'Stark, {who}!', 'Top, {who}!', 'Das sitzt, {who}!'],
  successLine: ' {name}{detail} geschafft. +{pts} Punkte.',
  lastOne: ' Nur noch eins!',
  halfway: ' Halbzeit – super Tempo!',

  winTitle: '🎉 Bravo, {who}!',
  winText: "Du hast «{title}» komplett gelöst! Punkte: {score} · Fehler: {errors}. Weiter geht's mit «{next}» – du bist auf einem super Weg!",
  confirmReset: '{who}, «{title}» wirklich neu beginnen und Punkte zurücksetzen?'
};
