# První tavba — pracovní větev 25. 9. 2026

Větev `game-sprint/2026-09-25-prvni-taveni` navazuje na `d105483`.
Jde o zdrojový kandidát, nikoli o publikovanou verzi Sites.

## Hratelný postup

1. U ohniště za 5 dřev otevři **⚒ Výroba** a vypal 2 dřeva. Po 6 sekundách hraní dostaneš 1 uhlí a 1 popel. Dosavadní tlačítko pro opékání ryby funguje samostatně.
2. Lopata odkrývá v každé **obyčejné** díře jíl při 1., 2. a 4. dokončeném kopnutí a měděnou rudu při 3. kopnutí. Nálezy jsou jisté; původní náhodné nálezy mohou přijít navíc. Pyramida má nadále své vlastní nálezy.
3. Postav pec za 4 dřeva, 3 jíly a 1 popel. U pece spusť tavbu 1 rudy a 1 uhlí; po 8 sekundách hraní vznikne 1 ingot.
4. U pracovního ponku změň 1 ingot na trvalý měděný řezák. Při dokončeném řezu listu či liány pak vznikají 4 prameny místo 3 a jejich kvalita má malý bonus. Původní pletení tří pramenů a napojování lan zůstává stejné.

Na celý postup z nové hry stačí pokácet čtyři palmy (20 polen), z jedné obyčejné díry odkrýt čtyři vrstvy a postavit ohniště, pec a ponk (celkem 19 dřev včetně pálení). Stavbu je třeba umístit na volné místo. U stanice se tlačítko **Výroba** zpřístupní v ovládání přežití; v mobilu se možnosti zobrazují ve svislém posuvném dialogu, na krátké obrazovce ve třech sloupcích. Nepřítomnost stanice nebo surovin tlačítko receptu zakáže.

Najednou může běžet jeden technologický job. Vstupy se odečtou společně při spuštění; při nedostatku vstupů, jiné stanici nebo rozběhnutém jobu se neodečte nic. Job pokračuje při hraní i po odchodu od stanice nebo otevření dialogu. Čas v neaktivní kartě neběží. Rozpracovaný job nemá tlačítko zrušení a výstup je přidán jen jednou.

## Ukládání

`schemaVersion: 2` přidává `clay`, `ore`, `charcoal`, `ash`, `ingot`, `copperCutter` a `technology.job` s druhem, indexem stanice a zbývajícími sekundami. Starý slot v prohlížeči (`trosechnik.save.v1`, včetně zálohy) zůstává stejný, aby byly pozice v1 dohledatelné. Přísně ověřená pozice v1 se při čtení převede na v2 s nulovými novými počty, nevlastněným řezákem a bez jobu; původní hráč, svět a inventář se zachovají. Neplatné a budoucí schéma se odmítá. Save v2 ověřuje, že rozpracovaný job patří ke skutečnému ohništi či peci a má omezený zbývající čas.

Při uložení uprostřed výroby se uloží už odečtené vstupy a zbývající čas. Po načtení se obnoví přesná stanice a job doběhne při dalším hraní. Ukládání a kompatibilní záloha používají dosavadní mechanismus; rozpracovaný job je uložen při zahájení, automaticky a při odchodu ze stránky.

## Ověření a omezení

`npm test` prošlo **18/18**: v1 migrace a poškozené hodnoty, atomické suroviny na pec a job, odmítnutí druhého jobu, dokončení právě jednou, uložení a obnova tavby, opékání ze starých testů i čtyři prameny s řezákem. `node --check` dotčených modulů a `git diff --check` prošly.

Samostatný headless Chromium se softwarovým WebGL otevřel hru na desktopu 1280 × 800, mobilu 390 × 844 a krátké obrazovce 844 × 390. V každém rozměru se otevřela výroba, spustilo pálení a obnovil se aktivní job po reloadu; žádná neodchycená JS chyba. Na desktopu navíc prošla tlačítka opékání ryby, tavby u pece a výroby řezáku u ponku s uložením výstupu. Pro prohlížečový scénář byla použita validní připravená pozice; úplný nový technologický postup od pokácení čtyř palem a čtyř kopnutí nebyl v reálném prohlížeči projit. Skutečný telefon a dlouhé časování výroby v něm nebyly ověřeny. Offline výroba ani několik současných jobů nejsou součástí tohoto úzkého celku.

Ručně spravovaný `dist/` zůstává zdrojem, bez build kroku a bez nasazení.
