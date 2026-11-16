// GET /members
// Lista los afiliados con su estado, ordenados por fecha de vencimiento.

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { json, membershipStatus, todayInBogota } from "./shared.mjs";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async () => {
  const today = todayInBogota();
  const items = [];
  let lastKey;

  do {
    const page = await ddb.send(
      new ScanCommand({ TableName: TABLE_NAME, ExclusiveStartKey: lastKey }),
    );
    items.push(...(page.Items ?? []));
    lastKey = page.LastEvaluatedKey;
  } while (lastKey);

  const members = items
    .map((m) => ({
      name: m.name,
      email: m.email,
      plan: m.plan,
      lastPaymentAt: m.lastPaymentAt,
      expiresAt: m.expiresAt,
      lastNotice: m.lastNotice ?? null,
      ...membershipStatus(m.expiresAt, today),
    }))
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));

  const counts = { activo: 0, por_vencer: 0, vencido: 0 };
  for (const m of members) counts[m.status] += 1;

  return json(200, { today, total: members.length, counts, members });
};
