# Håndmatematikspil

Et offline matematikspil til browseren, som styres med håndtegn. Spillet bruger den lokale MediaPipe Hands-model til at registrere begge hænder og aflæse cifrene 0–9.

## Start spillet

På Windows skal du dobbeltklikke på `START_IN_CHROME.bat`. Den starter en lokal webserver og åbner `http://localhost:8080/` i Chrome.

Åbn ikke `index.html` direkte som en `file://`-adresse. Chrome tillader normalt ikke kameraadgang der. Du kan også starte serveren manuelt fra denne mappe:

```powershell
python -m http.server 8080
```

Åbn derefter [http://localhost:8080](http://localhost:8080), klik på **Start kamera**, og tillad kameraadgang.

Spillet har ingen backend og kræver ingen internetforbindelse. MediaPipe-kode, modeller og WASM-filer ligger lokalt i `vendor/mediapipe/`.

## Vælg spil

- **Håndtegn** er den oprindelige tilstand: vælg mellem tre niveauer og løs plus-, minus-, gange- og divisionsopgaver med højre hånds cifre og venstre hånds lås.
- **BeatSaber** er træning af tabeller fra 2 til 10. Vælg tabel og derefter **Let** eller **Svær**.

## Sådan spiller du Håndtegn

- Vælg **Niveau 1**, **Niveau 2** eller **Niveau 3**. Niveau 1 bruger små tal, niveau 2 mellemstore tal, og niveau 3 større eller mere krævende opgaver.
- Løs en plus-, minus-, gange- eller divisionsopgave. Division viser kun hele svar.
- Vis ASL-cifret 0–9 med højre hånd. Du kan også pege på et ciffer i tastaturet til højre.
- Vis **tommel op med venstre hånd** for at låse cifferet og gå videre direkte.
- Sænk tommelen igen, før du bruger tommel op til at låse det næste ciffer.
- Alternativt kan du pege med venstre pegefinger på **LÅS** øverst og derefter pege på **LÅS** igen for at godkende.
- Vis **tommel ned med venstre hånd** i bekræftelsesfasen og hold den nede et kort øjeblik for at slette det låste ciffer. Statuslinjen viser fremskridtet.
- Peg på **NEJ / SLET** nederst for at slette et låst ciffer.
- Mus og touch på de samme knapper fungerer som ekstra mulighed uden kamera.
- Tommel op og tommel ned virker kun som kommandoer fra venstre hånd. Højre hånd bruges kun til cifferet.
- Ved svar fra 10–99 indtastes enercifret først og tiercifret bagefter.
- ASL-tegnet for `0` er en O-form. Ved `6`–`9` rører tommelfingeren henholdsvis lillefinger, ringfinger, langfinger og pegefinger.
- Hvert korrekt svar giver en kort sjov fejring. Ved hvert 10. korrekte svar kommer en større fejring med konfetti.

Oversigten over tegnene 1–10 ligger lokalt i `assets/asl-numbers-1-10.png`.

## Sådan spiller du BeatSaber

- Vælg en tabel fra 2 til 10.
- I **Let** kommer målene i stigende rækkefølge. I 3-tabellen er rækken derfor 3, 6, 9, 12, 15, 18 og videre.
- I **Svær** blandes rækkefølgen af de 12 mål i hver runde.
- Der vises altid fire kasser i alt: ét rigtigt mål og tre decoys.
- Kasserne starter forskellige steder og flyver frem og tilbage over hele kameraområdet.
- Du starter med **3 liv**. Et forkert slag bruger ét liv, og spillet stopper, når alle liv er brugt. Slå **Liv** fra for at spille uden livbegrænsning.
- Efter et rigtigt slag er der en kort pause. Derefter vises en stor nedtælling fra 3, 2, 1, før næste bølge kommer.
- Stræk en pegefinger i kameraet. Den tegnes som et lyssværd.
- Skær kassen med det næste multiplum af tabellen. Kasser med andre tal er decoys og bliver stående, hvis du rammer dem.
- En runde har 12 rigtige mål. Et forkert slag nulstiller stregen og trækker højst ét point fra.

## Hvis kameraet ikke virker

- Kontrollér, at adressen er `http://localhost:8080` og ikke starter med `file://`.
- Klik på **Start kamera**, og tillad kameraadgang. Status skal skifte til **Direkte**.
- Luk andre programmer, som bruger kameraet.
- Hold hele hånden i billedet med håndfladen mod kameraet og lys forfra.
- Hvis du tidligere afviste kameraet, skal du tillade det i Chromes webstedsindstillinger og genindlæse siden med `Ctrl+F5`.

Kamerabilledet og håndens punkter behandles kun i browseren. Video bliver ikke sendt væk fra enheden.

## Test

Kør de automatiske kontroller af lokale modeller, cifrene 0–9, inputknapper, tommeltegn, sletning og tocifrede svar:

```powershell
npm test
```

## Filer

- `index.html` – dansk brugerflade og indlæsning af den lokale MediaPipe-model.
- `styles.css` – responsivt design, pegezoner og fejringseffekter.
- `app.js` – kamera, håndsporing, Håndtegn, BeatSaber, input, kontrolknapper og point.
- `tests/app.test.cjs` – automatiske funktionstests.
- `vendor/mediapipe/` – lokale MediaPipe Hands-filer.
