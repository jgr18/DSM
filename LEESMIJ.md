# DSM-werkbank

**Versie 0.2** — het versienummer staat in de kop van de werkbank. Na een update laadt de browser dankzij `?v=0.2` achter de scripts en de opmaak de nieuwe bestanden.

Webtool voor de analyse van projecten en processen met een Design Structure Matrix (DSM). De tool draait volledig in de browser: er is geen server, database of account nodig.

## Mogelijkheden

**Invoer**
- Activiteiten toevoegen door te typen of te plakken uit Excel: één per regel, `naam` of `naam ⇥ verantwoordelijke`.
- Elke activiteit krijgt een unieke, blijvende ID (A001, A002, …). Een verwijderde ID wordt nooit opnieuw uitgegeven.
- Relaties vastleggen in de matrix. Een **rij** is de **ontvanger** (heeft informatie nodig) en een **kolom** is de **leverancier**. A → B betekent: B heeft informatie van A nodig.
- Vier soorten relaties: **I** informatieafhankelijkheid, **H** harde uitvoeringsvoorwaarde, **B** bescherming, **A** toestemming voor een voorlopige aanname. Zelfiteraties leg je vast op de diagonaal.
- Per relatie: welke informatie nodig is, en later eventueel zekerheid, frequentie en bron.
- Met het toetsenbord snel invoeren: pijltjes, I/H/B/A, Delete en Enter.

**Analyse**
- Iteratieblokken bepalen met het algoritme van Tarjan. Zelfiteraties worden apart herkend.
- De blokken worden topologisch geordend. Bij een keuze gaat het blok met de laagste ID voor.
- Binnen elk blok wordt de beste volgorde gezocht volgens deze doelvolgorde:
  1. harde voorwaarden respecteren;
  2. het aantal terugkoppelingen minimaliseren;
  3. (instelbaar) minder terugkoppelingen met wisseling van verantwoordelijke;
  4. de totale terugkoppelafstand minimaliseren;
  5. bij gelijkstand: laagste-ID-volgorde.
- Blokken tot en met 8 activiteiten (instelbaar, maximaal 9) worden volledig doorzocht. De uitkomst is dan **bewezen optimaal** voor deze doelvolgorde.
- Grotere blokken krijgen een gulzige start plus lokaal verplaatsen, tot er geen verbetering meer is of de tijdlimiet is bereikt. De tool meldt dan **"beste gevonden — niet bewezen"**, met de reden.
- Een harde tegenspraak, een kring van alleen harde voorwaarden, wordt gemeld.
- Alle activiteiten en relaties blijven behouden; alleen de volgorde verandert. Een iteratieblok is geen advies om taken samen te voegen of gelijktijdig uit te voeren.

**Vergelijking**
- De oorspronkelijke en de voorgestelde volgorde naast elkaar: het aantal terugkoppelingen (ook met wisseling van verantwoordelijke), de totale en grootste terugkoppelafstand, geschonden harde voorwaarden en de activiteiten per iteratieblok.
- Welke activiteiten en blokken structureel parallel kunnen.
- Wijzigingsimpact: welke activiteiten direct en indirect mogelijk geraakt worden door een wijziging.
- Het zijn structurele maten. Ze worden niet omgerekend naar hersteluren of doorlooptijd, en capaciteit valt buiten de analyse.

**Controleerbaarheid**
- De analyse bewaart de invoerversie en de instellingen waarmee hij is berekend.
- Na een relevante wijziging staat de analyse op **verouderd**.
- Foutmeldingen noemen de bron (bijvoorbeeld het plakveld met regelnummer) en een herstelactie.
- `controle.html` rekent vaste controlevoorbeelden door: ketens, cycli, losse blokken, zelfiteraties, harde voorwaarden en tegenspraken, gewijzigde regelvolgorde, actualiteit, ID's en een model van 100 activiteiten.

**Nog niet beschikbaar:** scenario's en tears, en het opgemaakte rapport (PDF en Excel met handleiding). Ook afdelingen, beschikbaarheidsdatums, doorlooptijd, capaciteit en simulatie zitten er nog niet in.

## Wijzigingen in versie 0.2

- **Iteratieblokken** krijgen een duidelijk kader in de matrix.
- **De diagonaal** is donkergrijs, met het volgnummer van de activiteit. De relaties hebben lichtere tinten, zodat diagonaal en relaties goed te onderscheiden zijn. Een zelfiteratie (↻) is bijna zwart. Je zet hem aan of uit met de spatiebalk op een vakje van de diagonaal.
- **Rijen en kolommen** hebben een volgnummer (1, 2, 3 …) in de getoonde volgorde.
- **Aanwijzen en selecteren:**
  - wijs je een vakje aan, dan lichten de kolomkop en de rijnamen van de ontvanger en de leverancier licht op;
  - selecteer je een vakje, dan worden ze sterk gekleurd;
  - een streepje links geeft de ontvanger (donker) en de leverancier (groenblauw) aan.
- **Selectiekleur:** selecteren is groenblauw, zodat het niet meer lijkt op de gele tint van een iteratieblok.
- **Vakjes** groeien mee met de beschikbare ruimte: tussen 22 en 40 pixels.
- **Hulplijnen:** na elke 5 rijen en kolommen staat een subtiele, iets dikkere lijn, die dunner is dan het blokkader.
- **Uitleg per relatiesoort:**
  - Relaties: wijs een soort aan in de legenda of bij *Geselecteerde cel*; de uitleg verschijnt rechts;
  - DSM analyse: wijs een item in de legenda aan; de uitleg verschijnt eronder.

## Opslag

- Het model wordt automatisch in de browser bewaard (localStorage). Dat geldt alleen voor die ene browser op die ene computer.
- Met **Opslaan** download je een modelbestand (`.json`) met alle activiteiten, relaties, instellingen en de laatste analyse. Met **Openen** laad je zo'n bestand weer in. Gebruik dit als back-up en om modellen uit te wisselen.
- Met **Voorbeeld** laad je een voorbeeldmodel van 12 activiteiten.

## Installatie

### Online via GitHub Pages
1. Maak op github.com een nieuwe repository aan, bijvoorbeeld `dsm-werkbank`, met zichtbaarheid **Public**.
2. Kies in de lege repository **uploading an existing file** en sleep alle bestanden en mappen uit deze map erin. Klik op **Commit changes**.
3. Ga naar **Settings → Pages**. Kies bij *Source* voor **Deploy from a branch**, met branch **main** en map **/ (root)**, en klik op **Save**.
4. Na een à twee minuten staat de tool op `https://<jouw-gebruikersnaam>.github.io/dsm-werkbank/`.

### Lokaal
Pak de map uit en dubbelklik op `index.html`. De tool werkt in een recente versie van Chrome, Edge, Firefox of Safari, ook zonder internet.

## Bestanden

| Bestand | Inhoud |
|---|---|
| `index.html` | De werkbank |
| `controle.html` | Controlevoorbeelden van de rekenkern |
| `css/style.css` | Opmaak |
| `js/model.js` | Gegevensmodel, ID's, validatie en opslag |
| `js/analyse.js` | Tarjan, ordening, optimalisatie, maten en impact |
| `js/app.js` | Schermen en bediening |
| `js/controle.js` | Definitie van de controlevoorbeelden |
| `js/voorbeeld.js`, `voorbeelden/voorbeeldmodel.json` | Voorbeeldmodel |

## Methodische basis

De begrippen en de werkwijze volgen de DSM-methode zoals beschreven door Eppinger en Browning (*Design Structure Matrix Methods and Applications*), met nadruk op de hoofdstukken over procesarchitectuur. Of de tool volledig overeenkomt met het boek, is nog niet passage voor passage gecontroleerd.
