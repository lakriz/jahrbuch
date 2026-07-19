# jahrbuch

ein jahrbuch für die montessori schule kaufering

## Betrieb mit Docker

Die App läuft komplett in einem Container (Next.js + SQLite + Chromium für den
PDF-Export). Alle persistenten Daten — SQLite-Datenbank und hochgeladene Bilder —
liegen in **einem** Ordner (`data/`). Backup oder Umzug auf einen anderen Rechner
heißt: diesen Ordner kopieren.

### Starten (macOS / Linux / Windows)

Voraussetzung: [Docker Desktop](https://www.docker.com/products/docker-desktop/)
(unter Windows mit WSL2-Backend, der Standardeinstellung).

```bash
git clone <repo-url> jahrbuch
cd jahrbuch
docker compose up -d --build
```

Danach läuft die App auf <http://localhost:3000>. Der erste Build dauert einige
Minuten (Chromium-Installation). Bei Code-Updates: `git pull` und erneut
`docker compose up -d --build` — Schema-Änderungen an der Datenbank werden beim
Start **automatisch migriert**, vorhandene Daten bleiben erhalten.

### Hinweis für Windows

Docker Desktop führt Linux-Container aus — das Image wird beim `--build` nativ
für den jeweiligen Rechner gebaut (amd64 auf Windows-PCs, arm64 auf Apple
Silicon). Es muss also kein Image übertragen werden, das Repository genügt.

SQLite mag keine Windows-Bind-Mounts: Liegt das Projekt unter `C:\...`, kann der
`./data`-Mount zu Sperr-/Performanceproblemen führen. Zwei Auswege:

1. **Empfohlen:** Projekt ins WSL2-Dateisystem klonen (z. B. unter
   `\\wsl$\Ubuntu\home\<user>\jahrbuch`) und `docker compose` von dort ausführen.
2. Alternativ in `docker-compose.yml` die auskommentierte **Named-Volume**-
   Variante aktivieren. Backup dann via:
   `docker run --rm -v jahrbuch_data:/data -v ${PWD}:/backup alpine tar czf /backup/jahrbuch-backup.tar.gz -C /data .`

### Image ohne Build übertragen (optional)

Falls auf dem Zielrechner nicht gebaut werden soll, kann das Image z. B. auf dem
Mac für amd64 gebaut und als Datei übergeben werden:

```bash
docker buildx build --platform linux/amd64 -t jahrbuch:amd64 --load .
docker save jahrbuch:amd64 -o jahrbuch-amd64.tar
# auf dem Windows-Rechner:
docker load -i jahrbuch-amd64.tar
```

### Daten & Backup

| Was | Wo |
| --- | --- |
| SQLite-Datenbank | `data/jahrbuch.db` |
| Bild-Uploads + Thumbnails | `data/uploads/` |
| Backup | `data/`-Ordner kopieren (Container vorher stoppen: `docker compose down`) |

## Entwicklung

```bash
npm install
npm run dev
```

Die Daten liegen auch im Dev-Betrieb unter `./data` (überschreibbar per
Umgebungsvariable `DATA_DIR`).
