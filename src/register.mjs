// POST /members
// Registra un afiliado nuevo o renueva la mensualidad de uno existente.
// Body: { "name": "Carlos", "email": "carlos@gmail.com", "plan": "mensual", "paidAt": "2026-10-18" }
// paidAt es opcional (por defecto: hoy en Bogota).

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  PLAN_MONTHS,
  addMonths,
  isValidDate,
  json,
  membershipStatus,
  readJsonBody,
  todayInBogota,
} from "./shared.mjs";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(body, today) {
  const errors = [];
  if (!body || typeof body !== "object")
    return ["El body debe ser un objeto JSON"];
  if (typeof body.name !== "string" || !body.name.trim())
    errors.push("name es obligatorio");
  if (typeof body.email !== "string" || !EMAIL_REGEX.test(body.email.trim())) {
    errors.push("email no es valido");
  }
  if (!PLAN_MONTHS[body.plan]) {
    errors.push(`plan debe ser uno de: ${Object.keys(PLAN_MONTHS).join(", ")}`);
  }
  if (body.paidAt !== undefined) {
    if (!isValidDate(body.paidAt))
      errors.push("paidAt debe tener formato YYYY-MM-DD");
    else if (body.paidAt > today)
      errors.push("paidAt no puede ser una fecha futura");
  }
  return errors;
}

export const handler = async (event) => {
  let body;
  try {
    body = readJsonBody(event);
  } catch {
    return json(400, { error: "El body no es un JSON valido" });
  }

  const today = todayInBogota();
  const errors = validate(body, today);
  if (errors.length > 0) return json(400, { errors });

  const email = body.email.trim().toLowerCase();
  const paidAt = body.paidAt ?? today;

  const { Item: existing } = await ddb.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { memberId: email } }),
  );

  // Si aun tiene dias pagos, la renovacion se suma desde su vencimiento actual
  const startFrom =
    existing && existing.expiresAt > paidAt ? existing.expiresAt : paidAt;
  const expiresAt = addMonths(startFrom, PLAN_MONTHS[body.plan]);
  const now = new Date().toISOString();

  // Al no copiar lastNotice, una renovacion reinicia los avisos
  const member = {
    memberId: email,
    name: body.name.trim(),
    email,
    plan: body.plan,
    lastPaymentAt: paidAt,
    expiresAt,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: member }));

  console.log(
    JSON.stringify({
      action: existing ? "renewed" : "registered",
      email,
      expiresAt,
    }),
  );

  return json(existing ? 200 : 201, {
    message: existing
      ? "Pago registrado: mensualidad renovada"
      : "Afiliado registrado",
    member: { ...member, ...membershipStatus(expiresAt, today) },
  });
};
