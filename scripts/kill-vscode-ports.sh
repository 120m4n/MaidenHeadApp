#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <port|pattern> [more ports/patterns]"
  echo "Examples:"
  echo "  $0 6060 4200"
  echo "  $0 6060,420x"
  echo "Patterns:"
  echo "  x means any digit (e.g. 420x => 4200..4209, 42xx => 4200..4299)"
}

expand_pattern_recursive() {
  local pattern="$1"
  local index="$2"
  local prefix="$3"

  if [[ "$index" -ge "${#pattern}" ]]; then
    echo "$prefix"
    return
  fi

  local char="${pattern:$index:1}"
  if [[ "$char" =~ [0-9] ]]; then
    expand_pattern_recursive "$pattern" "$((index + 1))" "${prefix}${char}"
    return
  fi

  if [[ "$char" == "x" || "$char" == "X" ]]; then
    local d
    for d in 0 1 2 3 4 5 6 7 8 9; do
      expand_pattern_recursive "$pattern" "$((index + 1))" "${prefix}${d}"
    done
    return
  fi

  return 1
}

expand_pattern() {
  local pattern="$1"
  expand_pattern_recursive "$pattern" 0 ""
}

if [[ "$#" -eq 0 ]]; then
  usage
  exit 1
fi

# Allow passing ports with spaces and/or commas in one argument list.
raw_input="$*"
raw_input="${raw_input//,/ }"

tmp_ports_file="$(mktemp)"
trap 'rm -f "$tmp_ports_file"' EXIT

invalid_tokens=0
for token in $raw_input; do
  if [[ "$token" =~ ^[0-9]+$ ]]; then
    echo "$token" >> "$tmp_ports_file"
    continue
  fi

  if [[ "$token" =~ ^[0-9xX]+$ ]] && [[ "$token" == *[xX]* ]]; then
    expand_pattern "$token" >> "$tmp_ports_file"
    continue
  fi

  echo "Ignoring invalid token: $token" >&2
  invalid_tokens=$((invalid_tokens + 1))
done

if [[ ! -s "$tmp_ports_file" ]]; then
  echo "No valid ports were provided."
  usage
  exit 1
fi

killed_total=0
ports_with_process=0

while IFS= read -r port; do
  # Find PIDs listening on the port.
  pids="$(lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"

  if [[ -z "$pids" ]]; then
    echo "Port $port: no listening process"
    continue
  fi

  ports_with_process=$((ports_with_process + 1))
  echo "Port $port: stopping PID(s): $pids"

  # Try graceful shutdown first.
  kill $pids 2>/dev/null || true

  # Force kill anything still alive on the same port.
  remaining="$(lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$remaining" ]]; then
    echo "Port $port: force killing PID(s): $remaining"
    kill -9 $remaining 2>/dev/null || true
  fi

  killed_total=$((killed_total + 1))
done < <(sort -u "$tmp_ports_file")

echo "Done. Ports checked: $(sort -u "$tmp_ports_file" | wc -l | tr -d ' '), ports with processes: $ports_with_process"

if [[ "$invalid_tokens" -gt 0 ]]; then
  echo "Note: $invalid_tokens invalid token(s) were ignored."
fi
