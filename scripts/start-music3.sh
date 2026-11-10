#!/usr/bin/env bash
#
# Sobe o MiniMax Music 3 self-hosted (SGLang-Omni) na maquina local.
#
#   ./start-music3.sh              # sobe em primeiro plano
#   ./start-music3.sh --daemon     # sobe em background e espera ficar pronto
#
# O BR Music aponta para http://127.0.0.1:8000 (painel: Configuracoes >
# Geracao de musica > Provedor de audio > MiniMax Music 3 (self-hosted)).
set -euo pipefail

BASE_DIR="${MUSIC3_DIR:-/mnt/corsair/ai/music3}"
MODEL_DIR="${MUSIC3_MODEL_DIR:-$BASE_DIR/model}"
VENV="$BASE_DIR/.venv"
PORT="${MUSIC3_PORT:-8010}"
HOST="${MUSIC3_HOST:-127.0.0.1}"
# As duas GPUs: a etapa autoregressiva fica na 0, o DiT e o decoder na 1.
GPUS="${MUSIC3_GPUS:-0,1}"
LOG="$BASE_DIR/server.log"

if [ ! -x "$VENV/bin/sgl-omni" ]; then
  echo "runtime ausente em $VENV/bin/sgl-omni" >&2
  echo "instale com: uv pip install --prerelease=allow 'sglang-omni==0.1.3'" >&2
  exit 1
fi

if [ ! -d "$MODEL_DIR" ]; then
  echo "pesos do modelo ausentes em $MODEL_DIR" >&2
  exit 1
fi

start() {
  CUDA_VISIBLE_DEVICES="$GPUS" \
  "$VENV/bin/sgl-omni" serve \
    --model-path "$MODEL_DIR" \
    --model-name MiniMaxAI/MiniMax-Music3 \
    --host "$HOST" \
    --port "$PORT" \
    --max-running-requests 1
}

if [ "${1:-}" = "--daemon" ]; then
  # shellcheck disable=SC2086
  nohup env CUDA_VISIBLE_DEVICES="$GPUS" "$VENV/bin/sgl-omni" serve \
    --model-path "$MODEL_DIR" \
    --model-name MiniMaxAI/MiniMax-Music3 \
    --host "$HOST" \
    --port "$PORT" \
    --max-running-requests 1 \
    > "$LOG" 2>&1 &

  echo "subindo, aguardando a porta $PORT responder..."
  for _ in $(seq 1 120); do
    if curl -fsS "http://$HOST:$PORT/health" > /dev/null 2>&1; then
      echo "pronto: http://$HOST:$PORT"
      exit 0
    fi
    sleep 5
  done
  echo "o servidor nao respondeu a tempo, veja $LOG" >&2
  exit 1
fi

start
