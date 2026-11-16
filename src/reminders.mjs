// Se ejecuta todos los dias (EventBridge Scheduler) o manualmente.
// Busca afiliados que vencen pronto o ya vencieron y les envia un correo.
// Cada aviso se envia una sola vez por vencimiento (campo lastNotice).

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import {
  REMINDER_DAYS_BEFORE,
  addDays,
  formatDateEs,
  membershipStatus,
  todayInBogota,
} from "./shared.mjs";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ses = new SESClient({});
const TABLE_NAME = process.env.TABLE_NAME;
const SENDER_EMAIL = process.env.SENDER_EMAIL;
const GYM_NAME = process.env.GYM_NAME ?? "Tu gimnasio";

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function findMembersToCheck(limitDate) {
  const items = [];
  let lastKey;
  do {
    const page = await ddb.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: "expiresAt <= :limit",
        ExpressionAttributeValues: { ":limit": limitDate },
        ExclusiveStartKey: lastKey,
      }),
    );
    items.push(...(page.Items ?? []));
    lastKey = page.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

function buildEmail(member, status, daysLeft) {
  const date = formatDateEs(member.expiresAt);
  const name = escapeHtml(member.name);
  const plan = escapeHtml(member.plan);

  if (status === "vencido") {
    return {
      subject: `${GYM_NAME}: tu mensualidad vencio el ${date}`,
      text: `Hola ${member.name}, tu plan ${member.plan} vencio el ${date}. Te esperamos en recepcion para renovarlo y seguir entrenando.`,
      html: `<p>Hola <strong>${name}</strong>,</p><p>Tu plan <strong>${plan}</strong> vencio el <strong>${date}</strong>.</p><p>Te esperamos en recepcion para renovarlo y seguir entrenando. 💪</p><p>— ${escapeHtml(GYM_NAME)}</p>`,
    };
  }

  const when =
    daysLeft === 0 ? "hoy" : daysLeft === 1 ? "manana" : `en ${daysLeft} dias`;
  return {
    subject: `${GYM_NAME}: tu mensualidad vence ${when}`,
    text: `Hola ${member.name}, tu plan ${member.plan} vence ${when} (${date}). Renuevalo en recepcion para no perder tu ritmo.`,
    html: `<p>Hola <strong>${name}</strong>,</p><p>Tu plan <strong>${plan}</strong> vence <strong>${when}</strong> (${date}).</p><p>Renuevalo en recepcion para no perder tu ritmo. 💪</p><p>— ${escapeHtml(GYM_NAME)}</p>`,
  };
}

async function sendReminder(member, status, daysLeft) {
  const email = buildEmail(member, status, daysLeft);
  await ses.send(
    new SendEmailCommand({
      Source: `${GYM_NAME} <${SENDER_EMAIL}>`,
      Destination: { ToAddresses: [member.email] },
      Message: {
        Subject: { Data: email.subject, Charset: "UTF-8" },
        Body: {
          Text: { Data: email.text, Charset: "UTF-8" },
          Html: { Data: email.html, Charset: "UTF-8" },
        },
      },
    }),
  );
}

async function markAsNotified(member, notice) {
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { memberId: member.memberId },
      UpdateExpression: "SET lastNotice = :notice, lastNotifiedAt = :now",
      ExpressionAttributeValues: {
        ":notice": notice,
        ":now": new Date().toISOString(),
      },
    }),
  );
}

export const handler = async () => {
  const today = todayInBogota();
  const limitDate = addDays(today, REMINDER_DAYS_BEFORE);
  const candidates = await findMembersToCheck(limitDate);

  const summary = {
    today,
    checked: candidates.length,
    sent: [],
    skipped: [],
    failed: [],
  };

  for (const member of candidates) {
    const { status, daysLeft } = membershipStatus(member.expiresAt, today);
    const notice = `${status}#${member.expiresAt}`;

    if (member.lastNotice === notice) {
      summary.skipped.push({ email: member.email, reason: "aviso ya enviado" });
      continue;
    }

    try {
      await sendReminder(member, status, daysLeft);
      await markAsNotified(member, notice);
      summary.sent.push({
        email: member.email,
        status,
        expiresAt: member.expiresAt,
      });
    } catch (error) {
      console.error(
        JSON.stringify({ email: member.email, error: error.message }),
      );
      summary.failed.push({ email: member.email, error: error.message });
    }
  }

  console.log(JSON.stringify(summary));
  return summary;
};
