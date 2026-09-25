# Pravidla pro vývoj hry

Před úpravami přečti [docs/VYVOJ-HRY.md](docs/VYVOJ-HRY.md). Konkrétní aktuální zadání uživatele má přednost.

- Hlavní zdroj kódu je `MinarikEffecto/Hra` na GitHubu. Začni aktuálním stavem repozitáře; ověř větev, vzdálené změny a neuloženou práci. Historie chatu slouží jako kontext.
- Nynější hra je statický web. Ručně upravované zdroje jsou v `dist/`; adresář se nesmí mazat jako běžný generovaný build.
- Větší funkce vyvíjej na samostatné větvi. Udržuj funkční `main`. Drobné dokumentační změny mohou jít přímo do `main`.
- Zachovej existující funkce a soubory mimo zadaný rozsah. Refaktoring prováděj postupně, odděleně od změn herního chování.
- Před začleněním změny ověř dotčené scénáře, chyby konzole a podle dopadu ovládání na mobilu i desktopu. U změn formátu uložené hry ověř načtení starší pozice.
- GitHub commit neznamená zveřejněnou verzi. Sites je cílový hosting; publikuj ověřený stav podle rozsahu oprávnění v aktuálním zadání a zaznamenej vazbu mezi GitHub commitem a verzí Sites.
- Zachovej existující projekt Sites a jeho publikum. Při rozdílu mezi GitHubem a zdrojem Sites nejdřív porovnej změny a zachovej cizí práci. Nepřepisuj historii pomocí force push.
- Ukládané pozice, skutečná hráčská data a přístupové údaje patří do úložiště aplikace nebo správy tajných hodnot. Do Gitu patří kód, schémata, migrace a anonymní testovací příklady.
- V závěru uveď, co je hotové, co bylo ověřeno, odkaz na commit nebo PR a zda byla verze také publikována. Plánovanou funkci označ jako plánovanou.

Tento soubor zavádí pracovní postup. Samotným zápisem nevzniká automatické publikování, plánovaná úloha ani nové oprávnění k externím akcím.
