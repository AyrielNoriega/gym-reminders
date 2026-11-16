#!/usr/bin/env bash
# Carga afiliados de ejemplo para probar y para el demo.
# Se ejecuta en AWS CloudShell despues de `sam deploy`:
#
#   bash scripts/seed.sh           # agrega los afiliados de ejemplo
#   bash scripts/seed.sh --reset   # vacia la tabla y vuelve a sembrar (para repetir el demo)
#
# Carlos NO esta aqui: se registra en vivo con Postman durante el demo.
# Las fechas se calculan desde hoy (hora Bogota), asi el demo funciona cualquier dia.
#
# Ojo: volver a sembrar sin --reset cuenta como renovacion (suma meses y reinicia avisos).

set -euo pipefail

STACK_NAME="${STACK_NAME:-gym-reminders}"

stack_output() {
  aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}

API_URL="${API_URL:-$(stack_output ApiUrl)}"
TABLE_NAME="${TABLE_NAME:-$(stack_output MembersTableName)}"
API_URL="${API_URL%/}"

TODAY="$(TZ=America/Bogota date +%F)"
days_ago() { date -d "$TODAY -$1 days" +%F; }

echo "API:   $API_URL"
echo "Tabla: $TABLE_NAME"
echo "Hoy:   $TODAY (Bogota)"
echo

if [[ "${1:-}" == "--reset" ]]; then
  echo "Vaciando la tabla..."
  # Se guarda primero en una variable para que set -e detenga el script si el scan falla
  # (si no, sembraria sobre datos viejos y todo contaria como renovacion)
  ids="$(aws dynamodb scan --table-name "$TABLE_NAME" \
    --projection-expression memberId --query 'Items[].memberId.S' --output text)"
  for id in $ids; do
    [[ "$id" == "None" ]] && continue
    aws dynamodb delete-item --table-name "$TABLE_NAME" \
      --key "{\"memberId\": {\"S\": \"$id\"}}"
    echo "  borrado $id"
  done
  echo
fi

register() {
  local name="$1" email="$2" plan="$3" paid_at="$4" expected="$5"
  local body code
  body="{\"name\": \"$name\", \"email\": \"$email\", \"plan\": \"$plan\", \"paidAt\": \"$paid_at\"}"
  code="$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$API_URL/members" \
    -H 'content-type: application/json' -d "$body")"
  printf '  %-4s %-11s %-28s %-11s pago %s -> %s\n' "$code" "$name" "$email" "$plan" "$paid_at" "$expected"
}

echo "Registrando afiliados de ejemplo..."
# Activos: no reciben correo, por eso pueden usar correos ficticios (@example.com)
register "Andrea"    "andrea@example.com"    "trimestral" "$(days_ago 20)"  "activo"
register "Jorge"     "jorge@example.com"     "anual"      "$(days_ago 100)" "activo"
register "Valentina" "valentina@example.com" "mensual"    "$(days_ago 5)"   "activo"
# Vencida: SI recibe correo, por eso debe estar verificada en SES (sandbox)
register "Luisa"     "luisa-gym-demo@yopmail.com" "mensual" "$(days_ago 35)" "vencido"

echo
echo "Listo. Revisa con: curl -s $API_URL/members"
