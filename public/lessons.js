export const MANUAL = 'https://www.tesla.com/ownersmanual/modely/de_de/';
export const lessons = [
  {id:'doors',name:'Einsteigen',sub:'Der versenkte Griff',anchor:[-.91,1.02,.02],source:'GUID-7A32EC01-A17E-42CC-A15B-2E0A39FD07AB.html',steps:[
    {title:'Erst drücken.\nDann ziehen.',text:'Der Griff liegt bündig in der Tür. Drücke mit dem Daumen auf sein breites Ende. Der schmale Teil schwenkt heraus und lässt sich ziehen.',note:'Finger und Schmuck aus dem Mechanismus halten.',detail:'handle'},
    {title:'Innen öffnet\ndie Taste.',text:'Die normale Entriegelung sitzt oben am inneren Türgriff. Taste drücken und die Tür aufschieben. Der mechanische Hebel ist für den Ausfall der Stromversorgung.',detail:'interior'},
    {title:'Was passiert\nam Türgriff?',text:'Präge dir die Reihenfolge ein. Sie ist beim ersten Einsteigen ungewohnt.',quiz:{question:'Wie öffnest du die Tür von außen?',options:['Am versenkten Griff reißen','Breites Ende drücken, dann ziehen','Zweimal auf das Fenster tippen'],answer:1,success:'Genau. Der Daumendruck lässt den Griff herausschwenken.',retry:'Der bündige Griff muss zuerst herausschwenken.'}}
  ]},
  {id:'cabin',name:'Losfahren',sub:'Cockpit & Fahrmodus',anchor:[-.28,1.36,-.9],source:'GUID-E9B387D7-AFEF-4AAF-8685-4FE71E09287D.html',steps:[
    {title:'Ein Cockpit.\nEin Bildschirm.',text:'Im Stand zuerst Sitz, Spiegel und Umgebung prüfen. Bei geparktem Fahrzeug lässt ein Druck auf die Bremse die Fahrmodusleiste am Touchscreen erscheinen.',detail:'interior'},
    {title:'Hoch für D.\nRunter für R.',text:'In der Fahrmodusleiste nach oben wischen: vorwärts. Nach unten: rückwärts. Zum Parken die Bremse drücken und Parken berühren. Den angezeigten Modus vor dem Losfahren prüfen.',note:'Dies ist eine Lernübung im Stand. Den Fahrmodus niemals ungeprüft übernehmen.'},
    {title:'Richtung\nbewusst wählen.',text:'Die Dachkonsole bietet eine zweite Fahrmodusauswahl, wenn der Touchscreen nicht verfügbar ist.',quiz:{question:'Welche Bewegung wählt am Touchscreen den Rückwärtsmodus?',options:['Nach oben wischen','Nach unten wischen','Beide Scrollräder gedrückt halten'],answer:1,success:'Richtig. Nach unten wischen wählt R. Danach Umgebung und Anzeige prüfen.',retry:'D ist nach oben. Für R geht die Bewegung in die andere Richtung.'}}
  ]},
  {id:'charge',name:'Laden',sub:'Anschluss & Lichtsignale',anchor:[-1,1.05,1.93],source:'GUID-BEE08D47-0CE0-4BDD-83F2-9854FB3D578F.html',steps:[
    {title:'Hinten links.\nUnter der Klappe.',text:'Der Ladeanschluss sitzt an der linken Rückleuchte. Öffne ihn über den Touchscreen, die App oder den Knopf am passenden Ladekabel.',note:'Die Klappe nicht mit Gewalt öffnen.',detail:'chargePort'},
    {title:'Der Anschluss\nspricht in Farben.',text:'Grün pulsierend: lädt. Grün dauerhaft: fertig. Rot: ein Fehler verhindert das Laden oder hat es unterbrochen. Die Meldung am Touchscreen erklärt das Problem.',lab:'charge'},
    {title:'Rot heißt:\nAnzeige prüfen.',text:'Der Stecker verriegelt beim vollständigen Einstecken. Die Batterie kann vor Ladebeginn erst temperiert werden.',quiz:{question:'Das Licht am Anschluss wird rot. Was machst du?',options:['Den Stecker mit Kraft hineindrücken','Die Meldung am Touchscreen lesen','Rot bedeutet: Laden ist fertig'],answer:1,success:'Richtig. Die Fahrzeugmeldung prüfen; Rot ist kein Fertig-Signal.',retry:'Rot meldet ein Ladeproblem. Grün dauerhaft bedeutet fertig.'}}
  ]},
  {id:'frunk',name:'Frunk',sub:'Richtig schließen',anchor:[0,1.1,-1.8],source:'GUID-356E0168-47E5-400F-AD83-4F1B86C7D991.html',steps:[
    {title:'Vorne öffnen.\nIn Parkstellung.',text:'Den vorderen Kofferraum über Touchscreen oder App entriegeln, dann die Haube anheben. Vorher prüfen, ob der Bereich frei ist.',detail:'frunk'},
    {title:'Zwei Hände.\nDie richtigen Stellen.',text:'Die Haube absenken, bis der Bügel die Verriegelung berührt. Beide Hände auf die im Handbuch grün markierten Bereiche legen und fest herunterdrücken.',note:'Nicht fallen lassen. Nicht auf Mitte oder Vorderkante drücken.',detail:'frunk'},
    {title:'Vor der Fahrt:\nSitz prüfen.',text:'Die Haube vorsichtig anzuheben versuchen, um sicherzustellen, dass sie vollständig eingerastet ist.',quiz:{question:'Wie wird die Haube geschlossen?',options:['Aus halber Höhe fallen lassen','Mit einer Hand mittig drücken','Mit beiden Händen in den markierten Bereichen'],answer:2,success:'Genau. Zwei Hände, dann den sicheren Sitz prüfen.',retry:'Die leichte Haube rastet nicht zuverlässig durch ihr Eigengewicht ein.'}}
  ]},
  {id:'lights',name:'Licht',sub:'Die Juniper-Signatur',anchor:[0,.85,-2.39],source:'GUID-1C209641-AA23-47AC-B0D1-3FE3779CF222.html',steps:[
    {title:'Die neue\nLichtsignatur.',text:'Vorne eine durchgehende Lichtleiste mit tiefer sitzenden Scheinwerfern. Hinten ein breites, indirekt reflektiertes Lichtband: Das sind die markanten Juniper-Merkmale.',detail:'rear',extraSource:'https://www.tesla.com/learn/introducing-new-model-y',lab:'lights'},
    {title:'Automatik\nmit Verantwortung.',text:'Die Außenbeleuchtung steht bei jeder neuen Fahrt wieder auf Auto. Bei schlechter Sicht selbst prüfen, ob Scheinwerfer und Rückleuchten eingeschaltet sind.',note:'Tagfahrlicht allein bedeutet nicht, dass die Rückleuchten leuchten.'},
    {title:'Auch hinten\ngesehen werden.',text:'Die Lichteinstellungen findest du unter Fahrzeug → Beleuchtung.',quiz:{question:'Reicht Tagfahrlicht bei schlechter Sicht immer aus?',options:['Ja, damit leuchtet automatisch alles','Nein, Scheinwerfer und Rückleuchten prüfen'],answer:1,success:'Richtig. Tagfahrlicht allein garantiert kein eingeschaltetes Rücklicht.',retry:'Prüfe beide Seiten des Autos: vorn und hinten.'}}
  ]},
  {id:'emergency',name:'Ohne Strom',sub:'Notentriegelung kennen',anchor:[-1,1.06,.84],source:'GUID-A7A60DC7-E476-4A86-9C9C-10F4A276AB8B.html',steps:[
    {title:'Vorne:\nden Hebel anheben.',text:'Ohne Niederspannungsversorgung funktioniert die elektrische Türtaste nicht. Die manuelle Entriegelung liegt vor den Fensterheberschaltern.',note:'Nur bei Bedarf ohne Strom verwenden. Niemals während der Fahrt; das Fenster senkt sich möglicherweise nicht ab.',detail:'frontRelease'},
    {title:'Hinten:\nim Türfach.',text:'Die Abdeckung am Boden der Türtasche entfernen. Den mechanischen Entriegelungszug nach vorn ziehen. Zeige Mitfahrenden den Ort, bevor sie ihn brauchen.'},
    {title:'Kennen.\nNicht routinemäßig nutzen.',text:'Die mechanische Entriegelung ist der Ausweg bei einem Stromausfall. Im Alltag wird die elektrische Taste verwendet.',quiz:{question:'Wo sitzt die mechanische Entriegelung hinten?',options:['Unter der Abdeckung im Türfach','Im hinteren Touchscreen','Unter der Kopfstütze'],answer:0,success:'Richtig. Unter der Abdeckung am Boden der hinteren Türtasche.',retry:'Die mechanische Entriegelung liegt verborgen im Türfach.'}}
  ]},
  {id:'regen',name:'Rekuperation',sub:'Energie zurückgewinnen',anchor:[0,.48,.05],source:'GUID-3DFFB071-C0F6-474D-8A45-17BE1A006365.html',steps:[
    {title:'Vom Fahren\nzum Rückgewinnen.',text:'Während der Fahrt kann das Loslassen des Fahrpedals Energie in die Batterie zurückführen. Schalte in der 3D-Ansicht zwischen Fahren, Loslassen und Bremsen um.'},
    {title:'Kalt oder voll:\nweniger Rückgewinnung.',text:'Die Batterie kann dann weniger Energie aufnehmen. Laut aktuellem Handbuch ergänzen die normalen Bremsen die Verzögerung beim Loslassen des Fahrpedals.',note:'Vorausschauend fahren und bei Bedarf selbst bremsen. Diese Darstellung berechnet keinen Bremsweg.'},
    {title:'Energiefluss\nverstanden.',text:'Die grüne Energieanzeige steht für Rückgewinnung. Im Stillstand gibt es keine Bewegungsenergie zurückzugewinnen.',quiz:{question:'Was kann die Rekuperation einschränken?',options:['Eine kalte oder volle Batterie','Ein geöffnetes Navigationsmenü','Weiße Sitze'],answer:0,success:'Richtig. Die Aufnahmefähigkeit der Batterie begrenzt die Rückgewinnung.',retry:'Entscheidend ist, ob die Batterie Energie aufnehmen kann.'}}
  ]}
];

export function readProgress(storage) {
  try {
    const value=JSON.parse(storage.getItem('juniper-guide-v2'));
    return new Set(Array.isArray(value) ? value.filter(id=>lessons.some(l=>l.id===id)) : []);
  } catch { return new Set(); }
}
export function saveProgress(storage, completed) {
  try { storage.setItem('juniper-guide-v2',JSON.stringify([...completed])); } catch { /* private browsing: session remains usable */ }
}
