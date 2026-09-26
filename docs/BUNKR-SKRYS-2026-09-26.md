# Zásobovací skrýš K–03

Větev `feature/2026-09-26-buried-cache` navazuje na
`fix/2026-09-26-tool-feedback` (`352ffef`). Zachovává nové ovladače i
kompaktní ikonové rozhraní. Jde o první hratelnou část skryté lokace,
připravenou v [draft PR #5](https://github.com/MinarikEffecto/Hra/pull/5).

## Co hráč objeví

Mezi středem ostrova a severními palmami vykukuje rezavý plech. Nález lze
prohlédnout v batohu. Čtyři vrstvy kopání poblíž plechu odhalí vojenský
poklop K–03. Postupový průvodce po výrobě řezáku nasměruje k průzkumu.

Zámek vyžaduje měděný řezák a bedna jeden souvislý kus lana dlouhý alespoň
2 m. Dvě samostatná metrová lana je nejprve potřeba spojit v dílně.
Vyzvednutí spotřebuje přesně 2 m lana a jednou přidá 3 měděné rudy a
2 porce jídla. Řezák zůstává; delší lano si zachová zbytek i kvalitu.
Další lano se nespotřebuje. Vyprázdněná skrýš zůstane rozpoznatelná.

Pokud už nad místem stojí stavba, její základ poklop odkryje. Platí to pro
starší uložené tábory i nové stavby: hráč nemusí přesouvat nebo ztratit
budovu, která by jinak zablokovala kopání. To je záměrná alternativní cesta
k odhalení. Vyzvednutí stále vyžaduje řezák, lano a hráče u poklopu.

Tato etapa zahrnuje zásobovací šachtu s nálezem a krátkým příběhovým vodítkem.
Průchozí podzemí a otevření dalších dveří zatím implementované nejsou.

## Stav a kompatibilita

- Pravidla jsou v `dist/buried-cache.js`, zobrazení v `dist/buried-cache-ui.js`.
- Formát pozice je v6; nové pole `bunker.claimed` chrání jednorázovou odměnu.
- Pozice v1–v5 se převedou na nevyzvednutou skrýš. Již vykopané díry a
  postavené budovy mohou rovnou odkrýt poklop. Ostatní postup zůstává.
- Odkrytí vychází ze světa; neukládá se druhý, potenciálně rozporný příznak.
- Neplatný stav v6 včetně vyzvednuté, ale neodkryté skrýše se odmítne před
  zápisem. Funkční hlavní pozice ani její záloha se tím nepřepíšou.
- Kontrola vzdálenosti, nástrojů, souvislého lana, postoje hráče a kapacity
  inventáře probíhá před jakýmkoli odečtem či odměnou.

## Provedené ověření

Herní kód byl zmrazen v lokálním commitu
`c10cb1069bb6907337367ce13f4958710473dc4d`, strom
`4551b08cc1506e0b9c6cbe04d9f325314d0517da`. Následný commit doplňuje
záznam a opakovatelný prohlížečový scénář; produkční soubory nemění.

- `node --test tests/*.test.mjs`: **57/57**. Sedm nových scénářů pokrývá
  podmínky odkrytí, blokované akce bez spotřeby, jednorázovou odměnu,
  zbytek lana, limit inventáře, zachování stavu, migrace v1–v5 a odmítnutí
  poškozených dat bez přepsání uložené pozice.
- Chromium 1280×800 a dotykový 390×844: skutečné čtyři kroky kopání,
  reload nálezu, dvě nespojená lana, vyzvednutí a druhý reload. Oba profily
  prošly bez neodchycených chyb JavaScriptu a chyb místních souborů.
- Dotykové vyzvednutí navíc proběhlo v rozměru 568×320. Snímky připraveného
  i vyzvednutého nálezu byly vizuálně zkontrolované.

Prohlížečový test používá připravenou pozici v5 s lopatou a řezákem a pro
samotné vyzvednutí dodá spojené lano. Neověřuje znovu celou výrobu ani
výkon fyzického telefonu. Externí Google Fonts jsou v testu blokované.
Příkazy a přesný rozsah jsou v [návodu testů](../tests/browser/README.md).

Verze je určena ke kontrole na GitHubu. Na Sites nebyla publikována.

## Dopracování ovládání

Po prvním ověření přibylo vysvětlení každé blokované podmínky. Stejná
pravidla nyní řídí dostupnost akce i její vysvětlení, včetně plného
inventáře a stání ve vodě. Prohlížení počká na dokončení pohybu nástroje
a dopad hráče, takže dialog nemůže zmrazit rozehranou animaci.

Tab a Shift+Tab zůstávají uvnitř nálezu. Po vyzvednutí se fokus přesune
ze skrytého tlačítka na zavření. Popis pro čtečku se nepřepisuje při každé
aktualizaci, pokud se skutečný obsah nezměnil.

Model po úpravě opět prošel všemi **57 testy**. Prohlížečový scénář navíc
kontroluje klávesnicový fokus, důvod chybějícího spojeného lana a stabilní
živý popis. Na dokončení práce s lopatou čeká podle dostupnosti ovladače,
aby rychlost softwarového vykreslování neovlivnila pořadí dalších kroků.

Rozšířený scénář prošel znovu na desktopu i dotyku na neměnném lokálním
kódu `0cc6739685379dfcfd12b134ab337fe8311a00d7`, strom
`ff3023921eb7840bfbe9e2c1e2a730c5176a14a8`. V obou profilech po reloadu
zůstaly 4 rudy (1 vykopaná + 3 z bedny), 2 jídla a dvě metrová lana
s původní kvalitou 83 % a 90 %. Nebyly zaznamenané chyby hry. Snímky
dialogu po úpravě textů byly znovu vizuálně zkontrolované.
