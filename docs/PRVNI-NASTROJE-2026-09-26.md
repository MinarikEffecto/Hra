# První nástroje od holých rukou

Pracovní kandidát z 26. 9. 2026 na větvi `feature/2026-09-26-first-tools`.
Navazuje na sázení palem, commit `774f6d76dccc42e55b5be3375e0b5f0fa6b3295b`
a [PR #2](https://github.com/MinarikEffecto/Hra/pull/2). Zatím není vydaný na Sites.

## Co hráč nově dělá

Nová hra začíná s holýma rukama. Tři označené hromádky na ostrově dávají po
přiblížení dva kameny; obnovují se po 60 sekundách aktivního hraní. V batohu
je tlačítko **Vyrobit nástroj**. Postup je následující:

| Krok | Spotřeba a předpoklady | Výsledek |
| --- | --- | --- |
| Ostrý úštěp | 2 kameny | Poseká keře; palmy ještě ne |
| Provizorní sekáč | Úštěp, 1 kámen, 1 dřevo | Zvládne i palmu |
| Opracovaná násada | Sekáč, 1 dřevo | Uložitelný díl sekery |
| Jednoduchá vazba | Sekáč, 2 listy | Druhý uložitelný díl sekery |
| Sekera | Sekáč a oba hotové díly | Rychlejší kácení; díly se spotřebují |
| Lopata | Sekera, 2 dřeva, 1 kámen | Zpřístupní kopání |
| Brokovnice | Sekera, blízký ponk, 2 dřeva, 2 měděné ingoty a 1 m lana | Pozdější herní vybavení |

První dřevo a listí jde sebrat v naplaveninách na východním břehu. Nevzniká
kruh „na nástroj potřebuješ dřevo, na dřevo hotovou sekeru“. Sekáč umožňuje
kácet už před dokončením násady a vazby. Interval úderů je 1,15 s u sekáče
a 0,66 s u sekery. Přepínání nabídne jen skutečně získané nástroje; starší
primitivní nástroj se v rámci stejné větve výroby nahradí lepším.

Průvodce na obrazovce sleduje kameny, úštěp, sekáč, díly sekery a lopatu.
Pak naváže na ohniště, uhlí, pec a měděný řezák. Recepty neodečítají nic,
pokud chybí suroviny, díl nebo stanice; dokončený nástroj nelze vyrobit podruhé.
Rozhraní funguje myší i dotykem a posouvá se i v nízkém okně na šířku.

## Pozice a kompatibilita

Formát pozice je **v5**. Přidává počet kamenů a oddíl `starter`: dosažený
stupeň nástroje, rozpracovanou násadu a vazbu, získání lopaty a brokovnice
a odpočty tří hromádek. Ukládá se i právě vybraný vlastněný nástroj.

Pozice v1–v4 se převádějí se zachováním původní sekery, lopaty i brokovnice.
Hráčům tedy jejich dosavadní výbava nezmizí. Nové pozice musí mít platný
postup a nesmějí odkazovat na nevyrobený nástroj. Chybná data se odmítnou
před přepsáním uložené pozice. Při otevřeném craftingu a skryté stránce
se odpočty kamenů neposouvají; zavřená hra je také nedopočítává.

## Ověření

- Automatická sada: **47/47** testů, z toho osm nových pro pravidla prvních
  nástrojů. Pokrývá postup a odečty, stanici, zbytek lana, zásah skutečné
  herní palmy, uložení dílů, převod všech v1–v4, odmítnutí poškozené pozice
  a návaznost průvodce bez nedostupného dřeva.
- `tests/browser/first-tools.mjs`: nový profil bez dodaných surovin nebo
  přemístění hráče. **Desktop 1280×800 i dotyk 390×844 prošly**: sběr kamenů
  a naplavenin, úštěp, zásah sekáčem, reload s násadou, vazba, sekera,
  pokácení palmy, lopata, kopání jílu a reload. Oba běhy bez chyb herního JS
  a místních souborů. Dotykový běh vyrábí vazbu a sekeru i v rozměru 568×320.
- Delší `tests/browser/progression.mjs` nově začíná stejnou výrobou a dále
  navazuje na tavení a spojené lano. **Celý dotykový průchod 390×844 prošel**
  bez dodaných surovin nebo přemístění hráče: čtyři palmy, vyrobená lopata,
  ohniště, uhlí, čtyři vrstvy výkopu, pec, tavba s reloadem, ponk, měděný
  řezák a dvě lana spojená na 2 m. Po posledním reloadu zůstal řezák,
  2 m lana o kvalitě 96 %, dva prameny, tři stavby a čtyřvrstvá jáma.
  Bez chyb konzole, herního JS a načítání. Externí fonty běh úmyslně vynechává.
- Regrese sázení v mobilním rozměru 390×844 rovněž prošla: připravená pozice
  v3 se načetla s původní sekerou, zasazení a reload fungovaly ve v5 a druhá
  sklizeň skončila s 5 dřevy, 6 listy a 4 kokosy. Bez chyb JS a místních
  souborů; zrání je v tomto scénáři výslovně zkrácené testovací pozicí.

Pravidla a celý postup byly ověřeny na místním commitu `9e64a5d`;
GitHub commit `7e9a58e462c715513c1ae14135a7a9fe8b7cbe69` má totožný strom
`4fd6c9f999e71e9bbfd1da300a8fdd013f214e25`. Následná drobná úprava nápovědy
a označení cíle doplňuje úštěp a sekáč do původně sekerového HUD.
Nápověda byla následně ověřena v opravdové hře na čtyřech připravených
stavech (ruce, úštěp u keře, sekáč a sekera u palmy), bez chyb JS.

Prohlížečové kontroly používají Chromium se softwarovým WebGL. Nenahrazují
kontrolu výkonu na fyzickém telefonu; externí fonty a vykreslení emoji na
konkrétním zařízení tímto také nejsou ověřené. Screenshots a anonymní profily
zůstávají dočasnými QA artefakty, ne hráčskými daty v Gitu.

## Rozsah předání

Jde o samostatnou navazující větev pro review. `main` ani Sites se tímto
nemění. Před vydáním zbývá kontrola na telefonu a rozhodnutí o začlenění
navazujících PR. Další obsah ostrova a skryté lokace zůstávají další etapou.
