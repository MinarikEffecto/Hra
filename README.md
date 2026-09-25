# Trosečník · Malý ostrov

Zdrojová kopie aktuální hry z ChatGPT Sites, verze **21**. Hra běží jako statický web bez sestavovacího kroku. Všechny soubory potřebné ke spuštění jsou v `dist/`, včetně zvuků a lokálních knihoven Three.js a Rapier.

## Spuštění na počítači

V kořeni repozitáře spusťte:

```sh
python3 -m http.server 8000 --directory dist
```

Pak otevřete `http://localhost:8000`. Hru je potřeba otevřít přes HTTP server kvůli JavaScriptovým modulům a načítání zvuků.

## Struktura

- `dist/index.html` a `dist/style.css` – herní obrazovka a vzhled.
- `dist/*.js` – herní logika, svět, fyzika, průzkum, přežití a výroba.
- `dist/audio/` – zvuky a soubory `*.source.txt` s původem každé nahrávky.
- `dist/vendor/` – lokální knihovny pro 3D zobrazení a fyziku.
- `.openai/hosting.json` – vazba na existující projekt ChatGPT Sites; pro běžné lokální spuštění není potřeba.

## Další verze

Tento repozitář je výchozí místo pro změny hry. Upravujte soubory v `dist/` a změny ukládejte do Gitu. Současná veřejná hra běží na [ChatGPT Sites](https://trosechnik-tropicky-ostrov.minarik625722.chatgpt.site); samotný commit na GitHubu ji automaticky neaktualizuje. Při vydání další verze je potřeba změny z tohoto repozitáře také publikovat do existujícího projektu Sites.

## Použité zdroje

Zvukové nahrávky mají původ a licenci uvedenou v souborech `dist/audio/*.source.txt`. Kód knihovny Three.js obsahuje označení licence MIT; další knihovna Rapier je součástí `dist/vendor/`. Při dalším šíření zachovejte původní licenční podmínky použitých knihoven a nahrávek.
