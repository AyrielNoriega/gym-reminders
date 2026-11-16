// Utilidades compartidas por las tres Lambdas.

export const TIMEZONE = "America/Bogota";

// Planes disponibles y cuantos meses suma cada uno
export const PLAN_MONTHS = {
  mensual: 1,
  trimestral: 3,
  semestral: 6,
  anual: 12,
};

export const REMINDER_DAYS_BEFORE = Number(
  process.env.REMINDER_DAYS_BEFORE ?? 3,
);

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Fecha de hoy en Bogota con formato YYYY-MM-DD
export function todayInBogota() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function isValidDate(value) {
  if (typeof value !== "string" || !DATE_REGEX.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function toUtcDate(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`);
}

function toDateStr(date) {
  return date.toISOString().slice(0, 10);
}

// Suma meses respetando fin de mes (31 de enero + 1 mes = 28/29 de febrero)
export function addMonths(dateStr, months) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const lastDayOfTarget = new Date(
    Date.UTC(year, month - 1 + months + 1, 0),
  ).getUTCDate();
  const target = new Date(
    Date.UTC(year, month - 1 + months, Math.min(day, lastDayOfTarget)),
  );
  return toDateStr(target);
}

export function addDays(dateStr, days) {
  const date = toUtcDate(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateStr(date);
}

export function daysBetween(fromStr, toStr) {
  return Math.round((toUtcDate(toStr) - toUtcDate(fromStr)) / 86_400_000);
}

// activo | por_vencer | vencido
export function membershipStatus(expiresAt, today) {
  const daysLeft = daysBetween(today, expiresAt);
  if (daysLeft < 0) return { status: "vencido", daysLeft };
  if (daysLeft <= REMINDER_DAYS_BEFORE)
    return { status: "por_vencer", daysLeft };
  return { status: "activo", daysLeft };
}

// "18 de noviembre"
export function formatDateEs(dateStr) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(toUtcDate(dateStr));
}

export function readJsonBody(event) {
  if (!event?.body) return null;
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;
  return JSON.parse(raw);
}

export function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}
