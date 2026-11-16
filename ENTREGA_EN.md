# Gym Reminders: 100% serverless membership reminders for neighborhood gyms

> Built for small neighborhood gyms in Colombia, so the app, emails and demo video are in Spanish. This write-up explains everything in English.

## The problem

In Colombia, most neighborhood gyms track monthly memberships in a notebook or an Excel sheet. Nobody tells a member that their plan is about to expire. They forget to pay, stop coming, and the gym loses that income. To win them back, someone at the front desk has to go through the list by hand and message each person.

These gyms have no tech team and no budget for a server running 24/7. They need something that runs on its own and costs nothing when idle.

## What it does

- **Records payments** (`POST /members`): saves the member and calculates the expiration date from the plan (monthly, quarterly, semiannual or annual). It handles month ends: a payment on January 31 expires on February 28. Members who renew early don't lose their remaining days, because the new period starts from the current expiration date.
- **Lists members** (`GET /members`): shows each member with a status (**active**, **expiring soon** or **expired**), sorted by expiration date, with totals per status. The status is never stored. It is calculated on every request from today's date in Bogotá time, so it is never stale.
- **Sends automatic reminders**: every day at 7:00 AM (Bogotá time) it emails every member whose plan expires in 3 days or less, or has already expired.
- **Front-desk panel** (React + MUI, `gym-web/` folder): a single screen with totals per status, an "Add member" button, and the member list, including a column that shows whether the reminder email was already sent. For the demo it runs locally, connected to the deployed API.
- **Never repeats a reminder**: each member gets one email per status. If the daily job runs twice, or is triggered by hand, nobody gets the same email twice. When the member renews, reminders start over.

## Architecture

```
Front-desk panel (React + MUI)
        │
        ▼
Amazon API Gateway (HTTP API)
   ├── POST /members ──► AWS Lambda: RegisterPayment ──┐
   └── GET  /members ──► AWS Lambda: ListMembers ──────┤
                                                       ▼
                                              Amazon DynamoDB
                                              (members table)
                                                       ▲
Amazon EventBridge Scheduler                           │
(every day 7:00 AM, America/Bogota)                    │
        │                                              │
        ▼                                              │
AWS Lambda: SendReminders ─────────────────────────────┘
        │
        ▼
Amazon SES ──► email to the member
```

## Serverless services and how they connect

| Service                                         | Role                                                                                                                                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Amazon API Gateway (HTTP API)**               | Exposes `POST /members` and `GET /members`. Each route invokes its own Lambda.                                                                                            |
| **AWS Lambda** (3 functions, Node.js 22, arm64) | `RegisterPayment` validates and stores the payment. `ListMembers` reads members and calculates their status. `SendReminders` finds upcoming expirations and sends emails. |
| **Amazon DynamoDB** (on-demand)                 | Stores members keyed by `memberId` (the email). It also stores `lastNotice`, the last reminder sent, so emails are never repeated.                                        |
| **Amazon EventBridge Scheduler**                | Runs `SendReminders` every day at 7:00 AM in the `America/Bogota` time zone, with no UTC conversion.                                                                      |
| **Amazon SES**                                  | Sends the reminder emails in plain text and HTML.                                                                                                                         |
| **AWS SAM**                                     | Defines all the infrastructure in a single `template.yaml` and deploys it with one command.                                                                               |

## Design decisions

- **Scales to zero**: no server is ever running. Lambda and on-demand DynamoDB charge per use. A neighborhood gym with a few hundred members fits in the Lambda free tier, and SES costs cents per thousand emails.
- **One Lambda per responsibility, least privilege**: `ListMembers` can only read the table, and **only `SendReminders` can send emails**. Even though the API is public, nobody can use it to send email.
- **Idempotency**: the `lastNotice = status#expiresAt` field makes each reminder go out exactly once. If SES fails for one member, that member is not marked as notified and is retried on the next run, without stopping the others.
- **Local dates**: all dates are calculated in Bogotá time, so "expires tomorrow" means tomorrow for the member, not for a server in UTC.
- **Zero dependencies**: the backend uses the AWS SDK v3 already included in the Lambda runtime. No `package.json`, no `node_modules`, no build step.

## How to deploy it (no pipeline)

Everything runs from AWS CloudShell, with nothing to install:

```bash
git clone https://github.com/AyrielNoriega/gym-reminders.git
cd gym-reminders
sam deploy --guided            # asks for the sender email, gym name and reminder days
bash scripts/seed.sh --reset   # optional: loads sample members
```

The sender email must be verified in SES (`aws ses verify-email-identity`). To remove everything: `sam delete --stack-name gym-reminders`.

## A reusable pattern

"Store an expiration date, calculate its status on read, and send one daily reminder without repeats" fits any subscription business: dance academies, language schools, coworking spaces, monthly parking, equipment rentals. To adapt it, change the plans in `src/shared.mjs` and the email text.

## Next steps

- **WhatsApp** as the main channel, since people in Colombia check it far more than email.
- **Move SES out of the sandbox** to email any member without verifying their address.
- **Multiple gyms** in the same table with a `gymId`, plus front-desk login (Amazon Cognito).
- **A GSI on `expiresAt`** instead of a `Scan`, for gyms with thousands of members.
- **Amazon SQS between detection and sending**, for retries and to avoid depending on a single Lambda's time limit.
- **Host the front-desk panel** on Amazon S3 + CloudFront in the same SAM template.

## Links

- Code: https://github.com/AyrielNoriega/gym-reminders
- Video (in Spanish): https://youtu.be/Z-uyOXpaxr0
