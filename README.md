# Filer til studerende

Dette er en enkel offentlig download-side til undervisningsfiler. Filer, der
ligger direkte i repoets rod eller i undermapper, bliver vist på siden og kan
downloades af de studerende. Læg ikke personoplysninger, karakterer eller
hemmelige facitlister i repoet: GitHub Pages-siden er offentlig.

## Sådan lægger du filer op

1. Klon GitHub-repoet med [GitHub Desktop](https://desktop.github.com/).
2. Læg eller opdater filer direkte i den lokale projektmappe. Du kan også bruge
   undermapper, hvis du vil sortere efter fag eller emne.
3. Åbn GitHub Desktop, gennemse ændringerne, skriv en kort beskrivelse, og vælg
   **Commit to main**.
4. Klik **Push origin**. GitHub Actions opdaterer automatisk fillisten og
   udgiver siden til GitHub Pages.

Filer med navne, der begynder med punktum, samt tekniske, aktive og midlertidige
filer bliver automatisk udeladt. Almindelige undervisningsformater som PDF,
Word, Excel, PowerPoint, billeder, lyd, video, STL, tekst og ZIP understøttes.
Pak andre filtyper som ZIP, før du synkroniserer dem.

## Første opsætning

I GitHub-repoets **Settings → Pages** vælges **GitHub Actions** som kilde. Når
workflowet har kørt første gang, viser GitHub den offentlige adresse til siden.

Den skjulte mappe `.site` indeholder selve hjemmesiden. Ved udgivelse bygges en
separat teknisk mappe, som kun indeholder siden og de godkendte studenterfiler.
Tekniske filer bliver aldrig vist i downloadlisten. Siden har ingen
uploadfunktion og kan hverken skrive til GitHub eller din computer.
