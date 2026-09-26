# Dokončení herního sprintu — 26. 9. 2026

Stav: ověřený kandidát k review v [PR #1](https://github.com/MinarikEffecto/Hra/pull/1).
Tato zpráva nahrazuje starší poznámky „finální průchod probíhá“.

## Přesná testovaná verze

- GitHub: [786fb81](https://github.com/MinarikEffecto/Hra/commit/786fb81e79517a18708a3709597467757b1b45f5).
- Strom souborů: `4719cf727914b0f13cf9ebf08f8f5b91f2afcaf1`.
- Místní testovací commit `38c806e66fd8232c27c395087c18615eab6bcd37` má totožný strom.
  Shoda byla ověřena po stažení GitHub commitu pomocí Git, bez rozdílu souborů.
- Během souvislého průchodu se herní kód ani testovací skript neměnily.
  Následný commit přidává pouze výsledky a dokumentaci.
- Výchozí stav této kontroly: `71d84a5`; základ sprintu na `main`: `518064f`.

## Opravené chyby

1. První myší klik po velmi rychlém načtení stránky a další rychle následující
   klik byly chybně potlačeny časovým filtrem dotyků. Filtr nyní vzniká jen
   po skutečném dotyku.
2. Mobilní tlačítko po tahu po plátně v některých situacích nedostalo
   syntetický klik. Přechod, opakování a zavření nyní reagují na uvolnění
   dotyku; případný duplicitní klik se potlačí.
3. Obrazovka 390×480 dostávala postranní rozložení pro telefon na šířku.
   Plátno bylo široké jen přibližně 141 px. Nyní zůstává na výšku pod
   nadpisem a má 370×329 px. Úzké telefony na šířku zachovávají postranní panel.

## Výsledky

| Kontrola | Výsledek | Co ověřuje |
| --- | --- | --- |
| `npm test` | 33/33 | Řezání, pletení, vstupy, inventář, migrace, zálohy, rozložení světa a technologie |
| Syntaxe a `git diff --check` | Prošlo | Dotčený modul a čistota změn |
| `npm test --prefix tests/browser` | 7/7 rozměrů | Skutečný modul dílny a CSS, myš nebo dotyk, viditelnost přechodu a hotové lano |
| `npm run progression --prefix tests/browser` | Prošlo | Skutečný 3D ostrov, nová hra až po uložené spojené lano |

### Dílna v Chromiu

Samostatný scénář používá malý testovací inventář a skutečnou dílnu.
V každém rozměru provede dva řezy, přejde tlačítkem, šestkrát přeloží
pramen a získá jedno lano. Nejde o sedm úplných průchodů ostrovem.

| Zobrazení | Rozměr | Vstup | Výsledek |
| --- | --- | --- | --- |
| Desktop | 1280×800 | Myš | 1 m, kvalita 99 % |
| Krátký desktop | 960×600 | Myš | 1 m, kvalita 100 % |
| Telefon na výšku | 390×844 | Dotyk | 1 m, kvalita 100 % |
| Telefon na šířku | 844×390 | Dotyk | 1 m, kvalita 100 % |
| Malý telefon | 320×568 | Dotyk | 1 m, kvalita 100 % |
| Krátký telefon na výšku | 390×480 | Dotyk | 1 m, kvalita 100 % |
| Malý telefon na šířku | 568×320 | Dotyk | 1 m, kvalita 100 % |

V žádném z těchto scénářů nevznikla neodchycená chyba JavaScriptu.

### Celý postup od nové hry

Průchod skončil úspěšně 26. 9. 2026 v 08:35 Europe/Prague
(06:35 UTC), v mobilním Chromiu 390×844 se softwarovým WebGL.

- Nový izolovaný profil začal bez surovin, bez vložené pozice a bez teleportu.
  Pohyb probíhal dotykovým joystickem, kácení a kopání dlouhým dotykem.
- Čtyři palmy poskytly 20 dřev. Postavilo se ohniště, vypálilo uhlí a popel,
  čtyři výkopy daly tři jíly a jednu rudu; následovala pec a tavba.
- Uložení a reload zachovaly rozpracovanou tavbu. Po dokončení vznikl
  jeden ingot, postavil se ponk a vyrobil měděný řezák.
- Další reload obnovil tři stavby, výkop úrovně 4, řezák a jedno zbývající dřevo.
- Dva listy daly po čtyřech pramenech. Dvě hotová lana se spojila na
  **2 m, kvalita 96 %**. Poslední reload zachoval spojené lano, řezák
  a dva zbývající prameny (oba kvality 100 %).
- Skript skončil s návratovým kódem 0. Nezachytil neodchycenou chybu JavaScriptu.

Závěrečný kontrolní výstup:

```json
{"cutter":true,"ropes":[{"length":2,"quality":96}],"strips":[100,100]}
```

## Opakování kontrol

Postup a oddělené prohlížečové závislosti jsou v
[tests/browser/README.md](../tests/browser/README.md).
Prohlížečová sada je volitelná; statické spuštění hry se nemění.
Snímky a dočasný profil se ukládají mimo repozitář nebo do výslovně
zadaného `HRA_QA_OUTPUT`. Jde o anonymní testovací data, nikoli pozici hráče.

## Stav před vydáním

- PR zůstává draft k review a kontrole na fyzickém telefonu. Zbývá skutečný
  dotyk, výkon zařízení a vzhled včetně písma; softwarový WebGL je nenahrazuje.
- V izolovaném testovacím prostředí se externí Google Fonts nenačetlo.
  Test to zaznamenal; neodchycené chyby herního JavaScriptu nenastaly.
- Pozice je místní pro jedno zařízení. Historické pozice v1/v2 bez souřadnic
  hlídají počty objektů, jejich tehdejší pořadí nelze zpětně ověřit.
- `main` zůstává na `518064f`. Existující Sites projekt zůstává na verzi 21.
  Tento sprint nemá nové vydání ani veřejné nasazení.

