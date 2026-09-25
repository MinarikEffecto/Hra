# Jak budeme vyvíjet hru Trosečník · Malý ostrov

Zapsáno: 25. 9. 2026. Tento dokument zachycuje dohodnutý postup pro další vývoj projektu **Hra**. Je určen majiteli projektu, AI asistentovi i případnému dalšímu vývojáři.

## 1. Základní rozhodnutí

**GitHub je hlavní místo pro kód a historii vývoje. ChatGPT Sites je místo pro provoz hratelné verze.** Zadání a spolupráce mohou dál probíhat v ChatGPT, ale každý vývojový úkol musí vycházet z aktuálního repozitáře.

| Oblast | Místo | Co tam udržujeme |
| --- | --- | --- |
| Kód hry a konfigurace | [MinarikEffecto/Hra](https://github.com/MinarikEffecto/Hra) | Herní logiku, svět, UI, recepty, soubory potřebné ke spuštění |
| Historie a rozpracované změny | GitHub | Commity, pracovní větve, pull requesty a označená vydání |
| Zadání a rozhodnutí | Dokumentace a GitHub Issues | Rozsah úkolů, podmínky dokončení, známé chyby a herní směr |
| Hratelná verze | [Existující projekt Sites](https://trosechnik-tropicky-ostrov.minarik625722.chatgpt.site) | Konkrétní ověřené vydání |
| Postup hráčů | Úložiště aplikace | Pozici, inventář, změny ostrova, stavby a odemčený obsah |
| Přístupové údaje | Správa tajných hodnot prostředí | Hodnoty potřebné pro serverové služby |

Hlavní zásada: na další funkci nezačínáme z náhodné starší kopie v jiném chatu. Nejprve načteme aktuální GitHub, ověříme rozpracované změny a teprve pak upravujeme hru.

## 2. Výchozí stav a rozsah tohoto zápisu

- Do GitHubu byl přenesen zdroj poslední uložené verze Sites **21**.
- Import odpovídá původnímu zdroji Sites s commitem `6306cda41b3c00d8f1fd6e6056d9f534d0b26316`.
- Po dokončení importu bylo porovnáno všech 23 původních souborů; obsah souhlasil po bajtech. Přidán byl README.
- Dokončený import v GitHubu: `afedf34e314eda723cb5ac03b730e1ca22d4032c`.
- Jde o statický web bez sestavovacího kroku. Současné ručně upravované zdroje jsou v `dist/`.
- GitHub obsahuje historii od importu. Dřívější vývojová historie tím nebyla automaticky přenesena; původní verze zůstávají evidované v Sites.
- Automatické publikování z GitHubu na Sites zatím není nastavené.
- Tento dokument je plán a pracovní postup. Neznamená, že už vzniklo nové ukládání pozic, databáze, refaktoring nebo automatické testy.

## 3. Jedna změna od zadání k vydání

### Krok 1: Připravit srozumitelné zadání

U každé větší funkce zaznamenáme:

1. Co má hráč nově umět nebo zažít.
2. Jak ji objeví a ovládá, včetně mobilu.
3. Předpoklady: předměty, suroviny, stav světa a předchozí postup.
4. Co se stane při úspěchu, neúspěchu a přerušení.
5. Co se musí uložit a znovu obnovit.
6. Podle čeho poznáme, že je úkol hotový.

Příklad: „Vyrobit ostrý kamenný úštěp“ musí popsat nalezení materiálu, samotnou výrobu, její výsledek v inventáři i případ, kdy hráč materiál nemá. Samotné přidání tlačítka nestačí.

### Krok 2: Načíst aktuální projekt

Ověříme stav pracovní kopie, aktuální větev a změny na GitHubu. Zachováme již rozpracovanou práci. Přečteme `AGENTS.md`, tento dokument a zadání příslušného úkolu.

Pokud se kód mezitím změnil i přímo v Sites, porovnáme obě verze. Nové změny vědomě začleníme do GitHubu, aby se znovu stal aktuálním hlavním zdrojem. Žádnou z kopií nepřepíšeme naslepo.

### Krok 3: Vytvořit pracovní větev

`main` představuje stabilní základ. Větší změna dostane vlastní krátkodobou větev, například `feature/prvni-sekera`, `feature/ukladani-hry` nebo `fix/mobilni-ovladani`.

Jedna větev řeší jeden související cíl. Ukládáme menší smysluplné commity s popisem změny. Drobné opravy dokumentace mohou jít přímo do `main`.

### Krok 4: Implementovat omezený funkční celek

Nejprve vytvoříme nejmenší hratelnou podobu nové mechaniky. Potom doplníme potřebné reakce UI, zvuky a ladění. Současně neměníme nesouvisející systémy.

Pokud potřebujeme zpřehlednit starý kód, oddělíme přesun nebo přejmenování od změny pravidel hry. Díky tomu lze zjistit, která změna případně způsobila chybu.

### Krok 5: Ověřit funkčnost

Rozsah ověření odpovídá změně. Před začleněním větší mechaniky zkontrolujeme relevantní body:

- Hra se načte a načtou se i potřebné moduly, zvuky a modely.
- Konzole neobsahuje nové chyby související se změnou.
- Základní pohyb, nástroje a inventář dál fungují.
- Nová funkce funguje při splněných podmínkách i při chybějících surovinách.
- Přerušení akce nevytváří duplikáty ani neztrácí předměty.
- Dotčené ovládání funguje na desktopu i mobilu.
- Pokud existuje ukládání, funguje opuštění a opětovné načtení hry.
- Při změně formátu uložení se ověří i starší uložená pozice.
- Při dopadu na výkon porovnáme stejnou scénu před změnou a po ní, hlavně na mobilu.

Automatické testy přidáváme přednostně pro čistá pravidla, například spotřebu surovin, recepty a migrace uložených pozic. U vizuální a pohybové části je nutné i skutečné vyzkoušení. Pouhé úspěšné načtení stránky není důkaz, že mechanika funguje.

### Krok 6: Zkontrolovat a začlenit změnu

Větší změnu shrneme v pull requestu: co přibylo, jak se to vyzkouší, co bylo ověřeno a jaká omezení zůstávají. Po vyřešení zjištěných problémů ji začleníme do `main` podle oprávnění v aktuálním zadání. Nové potvrzení od uživatele vyžádáme jen tehdy, když je skutečně potřebné.

### Krok 7: Vydat konkrétní ověřený stav

Pro publikování použijeme přesný commit z GitHubu. Do existujícího projektu Sites přeneseme tento stav, připravíme verzi a následně ji publikujeme v rozsahu aktuálního zadání. Pokud je zadána jen příprava nebo kontrola, skončíme uloženým kandidátem.

GitHub a Sites mohou mít rozdílné historie commitů, protože import byl vytvořen samostatně. Proto nepředpokládáme totožnost jejich SHA a neprovádíme force push. Při předání na hosting zachováme historii Sites, porovnáme obsah a zaznamenáme vztah obou stavů.

U vydání evidujeme:

| Údaj | Význam |
| --- | --- |
| Verze hry | Lidsky čitelné označení vydání, například `v0.2.0` |
| GitHub commit | Přesný stav zdrojového kódu |
| Verze Sites a zdrojový commit Sites | Vazba na skutečně publikovaný balíček |
| Datum a URL | Kdy a kde bylo vydání zveřejněno |
| Změny a ověření | Krátký souhrn novinek a provedených kontrol |
| Verze formátu uložení | Pokud vydání používá uložené pozice |

Číslo verze Sites a číslo vydání hry nemusí být stejné. Nezakládáme pro každé vydání nový projekt Sites. Zachováme jeho aktuální přístupová oprávnění.

### Krok 8: Návrat při problému

Při chybě určíme poslední funkční vydání. Opravu nebo návrat kódu zaznamenáme novým commitem; nepřepisujeme historii. Podle potřeby znovu publikujeme známý funkční stav. Před návratem zkontrolujeme kompatibilitu uložených pozic a databáze, protože vrácení kódu automaticky nevrací hráčská data.

## 4. Přehlednější architektura hry

Stávající moduly budeme zpřehledňovat postupně. Cílově budou mít jasnou odpovědnost:

- **Svět a prostředí:** terén, denní cyklus, umístění objektů.
- **Hráč a ovládání:** pohyb, nástroje, interakce a mobilní ovládání.
- **Inventář a předměty:** obsah batohu, vlastnosti předmětů, přesuny a spotřeba.
- **Crafting:** recepty, podmínky, průběh a výsledek výroby.
- **Stavby:** umístění, suroviny, dokončení a případné poškození.
- **Průzkum a postup:** skryté lokace a odemčený obsah.
- **Ukládání:** převod stavu světa na uložená data, načtení a migrace.
- **UI a zvuk:** zobrazení stavu a odezva na herní události.

Recepty, ceny staveb a vlastnosti předmětů mají být v přehledných definicích, aby šly upravovat bez zásahů do více nesouvisejících funkcí. Zobrazení a ovládání mají používat společná herní pravidla.

Současná složka `dist/` je skutečný zdroj. Přesun do `src/`, zavedení TypeScriptu nebo sestavovacího nástroje je samostatný možný refaktoring, který se provede jen s ověřeným přínosem. Při takovém přesunu se zároveň upraví spuštění, publikování a dokumentace. Dnes tyto kroky nejsou nutnou podmínkou dalšího vývoje.

## 5. Ukládání herního postupu

### První etapa: jedno zařízení

Navrhneme uložení v prohlížeči a export/import záložního souboru. U většího strukturovaného stavu upřednostníme IndexedDB; konkrétní volba se potvrdí při implementaci. Uložení v prohlížeči může zaniknout při vymazání dat webu a samo se nepřenáší mezi zařízeními. Při změně domény potřebujeme cestu pro přenos pozice.

Ukládáme zejména pozici hráče, inventář, stav světa, postavené objekty, postup a potřebné časové údaje. Každá pozice má `schemaVersion`, identifikátor světa nebo jeho seed a čas posledního uložení.

Import ověřuje formát a hodnoty. Před přepsáním funkční pozice uchováme poslední použitelnou zálohu. Ukládání probíhá při významných změnách a průběžně v rozumném intervalu, nikoli při každém snímku hry.

### Druhá etapa: více zařízení

Jakmile bude cílem pokračovat na počítači i telefonu, přidáme přihlášení a serverové ukládání. Sites nabízí D1 pro strukturovaná data a R2 pro soubory. Výběr potvrdíme podle tehdejších požadavků a možností hostingu.

Server musí ověřovat vlastníka pozice. U souběžných změn z více zařízení navrhneme řešení konfliktu a revize záznamů. Do GitHubu patří struktura databáze, migrace a anonymní testovací data; skutečné pozice hráčů patří do úložiště hry.

### Kompatibilita vydání

Změna formátu pozice obsahuje převod staršího formátu a ověření na starší ukázkové pozici. Při neznámém nebo poškozeném formátu nesmíme potichu přepsat původní data. Před změnou databáze nebo formátu se řeší záloha a možnost obnovy.

## 6. Doporučené pořadí další práce

| Etapa | Výsledek | Podmínka dokončení |
| --- | --- | --- |
| 1. Technický základ | Přehlednější odpovědnosti modulů, zadání a známé chyby | Existující hra funguje jako před úpravou |
| 2. Ukládání | Obnova hráče, inventáře, staveb a světa | Po zavření a otevření lze pokračovat; funguje záloha |
| 3. Postupná výroba | Cesta od základních materiálů k prvnímu nástroji | Hráč ji zvládne od nového začátku a odpracuje jednotlivé kroky |
| 4. Prohloubení ostrova | Navazující crafting, stavby a objevitelný obsah | Každý přírůstek má hratelný smysl a projde ověřením |
| 5. Cloudové pozice | Pokračování na více zařízeních | Přihlášení, vlastnictví pozice, synchronizace a obnova fungují |

Toto je pořadí priorit, nikoli automaticky spuštěná fronta úkolů. Konkrétní další funkci určuje zadání uživatele.

## 7. Herní směr, který zachováváme

- Hráč si rozvoj ostrova postupně odpracuje.
- Zamýšlený začátek: ruce → kameny → ostrý úštěp → provizorní sekáč → lepší násada a vazba → sekera. Podrobné recepty se dopracují při návrhu mechaniky.
- Skryté lokace mají být objevené průzkumem a interakcí se světem. Návrhem je například bunkr objevený při kopání nebo jiná tajná vrstva ostrova.
- Skryté lokace a změna získávání pokročilých nástrojů jsou vývojové záměry, nikoli tvrzení o již hotové verzi.
- Při přidávání obsahu hlídáme návaznost, srozumitelnost a výkon na mobilu.

Nový crafting, stavby nebo zvířata samy o sobě nejsou důvodem k přepisu do jiného enginu. Novou technologii zvážíme při konkrétním požadavku, například rozsáhlém multiplayeru, zásadním výkonovém limitu nebo plnohodnotné VR hře. Nejprve změříme problém a porovnáme náklady přechodu.

## 8. Spuštění a předání práce

Nynější hru spustíme v kořeni repozitáře:

```sh
python3 -m http.server 8000 --directory dist
```

Otevřeme `http://localhost:8000`. Prohlížeč musí podporovat potřebné 3D a JavaScriptové funkce; samotné otevření HTML souboru přes `file://` není vhodný způsob spuštění.

Každý dokončený vývojový úkol končí stručným předáním: co se změnilo, odkaz na commit nebo pull request, jaké scénáře byly ověřeny, případná omezení a zda jde o pracovní stav, uloženou verzi, nebo skutečně publikovanou hru.

Chatová konverzace může skončit nebo se změnit. Další asistent musí být schopen pokračovat podle repozitáře, tohoto dokumentu a konkrétního zadání. Případná plánovaná rutina má rovněž začínat aktuálním GitHubem; její nastavení se tímto dokumentem samo nemění.

## 9. Referenční dokumentace

Pracovní kandidát z 25. 9. 2026 a jeho testy, omezení i kroky před vydáním jsou
zaznamenány v [herním sprintu](SPRINT-2026-09-25.md) a
[draft PR #1](https://github.com/MinarikEffecto/Hra/pull/1). `main` a živá
verze Sites zůstávají na výchozím stavu do dokončení prohlížečového ověření.

- [GitHub flow](https://docs.github.com/en/get-started/using-github/github-flow) – větve, kontrola a začleňování změn.
- [ChatGPT Sites](https://learn.chatgpt.com/docs/sites) – verze, publikování, hosting a úložiště D1/R2.

Možnosti hostingu se mohou měnit. Při implementaci databáze, přihlášení nebo automatického publikování znovu ověříme aktuální dokumentaci. Tento průvodce aktualizujeme spolu s významnými změnami projektu.
