# Kontrola dílny ve skutečném prohlížeči

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
nevkládá suroviny a nepřemisťuje hráče změnou herních dat. Pokácí čtyři palmy,
sesbírá dřevo, postaví ohniště, vypálí uhlí, vykope jíl a rudu, postaví pec,
vytaví měď, postaví ponk a vyrobí řezák. Následují dvě lana a spoj na 2 m.
Kontroluje obnovení rozpracované tavby, řezáku a spojeného lana po reloadu.
Počítejte s několika minutami podle výkonu softwarového vykreslování.

Snímky a dočasný profil zůstávají v adresáři `HRA_QA_OUTPUT` nebo v novém
dočasném adresáři. Konzolový výstup lze přesměrovat do souboru. Test čte
vlastní uloženou pozici pro ověření, nikdy profil skutečného hráče. Omezení
prostředí při načtení Google Fonts zapisuje, ale nepovažuje je za selhání
herní logiky. Neodchycená chyba JavaScriptu test ukončí neúspěšně.

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
