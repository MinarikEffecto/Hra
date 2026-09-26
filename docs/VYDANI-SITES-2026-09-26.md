# Vydání hry na Sites · 26. 9. 2026

- **Hra:** Trosečník · Malý ostrov
- **Zdrojový GitHub commit:** `20e9460b87c01bb54c23eec9693d0a4d5b729ab1` na větvi `feature/2026-09-26-buried-cache` (draft PR #5). Publikované `dist/` se s tímto commitem shoduje po souborech.
- **Sites projekt:** `appgprj_6a9c7bd963c081918a8e5c209649185f`
- **Uložená a nasazená verze Sites:** 22, zdrojový commit Sites `3f3457644c5959f958fe3b21ccb9173fa12f6e6d`
- **Nasazení:** `appgdep_6ab7de3ebd648191b232bf7198bd6dcd`, úspěšné 26. 9. 2026 v 17:01 Europe/Prague
- **URL:** https://trosechnik-tropicky-ostrov.minarik625722.chatgpt.site
- **Přístup:** zachováno původní vlastní nastavení projektu; nebylo přepnuto na veřejný přístup.
- **Formát pozice:** v6, s migracemi starších pozic v1–v5.

Vydání přináší opravenou mobilní dílnu a výrobu lana, technologický postup k peci a měděnému řezáku, první nástroje, opětovný růst palem a objevitelnou zásobovací skrýš K–03 včetně navigace zpět k místu. Skrýš není průchozí podzemní základna.

Před vydáním prošlo `npm test` **58/58**. Reálný scénář `npm run buried-cache --prefix tests/browser` prošel v Chromiu na desktopu 1280×800 a dotykovém rozměru 390×844: odkrytí, chybějící spojené lano, vyzvednutí, návrat k místu a znovunačtení bez chyb hry. Starší úplný průchod od nové hry a dílna jsou zdokumentovány v příslušných testovacích návodech a záznamech. Fyzický telefon nebyl v tomto vydání samostatně zkoušen.

Publikace neznamená začlenění draft PR do `main`. Zdroj Sites zachovává vlastní historii; GitHub a Sites proto mají různá SHA.
