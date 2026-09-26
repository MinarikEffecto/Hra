# Ovladače prvních nástrojů

Navazuje na [první nástroje, PR #3](https://github.com/MinarikEffecto/Hra/pull/3)
a jeho kód `46c23ff`. Jde o samostatnou malou úpravu ovládání, ne vydání Sites.

## Změna pro hráče

- Úštěp označí dosažitelný keř; sekáč a sekera také palmu. Malý kruh se
  vykresluje nad korunou a listy, takže cíl zůstane rozpoznatelný.
- Popisek ikony odpovídá drženému nástroji. Holé ruce odkazují na kameny,
  lopata rozlišuje volné a blokované místo a brokovnice popisuje směr akce.
- Stejný popis dostane čtečka přes `aria-describedby` u herního plátna,
  přepínače nástroje a dotykové akce. Na desktopu jej ukáže popisek ikony
  při najetí myší.
- Kompaktní ikonové rozhraní zachovává uživatelovo zadání bez průběžné
  textové nápovědy. Při craftingu a stavění se popis a terč skryjí.

Pravidla výroby, získané vybavení ani formát pozice v5 se nemění.
Společná pravidla odezvy jsou v `dist/tool-feedback.js`. Text v DOM se
aktualizuje jen při změně, ne při každém snímku.

## Ověření

- `npm test`: **50/50**, včetně tří scénářů pro vhodné cíle, zvolený nástroj,
  blokované kopání a pauzu během dialogů.
- Skutečný Chromium 1280×800 a dotykový 390×844: holé ruce, úštěp u keře,
  sekáč u palmy, lopata na volném a blokovaném místě a brokovnice. Všech
  12 scénářů prošlo. Test kontroluje také popis v přístupnostním stromu
  prohlížeče a zachování skrytého textového HUD.
- Dodatečná kontrola sekáče na obou rozměrech ověřuje snímky čitelného
  terče po úpravě vykreslování nad korunou.

Scénář používá připravené anonymní pozice, aby kontroloval konkrétní stavy
ovládání; není to nový průchod výrobou od nuly. Úplný průchod z nové hry
od holých rukou přes lopatu a měděný řezák po uložené lano je zdokumentován
v předchozí etapě. Fyzický telefon a jeho výkon zde ověřené nejsou.

Spuštění po instalaci oddělených závislostí podle návodu prohlížečových testů:

```sh
node tests/browser/tool-feedback.mjs
node tests/browser/tool-feedback.mjs chopper
```

Snímky se ukládají do `HRA_QA_OUTPUT` nebo vypsaného dočasného adresáře.
Test pracuje se skutečnou hrou, blokuje jen externí Google Fonts a odmítá
neodchycené chyby JavaScriptu i chyby načtení místních souborů.
