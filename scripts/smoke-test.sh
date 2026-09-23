#!/usr/bin/env bash

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"

env_value() {
  grep -E "^$1=" "$ROOT_DIR/.env" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '\r'
}

if [[ -n "${1:-}" ]]; then
  BASE_URL=$1
elif [[ -z "${BASE_URL:-}" ]]; then
  WEB_PORT=$(env_value WEB_PORT)
  WEB_PORT=${WEB_PORT:-80}
  if [[ $WEB_PORT == 80 ]]; then BASE_URL="http://localhost"; else BASE_URL="http://localhost:$WEB_PORT"; fi
fi
BASE_URL=${BASE_URL%/}
WAIT=${SMOKE_WAIT:-2}

JAR=$(mktemp)
TAMPERED_JAR=$(mktemp)
HEADERS=$(mktemp)
trap 'rm -f "$JAR" "$TAMPERED_JAR" "$HEADERS"' EXIT

PASS=0
FAIL=0
if [[ -t 1 ]]; then
  GREEN=$'\033[32m'; RED=$'\033[31m'; DIM=$'\033[2m'; RESET=$'\033[0m'
else
  GREEN=''; RED=''; DIM=''; RESET=''
fi

pass() { printf '  %sPASS%s %s\n' "$GREEN" "$RESET" "$1"; PASS=$((PASS + 1)); }
fail() {
  printf '  %sFAIL%s %s\n' "$RED" "$RESET" "$1"
  [[ -n ${2:-} ]] && printf '       %s%s%s\n' "$DIM" "$2" "$RESET"
  FAIL=$((FAIL + 1))
}
section() { printf '\n%s\n' "$1"; }

call() {
  local method=$1 path=$2 data=${3:-} jar=${4:-$JAR}
  local args=(-s -X "$method" -D "$HEADERS" -b "$jar" -c "$jar" --max-time 5 -w $'\n%{http_code}')
  if [[ -n $data ]]; then args+=(-H 'Content-Type: application/json' --data "$data"); fi
  local out
  out=$(curl "${args[@]}" "$BASE_URL$path") || true
  STATUS=${out##*$'\n'}
  BODY=${out%$'\n'*}
}

num() { grep -o "\"$1\":[0-9]*" <<<"$BODY" | head -1 | cut -d: -f2; }
str() { grep -o "\"$1\":\"[A-Z_]*\"" <<<"$BODY" | head -1 | cut -d'"' -f4; }
beats() { case "$1:$2" in ROCK:SCISSORS | PAPER:ROCK | SCISSORS:PAPER) return 0 ;; *) return 1 ;; esac; }
has_new_cookie() { grep -qiE '^set-cookie: [^=]+=s%3A' "$HEADERS"; }

printf 'Smoke test → %s\n' "$BASE_URL"

# ---------------------------------------------------------------------------
section "[1] หน้าเว็บ"
call GET /
if [[ $STATUS == 000 ]]; then
  fail "เชื่อมต่อ $BASE_URL ไม่ได้" "ระบบรันอยู่หรือไม่? ตรวจด้วย: docker compose ps"
  exit 1
fi
if [[ $STATUS == 200 ]] && grep -q 'id="root"' <<<"$BODY"; then
  pass "nginx เสิร์ฟหน้าเว็บ"
else
  fail "nginx เสิร์ฟหน้าเว็บ" "HTTP $STATUS"
fi

# ---------------------------------------------------------------------------
section "[2] session"
call GET /api/session
START=$(num currentScore)
HIGH=$(num highScore)
if [[ $STATUS == 200 && -n $START && -n $HIGH ]]; then
  pass "โหลดคะแนน (Your Score $START, High Score $HIGH)"
else
  fail "โหลดคะแนน" "HTTP $STATUS $BODY"
fi
has_new_cookie && pass "ออก session cookie แบบมีลายเซ็น" || fail "ออก session cookie แบบมีลายเซ็น"
grep -qi '^set-cookie:.*httponly' "$HEADERS" && pass "cookie เป็น HttpOnly" || fail "cookie เป็น HttpOnly"

# ---------------------------------------------------------------------------
section "[3] เล่นหนึ่งตา"
call POST /api/play '{"move":"ROCK"}'
BOT=$(str botMove)
RESULT=$(str result)
SCORE=$(num currentScore)

if [[ $STATUS == 200 && $BOT =~ ^(ROCK|PAPER|SCISSORS)$ ]]; then
  pass "บอทสุ่ม action ที่ server ($BOT)"
else
  fail "เล่นหนึ่งตา" "HTTP $STATUS $BODY"
fi

if [[ $BOT == ROCK ]]; then EXPECTED_RESULT=DRAW
elif beats ROCK "$BOT"; then EXPECTED_RESULT=WIN
else EXPECTED_RESULT=LOSE; fi
[[ $RESULT == "$EXPECTED_RESULT" ]] \
  && pass "ตัดสินผลถูกต้อง (ROCK vs $BOT = $RESULT)" \
  || fail "ตัดสินผลถูกต้อง" "ได้ $RESULT ควรเป็น $EXPECTED_RESULT"

case $RESULT in
  WIN) EXPECTED_SCORE=$((START + 1)) ;;
  LOSE) EXPECTED_SCORE=0 ;;
  *) EXPECTED_SCORE=$START ;;
esac
[[ $SCORE == "$EXPECTED_SCORE" ]] \
  && pass "คะแนนเปลี่ยนตามกติกา ($RESULT: $START → $SCORE)" \
  || fail "คะแนนเปลี่ยนตามกติกา" "$RESULT: $START → $SCORE ควรเป็น $EXPECTED_SCORE"

# ---------------------------------------------------------------------------
section "[4] กดรัว"
call POST /api/play '{"move":"PAPER"}'
[[ $STATUS == 429 ]] \
  && pass "เล่นซ้ำทันทีถูกปฏิเสธ (429)" \
  || fail "เล่นซ้ำทันทีถูกปฏิเสธ" "ได้ HTTP $STATUS ควรเป็น 429"

# ---------------------------------------------------------------------------
sleep "$WAIT"
section "[5] input ไม่ถูกต้อง"
call POST /api/play '{"move":"FIRE"}'
[[ $STATUS == 400 ]] \
  && pass "move ที่ไม่มีอยู่ถูกปฏิเสธ (400)" \
  || fail "move ที่ไม่มีอยู่ถูกปฏิเสธ" "ได้ HTTP $STATUS ควรเป็น 400"

# ---------------------------------------------------------------------------
sleep "$WAIT"
section "[6] ส่งคะแนนปลอมมาด้วย"
call POST /api/play '{"move":"ROCK","currentScore":999,"result":"WIN"}'
FAKE=$(num currentScore)
if [[ $STATUS == 200 && -n $FAKE && $FAKE -le $((SCORE + 1)) ]]; then
  pass "server ไม่เชื่อคะแนนจาก client (ได้ $FAKE ไม่ใช่ 999)"
else
  fail "server ไม่เชื่อคะแนนจาก client" "HTTP $STATUS $BODY"
fi
[[ -n $FAKE ]] && SCORE=$FAKE

# ---------------------------------------------------------------------------
section "[7] จำคะแนนข้าม request"
call GET /api/session
STORED=$(num currentScore)
HIGH=$(num highScore)
[[ $STATUS == 200 && $STORED == "$SCORE" ]] \
  && pass "Your Score ยังอยู่ ($STORED)" \
  || fail "Your Score ยังอยู่" "ได้ $STORED ควรเป็น $SCORE"
has_new_cookie \
  && fail "cookie ที่ถูกต้องต้องไม่ถูกออกใหม่" \
  || pass "cookie ที่ถูกต้องไม่ถูกออกใหม่"
[[ -n $HIGH && -n $STORED && $HIGH -ge $STORED ]] \
  && pass "High Score ($HIGH) ไม่ต่ำกว่า Your Score ($STORED)" \
  || fail "High Score ไม่ต่ำกว่า Your Score" "High $HIGH, Your $STORED"

# ---------------------------------------------------------------------------
section "[8] แก้ cookie เพื่อสวมรอย"
sed -E 's/(s%3A[^.[:space:]]+)\.[^[:space:]]+$/\1.forged/' "$JAR" >"$TAMPERED_JAR"
call GET /api/session '' "$TAMPERED_JAR"
if [[ $STATUS == 200 ]] && has_new_cookie; then
  pass "ลายเซ็นไม่ตรง → ถูกถือเป็นผู้เล่นใหม่"
else
  fail "ลายเซ็นไม่ตรง → ถูกถือเป็นผู้เล่นใหม่" "HTTP $STATUS"
fi

# ---------------------------------------------------------------------------
section "[9] WebSocket ผ่าน nginx"
WS_HEADERS=$(curl -s -o /dev/null -D - --http1.1 --max-time 3 \
  -H 'Connection: Upgrade' -H 'Upgrade: websocket' \
  -H 'Sec-WebSocket-Version: 13' -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' \
  "$BASE_URL/api/ws" || true)
grep -q '^HTTP/1.1 101' <<<"$WS_HEADERS" \
  && pass "upgrade เป็น WebSocket ได้ (101)" \
  || fail "upgrade เป็น WebSocket ได้" "$(head -1 <<<"$WS_HEADERS")"

# ---------------------------------------------------------------------------
section "[10] service หลังบ้านไม่เปิดสู่ภายนอก"
if [[ ${SKIP_PORT_CHECK:-0} == 1 ]]; then
  echo "  SKIP (SKIP_PORT_CHECK=1)"
else
  HOST=$(sed -E 's#^[a-z]+://([^:/]+).*#\1#' <<<"$BASE_URL")
  for port in 3000 3001 3002 5432 6379; do
    if timeout 2 bash -c "exec 3<>/dev/tcp/$HOST/$port" 2>/dev/null; then
      fail "port $port เปิดอยู่"
    else
      pass "port $port ปิด"
    fi
  done
fi

# ---------------------------------------------------------------------------
section "[11] health ของ service"
if command -v docker >/dev/null 2>&1 \
  && docker compose -f "$COMPOSE_FILE" ps --status running -q gateway 2>/dev/null | grep -q .; then
  for target in gateway:3000 game:3001 user:3002; do
    name=${target%%:*}
    port=${target##*:}
    if docker compose -f "$COMPOSE_FILE" exec -T "$name" wget -qO- "http://127.0.0.1:$port/health" 2>/dev/null \
      | grep -q '"status":"ok"'; then
      pass "$name healthy"
    else
      fail "$name healthy"
    fi
  done
else
  echo "  SKIP (ไม่พบ docker compose ที่รันอยู่ในเครื่องนี้)"
fi

# ---------------------------------------------------------------------------
TOTAL=$((PASS + FAIL))
printf '\n'
if ((FAIL == 0)); then
  printf '%sผ่านทั้งหมด %d/%d%s\n' "$GREEN" "$PASS" "$TOTAL" "$RESET"
else
  printf '%sไม่ผ่าน %d จาก %d%s\n' "$RED" "$FAIL" "$TOTAL" "$RESET"
  exit 1
fi
