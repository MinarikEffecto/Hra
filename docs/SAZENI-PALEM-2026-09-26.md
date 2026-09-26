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

Prohlížečové scénáře prošly 26. 9. 2026 na herním kódu commitu
`b4f1d90075cbb3d91a8cf2d89a71f17cc9757843` a opraveném testovacím skriptu
`41a08968c85f9c5e86a19a44a21c3f87e0906b14`:

| Rozměr | Vstup | Výsledek po sklizni a reloadu |
| --- | --- | --- |
| 1280 × 800 | Myš + klávesnice | 5 dřev, 6 listů, 4 kokosy |
| 390 × 844 | Dotyk, akce u pařezu | 5 dřev, 6 listů, 4 kokosy |
| 568 × 320 | Dotyk, sázení z batohu | 5 dřev, 6 listů, 4 kokosy |

Čtyři výsledné kokosy jsou dva původní minus jeden zasazený plus tři z nové
palmy. Před druhou sklizní se nevytvořilo žádné dřevo ani listí. Zasazení,
uložení a reload běžely se skutečným tříminutovým nastavením; test pak
výslovně zkrátil čekání pomocí validní pozice s jednou sekundou do dorostení.
Všechny tři průchody skončily bez neodchycené chyby JavaScriptu a bez chyby
načtení místního souboru. Snímky batohu, sazenice a dospělé palmy byly
zkontrolovány; ovládání je dostupné i na krátkém displeji.

První běh testu chytil sdílené zásoby mezi profily softwarového Chromia.
Opravený skript čistí testovací úložiště, připravuje nulové suroviny a
před dalším rozměrem zastaví předchozí 3D stránku. V opraveném běhu prošly
všechny rozměry. Fyzický telefon, skutečná přesnost dotyku a výkon mobilního
GPU zatím ověřené nejsou; externí písmo je v testu blokované.

## Stav předání

Uživatel 26. 9. 2026 výslovně potvrdil odeslání na GitHub. Větev je nyní
v [PR #2](https://github.com/MinarikEffecto/Hra/pull/2), který navazuje na PR #1.
GitHub commity `f630432` (funkce) a `c413e65` (izolace testů) mají totožné
stromy jako místní `b4f1d90` a `41a0896`. API vytvořilo odlišná SHA commitů,
ikoli odlišný herní kód. Ověřený strom celé implementace a testů:
`2d085753beffe05b7f5f5733ab25c34e814be9e7`.

`main` a živý Sites zůstávají beze změny. Tato větev není vydání hry.

## Další krok

Ověřit na fyzickém telefonu společně s předchozí etapou. Potom dokončit
review a připravit samostatné vydání. Návazný obsahový úkol zůstává postupná
výroba prvních nástrojů; není automaticky součástí tohoto commitu.
