# Håndmatematikspil – projektstatus

- Formål: Offline matematikspil i browseren med lokal MediaPipe Hands-håndsporing.
- Start: Dobbeltklik på `START_IN_CHROME.bat`, eller kør `python -m http.server 8080` og åbn `http://localhost:8080`. Brug ikke `file://`.
- Nuværende version: `beatlives-1`. Håndtegn har tre niveauer med plus, minus, gange og heltalsdivision; niveauerne øger gradvist talstørrelse og sværhedsgrad. BeatSaber har valgfri livtilstand med 3 liv som standard, game over efter sidste fejl og mulighed for at slå liv fra.
- Kontrol: 30/30 automatiske tests består. Kontrollen dækker Håndtegn-niveauer, alle fire regnearter, BeatSaber-liv til/fra, livstab, game over, hele divisionssvar og tocifret input. Fysisk kameraforsøg er ikke gentaget i denne ændring.
- Begrænsning: Brugeren skal tillade kameraadgang, og kameraet må ikke være optaget af et andet program.
- Næste nyttige skridt: Afprøv pegezonerne med forskellige håndstørrelser, lysforhold og vinduesstørrelser.
