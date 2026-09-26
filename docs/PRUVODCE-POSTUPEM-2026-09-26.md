# Průvodce prvním tavicím postupem · 26. 9. 2026

Průvodce v pracovní větvi `game-sprint/2026-09-25-mobilni-dilna` navazuje na
hratelný výrobní řetězec. Kompaktní panel pod horní lištou ukazuje jeden
další krok a aktuální zásoby.
Klepnutí na něj rozbalí podrobnější vysvětlení. Na dotykovém zařízení uvádí
držení sekery, na desktopu klávesu F; při stavění, otevření batohu a ve výrobě
nepřekrývá ovládání. Po dokončení řezáku ukáže výsledek.

Stav se vždy odvozuje ze zásob, staveb, pozice u stanice, běžících výrob a
nepyramidových jam. Zohledňuje již postavenou pec, utracené suroviny a obnovenou
rozdělanou tavbu. Třetí vrstva nevydá další rudu, proto ji průvodce pro nový
zisk rudy nepovažuje za rozpracovanou. Průvodce nezapisuje žádný nový údaj do
pozice; po kontrole rozložení ostrova je aktuální schéma v3. Ceny staveb a
vstupy výroby se čtou z herních definic.
Po vykácení všech palem navede hráče k obnovitelnému dřevu a listí na východním břehu
a při odpočtu ukáže zbývající sekundy.

## Ověření

- `npm test`: 31/31 na pracovním stavu se schématem v3. Sada zahrnuje větve
  postupu, obě suroviny z naplaveniny,
  ochranu rozložení ostrova, vyčerpané jámy, obnovené výroby a
  existujících testů uložení, craftingu i simulace.
- `node --check` pro změněné moduly a `git diff --check` prošly.
- Headless Chromium se softwarovým WebGL: nový začátek na telefonu 390 × 844 a
  desktopu 1280 × 800. Panel se neprotínal s batohem, časem, survival lištou,
  nástrojem, stavěním ani mobilním joystickem; rozbalení fungovalo. Při otevření
  batohu, nabídky stavění a dialogu výroby byl skrytý.
- Na mobilu z připravených platných pozic prošlo zahájení uhlí, zahájení tavby,
  uložení a obnova rozdělané tavby i výroba řezáku. Ve všech scénářích byly
  texty průvodce aktualizované a žádná neodchycená chyba JavaScriptu nenastala.

Celý postup od nové hry po řezák jedním nepřerušeným průchodem zatím není
prohlížečem doložen. Softwarový WebGL výrazně zpomaloval herní snímky, takže
prohlížečové ověření čekalo na start a obnovení tavby, nikoli její celé dokončení
po plné osmivteřinové herní době; dokončení pokrývá test pravidel a samostatný
prohlížečový scénář s hotovým ingotem. Na skutečném telefonu zbývá zkontrolovat
vzhled, dotyk a čitelnost. Izolovaný testovací prohlížeč zobrazoval část emoji
jako náhradní znaky.

Změna byla začleněna do pracovní větve
`game-sprint/2026-09-25-mobilni-dilna` a draft PR #1. `main` ani veřejná
verze Sites se nezměnily.
