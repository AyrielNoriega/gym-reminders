# gym-web — front-desk panel

Single-page panel for the gym's front desk: totals per status, an **Add member** dialog to record payments, and the member list with the reminder status. It talks to the Gym Reminders API (`GET /members`, `POST /members`). The UI is in Spanish.

**Stack:** Vite · React 19 · TypeScript · MUI 9 · TanStack Query

## Run it

```bash
yarn install
yarn dev        # http://localhost:5173
```

The API URL defaults to the deployed stack. To point it elsewhere, create a `.env` file:

```
VITE_API_URL=https://<api-id>.execute-api.us-east-1.amazonaws.com
```

Other scripts: `yarn build` (type check + production build) and `yarn lint`.

## Structure (feature-first)

```
src/
├── main.tsx
├── app/
│   ├── App.tsx              # providers: TanStack Query, MUI theme
│   └── theme.ts
├── shared/
│   └── config.ts            # API_URL
└── features/members/
    ├── index.ts             # public API of the feature (MembersPage)
    ├── types.ts             # Member, MembersResponse, RegisterMemberInput…
    ├── constants.ts         # plans and status labels/colors
    ├── api/membersApi.ts    # fetch wrapper + GET/POST /members
    ├── hooks/useMembers.ts  # useMembers (query) + useRegisterMember (mutation)
    ├── utils/format.ts      # dates and "in N days"
    └── components/
        ├── MembersPage.tsx      # the page
        ├── MemberStats.tsx      # totals per status
        ├── MembersTable.tsx     # member list
        ├── AddMemberDialog.tsx  # register payment form
        └── StatusChip.tsx
```

- Server data lives in TanStack Query. Registering a member invalidates the `members` query, so the list refreshes on its own.
- API validation errors (`{ errors: [...] }`) are shown inside the dialog.
- Everything about members lives inside `features/members`. The rest of the app only imports from its `index.ts`.
