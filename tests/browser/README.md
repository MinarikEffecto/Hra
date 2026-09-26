# Kontrola dílny ve skutečném prohlížeči

Navazující [kontrola ovladačů nástrojů](../../docs/OVLADANI-NASTROJU-2026-09-26.md)
se spouští příkazem `node tests/browser/tool-feedback.mjs`. Ověřuje ikony,
popisky pro čtečku, dosažitelné cíle a blokované kopání na desktopu i dotyku.

Samostatná volitelná sada pro Linux / Node 22 a novější. Načte skutečný
`dist/style.css` a `dist/fiber-crafting.js` v Chromiu; 3D ostrov nahrazuje
malý inventář. Tím oddělí chyby ovládání a rozložení od výkonu 3D vykreslování.
Nejde o test celého herního postupu.

```sh
npm install --prefix tests/browser
npm test --prefix tests/browser
```

Kontroluje první klik, dva řezy, tlačítko pro přechod, šest překladů a vznik
jednoho lana pomocí myši nebo skutečných dotykových událostí prohlížeče.
Běží v sedmi rozměrech: 1280×800, 960×600, 390×844, 844×390,
320×568, 390×480 a 568×320. Zachytává neodchycené chyby JavaScriptu.

Test používá náhodný lokální port a testovací inventář. Nemění skutečnou
hráčskou pozici. Snímky ukládá do dočasného adresáře vypsaného na začátku.
Volitelně nastavte `HRA_QA_OUTPUT` a `HRA_QA_DIST` na absolutní cesty.
`node tests/browser/workshop.mjs short-portrait` spustí jediný rozměr.
Závislosti jsou oddělené od hry; statické nasazení v `dist/` se nemění.

## Celý postup od nové hry

```sh
npm run progression --prefix tests/browser
```

Tento delší scénář spouští skutečný 3D ostrov v mobilním Chromiu 390×844
se softwarovým WebGL a novým profilem. Pohybuje hráčem dotykovým joystickem;
nevkládá suroviny a nepřemisťuje hráče změnou herních dat. Nejprve sesbírá
kameny a naplaveniny, vyrobí úštěp, sekáč a sekeru. Pokácí čtyři palmy,
sesbírá dřevo, postaví ohniště, vypálí uhlí, vykope jíl a rudu, postaví pec,
vytaví měď, postaví ponk a vyrobí řezák. Následují dvě lana a spoj na 2 m.
Kontroluje obnovení rozpracované tavby, řezáku a spojeného lana po reloadu.
Počítejte s několika minutami podle výkonu softwarového vykreslování.

Snímky a dočasný profil zůstávají v adresáři `HRA_QA_OUTPUT` nebo v novém
dočasném adresáři. Konzolový výstup lze přesměrovat do souboru. Test čte
vlastní uloženou pozici pro ověření, nikdy profil skutečného hráče. Externí
Google Fonts jsou úmyslně vynechané, aby dostupnost cizího serveru neměnila
výsledek testu. Neodchycená chyba JavaScriptu test ukončí neúspěšně.

## První nástroje

```sh
npm run first-tools --prefix tests/browser
```

Samostatný průchod od holých rukou v novém profilu: kameny → úštěp →
naplaveniny → sekáč → násada → reload → vazba → sekera → palma → lopata →
jíl → reload. Používá skutečný pohyb a ovládání; do pozice nevkládá suroviny.
Ověřuje také, že přepínání nástrojů na začátku nepřidělí hotové vybavení.

Běží na desktopu 1280×800 s klávesnicí a myší a na dotykovém rozměru 390×844.
V dotykovém běhu se dokončení sekery ověří i při otočení na 568×320.
Volitelný argument `node tests/browser/first-tools.mjs portrait` nebo
`desktop` vybere jediný profil. Výstup určuje `HRA_QA_OUTPUT` jako u ostatních
scénářů. Externí fonty se nenačítají; fyzický telefon tímto není ověřen.

## Sázení a další sklizeň

```sh
npm run planting --prefix tests/browser
```

Skutečný 3D ostrov v rozměrech 1280×800, 390×844 a 568×320. Kontrola začíná
z anonymní připravené pozice v3: jeden pařez, dva kokosy, hráč poblíž a ponk
pro okolní ovládání. Myší nebo dotykem zasadí kokos, zkontroluje jediný
odečet a uloží/načte růst. Poté použije kopii pozice s jednou sekundou do
dorostení a zkontroluje tři nové kokosy. Skutečným držením nástroje palmu
znovu pokácí a po reloadu ověří 5 dřev, 6 listů a 4 kokosy v batohu.
Nevydává tento zkrácený test za tříminutové čekání ani za cestu od nové hry.
Celý odpočet a pauzy samostatně ověřují testy pravidel.

Volitelný argument `node tests/browser/planting.mjs portrait` spustí jeden
rozměr. Snímky používají `HRA_QA_OUTPUT` nebo dočasný adresář. Externí
Google Fonts jsou pro tento scénář úmyslně blokované; vzhled písma a emoji
na fyzickém zařízení není tímto ověřen. Chyby herního JS a místních souborů
způsobí neúspěch testu.

## Zásobovací skrýš K–03

```sh
npm run buried-cache --prefix tests/browser
```

Skutečný 3D ostrov na desktopu 1280×800 a dotykovém rozměru 390×844.
Začíná připravenou anonymní pozicí v5 s lopatou, řezákem a dvěma samostatnými
metrovými lany. Klávesnicí nebo dotykem vykope všechny čtyři vrstvy, ověří
uložení odkrytého poklopu a odmítnutí dvou nespojených lan.

Pro vyzvednutí zásob vloží do kopie pozice jedno spojené třímetrové lano.
Skutečným tlačítkem vyzvedne zásoby, ověří odečet dvou metrů, zachování
kvality zbytku a trvalý řezák. Mobilní vyzvednutí probíhá po otočení na
568×320. Reload musí zachovat vyzvednutý stav a nepřidat další odměnu.
Není to nový průchod celou výrobou od holých rukou; ten má vlastní scénář.

Kontroluje také Tab a Shift+Tab uvnitř dialogu, návrat fokusu po vyzvednutí,
vysvětlení chybějícího lana a nepřepisování nezměněného popisu pro čtečku.
Před další akcí počká na skutečné dokončení pohybu nástroje.

Výstup a blokování externích fontů fungují stejně jako výše. Neodchycené
chyby hry a chybějící místní soubory test odmítá. Rozsah funkce a migrace
jsou popsány v [záznamu skrýše](../../docs/BUNKR-SKRYS-2026-09-26.md).
