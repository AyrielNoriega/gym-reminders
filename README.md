# Gym Reminders

100% serverless membership reminders for neighborhood gyms in Colombia. The front desk records a payment, the system calculates the expiration date, and every day at 7:00 AM (Bogotá time) members whose plan is about to expire, or has expired, get an email. Nobody gets the same reminder twice.

Built for the AWS Builder Center *Weekend Challenge: No Pipeline, No Problem*. The app and emails are in Spanish because the target users are Colombian gyms.

```
Front-desk panel (gym-web)
        │
        ▼
API Gateway (HTTP API)
   ├── POST /members ──► Lambda RegisterPayment ──┐
   └── GET  /members ──► Lambda ListMembers ──────┤
                                                  ▼
                                           DynamoDB (members)
                                                  ▲
EventBridge Scheduler (daily 7:00 AM Bogotá)      │
        └──► Lambda SendReminders ────────────────┘
                     └──► SES ──► email to the member
```

## Repository layout

| Path | What it is |
|---|---|
| [`template.yaml`](template.yaml) | AWS SAM template: DynamoDB table, HTTP API, 3 Lambdas, daily schedule, IAM permissions |
| [`src/`](src) | Lambda code (Node.js 22, ESM, no dependencies) |
| [`gym-web/`](gym-web) | Front-desk panel (React + TypeScript + MUI) |
| [`scripts/seed.sh`](scripts/seed.sh) | Loads sample members for testing and demos |

## Backend: the Lambdas (`src/`)

All three functions share [`src/shared.mjs`](src/shared.mjs) and use the AWS SDK v3 that ships with the Lambda runtime, so there is no `package.json` and no build step.

### `register.mjs` — `POST /members`

Registers a new member or renews an existing one (the email is the key).

```json
{ "name": "Carlos", "email": "carlos@example.com", "plan": "mensual", "paidAt": "2026-10-18" }
```

- `plan`: `mensual` (1 month), `trimestral` (3), `semestral` (6) or `anual` (12).
- `paidAt` is optional (defaults to today in Bogotá) and cannot be in the future.
- The expiration date respects month ends: January 31 + 1 month = February 28/29.
- An early renewal adds the new period to the current expiration date, so the member doesn't lose paid days. Renewing also resets reminders.
- Responds `201` (new member) or `200` (renewal) with the member, its `status` and `daysLeft`. Invalid input responds `400` with `{ "errors": [...] }`.

### `list.mjs` — `GET /members`

Returns every member sorted by expiration date, plus totals per status:

```json
{ "today": "2026-11-16", "total": 5, "counts": { "activo": 3, "por_vencer": 1, "vencido": 1 }, "members": [ ... ] }
```

`status` and `daysLeft` are never stored. They are calculated on every request from today's date in Bogotá time, so they are never stale.

### `reminders.mjs` — daily schedule (or manual invoke)

1. Scans the members whose `expiresAt` is within `REMINDER_DAYS_BEFORE` days (default 3), including those already expired.
2. Skips members whose `lastNotice` already equals `status#expiresAt`, so each reminder is sent only once.
3. Sends an "expires in N days" or "expired on …" email through SES, then saves `lastNotice`.
4. If SES fails for one member, that member is not marked as notified and is retried on the next run. The others still go out.
5. Returns a summary: `{ today, checked, sent, skipped, failed }`.

### `shared.mjs`

Plans, date math in Bogotá time (`todayInBogota`, `addMonths`, `addDays`), and the status rule: `vencido` if `daysLeft < 0`, `por_vencer` if `daysLeft <= REMINDER_DAYS_BEFORE`, otherwise `activo`.

### Permissions (least privilege)

| Function | DynamoDB | SES |
|---|---|---|
| RegisterPayment | read/write | — |
| ListMembers | read only | — |
| SendReminders | read/write | `ses:SendEmail` |

Only `SendReminders` can send email, so the public API cannot be used to send messages.

## Frontend: the front-desk panel (`gym-web/`)

A single page: totals per status, an **Add member** button (dialog form) and the member list, including a column that shows whether the reminder email was sent. See [`gym-web/README.md`](gym-web/README.md).

## Deploy (no pipeline)

From AWS CloudShell (`us-east-1`), with nothing to install:

```bash
# 1. Verify the sender email in SES (sandbox: recipients must be verified too)
aws ses verify-email-identity --email-address you@example.com

# 2. Deploy
git clone https://github.com/AyrielNoriega/gym-reminders.git
cd gym-reminders
sam deploy --guided     # asks for SenderEmail, GymName and ReminderDaysBefore

# 3. Optional: sample data (3 active members + 1 expired)
bash scripts/seed.sh --reset
```

The deploy prints `ApiUrl` and `RemindersFunctionName`. To send reminders right away instead of waiting for 7:00 AM:

```bash
aws lambda invoke --function-name <RemindersFunctionName> out.json && cat out.json
```

To remove everything: `sam delete --stack-name gym-reminders`.

## Next steps

WhatsApp as a channel, SES production access, multiple gyms (`gymId` + Cognito login), a GSI on `expiresAt` instead of `Scan`, SQS between detection and sending, and hosting the panel on S3 + CloudFront.
