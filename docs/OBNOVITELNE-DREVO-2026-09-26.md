# Naplavené dřevo u východního břehu

Pracovní změna na větvi `game-sprint/2026-09-26-naplaveniny` navazuje na
`3ce7c0a`. `main` ani publikovaná hra Sites touto změnou dotčeny nejsou.

## Hráčský průchod

- Na východním břehu u souřadnic přibližně 6,2 / 5,4 leží viditelné poleno
  označené světlým kruhem. Hráč k němu dojde na klávesnici nebo joystickem;
  nástroj ani stavba nejsou potřeba.
- Přiblížení na 1,3 jednotky dá dvě dřeva přímo do inventáře. Poleno zmizí,
  zazní zvuk a objeví se zpráva. V batohu je stav i odpočet.
- Po 90 sekundách běhu simulace se poleno vrátí. Dílna, karta na pozadí a
  zavřená stránka odpočet neposouvají; otevřená nabídka stavění jej posouvá.
  Jediné místo dává opakovaně dvě dřeva,
  takže vykácení všech palem neuzamkne výrobu nebo stavby.
- Sběr lze opakovat stáním poblíž místa, jakmile nový kus dorazí. Poloha je
  těsně za hranicí povolených staveb, proto ji běžnou stavbou nelze zastavět.

## Uložení a kompatibilita

`schemaVersion` zůstává 2. Volitelné `world.driftwood` obsahuje `available` a
`remaining` (sekundy aktivního hraní, 0–90). Starší platné pozice v1 a v2 bez
pole dostanou při načtení dostupné první poleno. Hodnoty a jejich vzájemný
stav se ověřují před změnou živého ostrova i před zápisem do úložiště.
Budoucí neznámé schéma dál chrání primární slot před automatickým přepsáním;
export/import a záložní slot používají stejné ověření jako ostatní stav světa.

## Kontrola před začleněním

`npm test` prošel (22/22): skutečný model ostrova, přiblížení, jedinou odměnu,
pozastavení, uložení a obnovení odpočtu, opětovný sběr, migraci starších
pozic a odmítnutí vadného stavu. `node --check` pro dotčené moduly a
`git diff --check` prošly.

Headless Chromium se softwarovým WebGL otevřel hru na desktopu 1280 × 800
i mobilním rozměru 390 × 844. V pozici s nulovým dřevem a všemi palmami
vykácenými se poleno vykreslilo na pláži; klávesnice na desktopu a tažený
dotykový joystick na mobilu dovedly hráče k nálezu. V obou případech se
připsala přesně dvě dřeva, batoh ukázal odpočet a po obnovení stránky zůstaly
zásoby i odpočet. Prohlížeč nezachytil neodchycenou chybu JavaScriptu.
Návrat po celých 90 sekundách prohlížeč netestoval; jeho časování, viditelnost
a další sběr pokrývá test skutečného modelu. Zvuk se v automatizovaném
prohlížeči neposuzoval poslechem. Skutečné zařízení s dotykem a výkon mimo
softwarový WebGL zůstávají k ověření před veřejným vydáním.
