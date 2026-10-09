#!/bin/sh
# Uso: ./bump.sh N  — porta tutto alla versione N (etichette, import map, cache, controllo automatico).
set -e
N="$1"; [ -n "$N" ] || { echo "uso: ./bump.sh N"; exit 1; }
cd "$(dirname "$0")"
echo "{\"v\":$N}" > versione.json
sed -i -E "s/\?v=[0-9]+/?v=$N/g; s/>v[0-9]+</>v$N</; s/const V=[0-9]+/const V=$N/" index.html gioco/index.html
grep -c "v=$N" index.html gioco/index.html
