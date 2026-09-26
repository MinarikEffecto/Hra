# První tavba — pracovní větev 25. 9. 2026

Vývoj vznikl v oddělené větvi `game-sprint/2026-09-25-prvni-taveni` a byl
začleněn do pracovní větve [`game-sprint/2026-09-25-mobilni-dilna`](https://github.com/MinarikEffecto/Hra/tree/game-sprint/2026-09-25-mobilni-dilna)
a [draft PR #1](https://github.com/MinarikEffecto/Hra/pull/1). Jde o zdrojový
kandidát, nikoli o publikovanou verzi Sites.

## Hratelný postup

1. U ohniště za 5 dřev otevři **⚒ Výroba** a vypal 2 dřeva. Po 6 sekundách hraní dostaneš 1 uhlí a 1 popel. Dosavadní tlačítko pro opékání ryby funguje samostatně.
2. Lopata odkrývá v každé **obyčejné** díře jíl při 1., 2. a 4. dokončeném kopnutí a měděnou rudu při 3. kopnutí. Nálezy jsou jisté; původní náhodné nálezy mohou přijít navíc. Pyramida má nadále své vlastní nálezy.
3. Postav pec za 4 dřeva, 3 jíly a 1 popel. U pece spusť tavbu 1 rudy a 1 uhlí; po 8 sekundách hraní vznikne 1 ingot.
4. U pracovního ponku změň 1 ingot na trvalý měděný řezák. Při dokončeném řezu listu či liány pak vznikají 4 prameny místo 3 a jejich kvalita má malý bonus. Původní pletení tří pramenů a napojování lan zůstává stejné.

Na celý postup z nové hry stačí pokácet čtyři palmy (20 polen), z jedné
obyčejné díry odkrýt čtyři vrstvy a postavit ohniště, pec a ponk (celkem
19 dřev včetně pálení). Další dřevo lze opakovaně získat z
[naplavenin na východním břehu](OBNOVITELNE-DREVO-2026-09-26.md).
[Průvodce postupem](PRUVODCE-POSTUPEM-2026-09-26.md) ukazuje další krok
podle aktuálního stavu. Stavbu je třeba umístit na volné místo. U stanice
se tlačítko **Výroba** zpřístupní v ovládání přežití; v mobilu se možnosti
zobrazují ve svislém posuvném dialogu, na krátké obrazovce ve třech sloupcích.
Nepřítomnost stanice nebo surovin tlačítko receptu zakáže.

Najednou může běžet jeden technologický job. Vstupy se odečtou společně při spuštění; při nedostatku vstupů, jiné stanici nebo rozběhnutém jobu se neodečte nic. Job pokračuje při hraní i po odchodu od stanice nebo otevření dialogu. Čas v neaktivní kartě neběží. Rozpracovaný job nemá tlačítko zrušení a výstup je přidán jen jednou.

## Ukládání

Technologický celek původně zavedl `schemaVersion: 2` s poli `clay`, `ore`,
`charcoal`, `ash`, `ingot`, `copperCutter` a `technology.job` s druhem, indexem
stanice a zbývajícími sekundami. Nynější pracovní větev zapisuje
`schemaVersion: 3` a [uspořádané rozložení ostrova](KOMPATIBILITA-ROZLOZENI-2026-09-26.md).
Starý slot v prohlížeči (`trosechnik.save.v1`, včetně zálohy) zůstává stejný,
aby byly pozice v1/v2 dohledatelné. Přísně ověřené pozice v1 a v2 se při čtení
převedou na v3; v1 dostane nulové nové počty, nevlastněný řezák a žádný job,
zatímco původní hráč, svět a inventář se zachovají. Pozice bez souřadnic
rozložení mají do příštího uložení pouze kontrolu počtu palem a keřů. Neplatné
a budoucí schéma se odmítá. Uložená výroba se ověřuje proti skutečnému
ohništi či peci a má omezený zbývající čas.

Při uložení uprostřed výroby se uloží už odečtené vstupy a zbývající čas. Po načtení se obnoví přesná stanice a job doběhne při dalším hraní. Ukládání a kompatibilní záloha používají dosavadní mechanismus; rozpracovaný job je uložen při zahájení, automaticky a při odchodu ze stránky.

## Ověření a omezení

Při původním začlenění technologického celku `npm test` prošlo **20/20**:
v1 migrace a poškozené
hodnoty, ochrana pozice z novější verze, uložení hlubokého výkopu, atomické
suroviny na pec a job, odmítnutí druhého jobu, dokončení právě jednou,
uložení a obnova tavby, opékání ze starých testů i čtyři prameny s řezákem.
`node --check` dotčených modulů a `git diff --check` prošly. Aktuální výsledek
celé pracovní větve je **31/31**; současný průchod od
nové hry shrnuje [sprint](SPRINT-2026-09-25.md).

Samostatný headless Chromium se softwarovým WebGL otevřel hru na desktopu 1280 × 800, mobilu 390 × 844 a krátké obrazovce 844 × 390. V každém rozměru se otevřela výroba, spustilo pálení a obnovil se aktivní job po reloadu; žádná neodchycená JS chyba. Na desktopu prošla tlačítka opékání ryby, tavby u pece a výroby řezáku u ponku. Na mobilním rozměru 390 × 844 navíc výroba **skutečně doběhla**: získané uhlí se spotřebovalo v tavbě, vznikl ingot a z něj u ponku řezák; do těchto návazných kroků se nepřidávalo testovací uhlí ani ingot. Mobilní tlačítko výroby má krátkou ikonu, aby nepřetékalo přes ostatní ovládání. Pro tento tehdejší prohlížečový scénář byla použita validní připravená pozice se stavbami, dřevem, jílem a rudou; skript mezi stanicemi zkrátil přesun hráče. Úplný nový technologický postup od pokácení čtyř palem a čtyř kopnutí v něm nebyl projit. Skutečný telefon a dlouhé časování výroby v něm nebyly ověřeny. Offline výroba ani několik současných jobů nejsou součástí tohoto úzkého celku.

Samostatné mobilní průchody navíc ověřily čtyři skutečná kopnutí k jílu a rudě,
umístění pece a obnovení pozice, a částečnou cestu od úplně nové hry bez seedu
či přesunu: joystick, pokácení dvou palem, sběr dřeva a dotykové spuštění
pálení u ohniště. Tyto tehdejší dílčí scénáře neověřovaly celý řetězec od nové
hry až po řezák.

Pozdější souvislý mobilní dotykový průchod od nové hry bez předpřipravených
zásob a přesunu skriptem dosáhl řezáku včetně uložení a obnovení rozdělané
tavby i závěrečného reloadu pozice v3. Podrobnosti jsou ve
[sprintu](SPRINT-2026-09-25.md). Větev se během tohoto QA posouvala od
`dadb047` k `f69d9ed`; opakování na neměnném finálním commitu ještě probíhá.

Ručně spravovaný `dist/` zůstává zdrojem, bez build kroku a bez nasazení.
