# Ochrana uložené pozice při změně rozložení ostrova

Stav palem, počty jejich kokosů a stav keřů jsou v uložené pozici přiřazeny
objektům podle pořadí. Samotný počet objektů nestačí: prohození dvou palem nebo
keřů by mohlo obnovit pokácený stav na nesprávném místě.

Nově vytvořená pozice obsahuje volitelné `world.layout`, tedy uspořádané dvojice
souřadnic `[x, z]` pro `trees` a `bushes` v celých milimetrech. Zaokrouhlení
odstraňuje nepatrné rozdíly ve výpočtu souřadnic mezi prostředími JavaScriptu;
změny umístění menší než přibližně půl milimetru se nerozliší. Při načtení,
importu a výběru zálohy se souřadnice porovnají se současným ostrovem ještě
před změnou herního stavu.
Neshodná pozice se neaplikuje ani neslouží jako kompatibilní záloha. Původní
záznam zůstává uložený; při dostupné kompatibilní záloze hra obnoví ji a další
automatické uložení tuto zálohu nepřepíše neshodným primárním záznamem.

Nové pozice mají `schemaVersion: 3` ve stejných slotech prohlížeče. Starší kód
pro v2 tím rozpozná novější pozici a díky stávající ochraně ji nepřepíše ani
nesmaže její souřadnice. Pole je volitelné při validaci, protože již existující
pozice v1 i v2 je nemají a převod neumí jejich původní pořadí zjistit. U nich
se zachová dosavadní kontrola počtů a postup hráče se načte. Po novém uložení už pozice
obsahuje souřadnice aktuálního ostrova. Historické pozice bez `world.layout`
nedokážou odhalit starší přesun či prohození objektů při nezměněném počtu;
takový rozdíl by vyžadoval výslovnou migraci podle konkrétních verzí mapy.

Jde o kontrolu kompatibility generovaného pořadí, nikoli o podpis proti úpravám
souboru. Pokud se v budoucnu změní pozice objektů záměrně, nový kód musí dodat
mapování stavu nebo ponechat neshodnou pozici k exportu a pozdější migraci.
