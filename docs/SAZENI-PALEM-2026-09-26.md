# Sázení kokosů a obnova palem

Navazující etapa po dokončení mobilní dílny a první tavby. Základ:
`bc66ffc7c3e137b76a798d111d7f1ada4aadffcb` ve větvi
`game-sprint/2026-09-25-mobilni-dilna` (PR #1). Samostatná větev:
`feature/2026-09-26-coconut-regrowth`. Jde o kandidáta, ne o vydání na Sites.

## Hratelný celek

- U pokácené palmy seber kokos a přibliž se k pařezu do 1,8 metru.
- Klepni na **🌱** vedle ostatních akcí nebo otevři batoh a použij
  **Zasadit kokos · 1 🥥**. Zelená kružnice označuje vybrané místo.
- Úspěšné zasazení spotřebuje právě jeden kokos. Bez suroviny, při práci
  s nástrojem, ve vodě, ve vzduchu, u stojící/padající palmy či na obsazeném
  místě se neodečte nic. Opakovaný klik na sazenici nic nespotřebuje.
- Sazenice viditelně roste **180 sekund aktivní simulace**. Batoh ukazuje
  zbývající čas a počet sazenic. Dílna a technologický dialog růst pozastaví;
  v zavřené či skryté kartě růst neběží. Batoh a nabídka staveb růst nezastaví.
- Dospělá palma má znovu 4 zásahy zdraví, 3 kokosy a běžnou sklizeň
  5 polen + 6 listů. Lze ji znovu pokácet a zasadit další kokos.
- Pokud hráč stojí přímo v místě kmene, dokončení čeká na jeho odstoupení,
  aby jej nový kmen nezablokoval.

Sází se do původních míst pokácených palem. Nové pozice stromů, zalévání,
offline růst a přirozené přesévání nejsou součástí tohoto celku. Naplavené
dřevo a listí na břehu zůstávají dostupné i bez kokosů.

## Stavby, výkopy a ukládání

Sazenice zabírá své místo i pro stavění a rozšiřování výkopů. Vysazení nelze
provést přes existující stavbu nebo jámu. Stejná pravidla platí při načtení.
I historicky pokácené palmy mají po obnovení viditelný pařez.

Formát pozice je **v4**. Pole `world.plantings` obsahuje původní index palmy
a zbývající čas. Rostoucí palma se v seznamu stromů zapisuje jako `gone`
s nulovým zdravím a nulou kokosů; sazenici obnovuje samostatný údaj.
Pořadí stromů ani podpis rozložení ostrova se nemění.

Pozice v1, v2 a v3 se převedou bez sazenic a zachovají inventář, pokácené
stromy, stavby i výrobu. Při v4 se kontrolují meze času, index stromu,
duplicity, stav stromu, ovoce a překrytí stavbou nebo jámou. Neplatný import
nepřepisuje funkční slot ani zálohu. Starší kód v3 novou primární pozici
chrání jako budoucí schéma; návrat vydání není downgrade uložených dat.

Růst je v `dist/palm-growth.js`, jeho ovládání v `dist/palm-growth-ui.js`.
Původní objekt palmy zachovává identitu, obnovuje se jen jeho model a
kolize. Kokosy se při dorostení přiřadí k nové koruně. Staré geometrie se
uvolní, sdílené materiály zůstávají.

## Ověření

`npm test`: **39/39**. Šest nových regresních scénářů ověřuje spotřebu
kokosu, opakovaný klik, překážky a navazující stavbu, čas a pauzu, bezpečné
dorostení, druhou sklizeň, save/reload v4, migrace v1–v3 a odmítnutí
poškozeného importu. Původní testy dílny, technologie a ukládání také prošly.

Opakovatelná kontrola skutečné hry: `npm run planting --prefix tests/browser`.
Její přesný rozsah a omezení jsou v [návodu testů](../tests/browser/README.md).
Výsledky prohlížeče budou doplněny po dokončení scénářů.

## Další krok

Ověřit na fyzickém telefonu společně s předchozí etapou. Potom dokončit
review a připravit samostatné vydání. Návazný obsahový úkol zůstává postupná
výroba prvních nástrojů; není automaticky součástí tohoto commitu.
