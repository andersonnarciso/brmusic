#!/usr/bin/env bash
#
# Aponta o BR Music para o MiniMax Music 3 self-hosted local.
#
#   ./scripts/use-local-music3.sh            # mostra o estado e o plano
#   ./scripts/use-local-music3.sh --apply    # aplica no app desktop
#   ./scripts/use-local-music3.sh --revert   # volta para a MiniMax hospedada
#
# O app desktop guarda a configuracao em:
#   ~/.config/BR Music/data/config.json
set -euo pipefail

CONFIG="${BRMUSIC_CONFIG:-$HOME/.config/BR Music/data/config.json}"
PORT="${MUSIC3_PORT:-8010}"
URL="http://127.0.0.1:${PORT}"

if [ ! -f "$CONFIG" ]; then
  echo "configuracao nao encontrada: $CONFIG" >&2
  exit 1
fi

show() {
  python3 - "$CONFIG" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
m = d.get("musicProvider", {})
print(f"  modo:    {m.get('mode')}")
print(f"  vendor:  {m.get('vendor')}")
print(f"  url:     {m.get('baseUrl')}{m.get('endpoint')}")
print(f"  modelo:  {m.get('model')}")
print(f"  ativo:   {m.get('enabled')}")
print(f"  duracao: {m.get('durationSec')}s")
PY
}

echo "configuracao atual do app desktop ($CONFIG):"
show

echo
echo "servidor local:"
if curl -fsS "$URL/health" > /dev/null 2>&1; then
  echo "  no ar em $URL"
else
  echo "  OFFLINE em $URL (suba com: systemctl --user start minimax-music3)"
fi

case "${1:-}" in
  --apply)
    python3 - "$CONFIG" "$URL" <<'PY'
import json, sys
path, url = sys.argv[1], sys.argv[2]
d = json.load(open(path))
m = d.setdefault("musicProvider", {})
m.update({
    "mode": "external-audio",
    "vendor": "minimax-music3",
    "baseUrl": url,
    "endpoint": "/v1/audio/speech",
    "model": "MiniMaxAI/MiniMax-Music3",
    "enabled": True,
    "durationSec": 30,
})
json.dump(d, open(path, "w"), indent=2, ensure_ascii=False)
print("aplicado: MiniMax Music 3 self-hosted em", url)
PY
    show
    ;;
  --revert)
    python3 - "$CONFIG" <<'PY'
import json, sys
path = sys.argv[1]
d = json.load(open(path))
m = d.setdefault("musicProvider", {})
m.update({
    "mode": "external-audio",
    "vendor": "minimax",
    "baseUrl": "https://api.minimax.io/v1",
    "endpoint": "/music_generation",
    "model": "music-3.0",
})
json.dump(d, open(path, "w"), indent=2, ensure_ascii=False)
print("voltou para a MiniMax hospedada")
PY
    show
    ;;
  *)
    echo
    echo "use --apply para apontar o app para o servidor local, ou --revert para voltar."
    ;;
esac
