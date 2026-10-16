# MateCode Tasks

🇪🇸 [Versión en español](README.es.md)

A task management SPA for the employees of a small business. Each person signs up (email and password, or Google), manages their own tasks stored in the cloud, and can email themselves a summary of their task status.

Built as the final project of **Module 4 at Soy Henry**, developed together with an AI assistant (Claude Code) following a design → plan → test-first workflow.

**Live app:** https://matecode-tasks-sandy.vercel.app

**Repository:** https://github.com/anakayni/ProyectoM4_Ana_Marquez_Almazan

> **v2 in progress:** the [`v2` branch](https://github.com/anakayni/ProyectoM4_Ana_Marquez_Almazan/tree/v2) extends this project as a portfolio piece: roles (admin, member, viewer, guest) with invite-only access, an audit log of every change enforced by Firestore rules, projects, list/table/board views, a month and Gantt calendar, and configurable branding. This README describes the `main` branch (the M4 delivery).

## Features

- Sign up and sign in with email/password and with Google; sign out.
- Protected routes: `/tasks` requires a session; `/login` and `/register` redirect when you are already signed in.
- Authentication errors translated into clear messages (in Spanish, the app's language).
- Task CRUD (title + description): create, list, edit (modal), delete (with confirmation) and mark as completed.
- Each user only sees and changes their own tasks (`userId` filter + Security Rules).
- Real-time updates after any change (`onSnapshot`), plus loading, error-with-retry and empty states.
- **Email summary** button: a Vercel Function uses AWS SES to send an email with the number of pending and completed tasks.
- **Extras:** filters (all / pending / completed) with a counter, priority (high / medium / low), due date with "Overdue" / "Due today" warnings, and sorting by newest, due date or priority.
- Mobile-first responsive design with hand-written CSS.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Routing | React Router (`react-router`) |
| Styles | CSS Modules + design tokens (`src/styles/tokens.css`) |
| Authentication | Firebase Authentication (email/password + Google) |
| Database | Cloud Firestore |
| Backend | Vercel Functions (`/api/send-summary`) |
| Email | AWS SES v2 (`@aws-sdk/client-sesv2`) |
| Server-side verification | `firebase-admin` |
| Testing | Vitest + React Testing Library + jsdom |
| Lint | oxlint |
| Deploy | Vercel |

## Architecture decisions

1. **Backend-as-a-service for auth and data.** Firebase Auth and Firestore avoid maintaining a custom backend. The Firebase web config is not secret; the real security lives in the **Security Rules** (`firestore.rules`), which only allow reading/writing a task when `userId == request.auth.uid` and validate fields, types and lengths.
2. **A `tasks` collection with a `userId` field.** A root collection filtered with `where('userId', '==', uid)` was chosen (instead of per-user subcollections) because the assignment explicitly asks to filter by `userId`. Sorting by date happens on the client so no composite index is needed.
3. **`component → hook → service` layers.** Components never import Firebase: they use hooks (`useAuth`, `useTasks`) that call `services/`. This lets tests mock the services without touching Firebase.
4. **Real time.** `onSnapshot` keeps the list in sync: after creating/editing/deleting there is no need to fetch again.
5. **The server decides the email content.** The frontend only sends its Firebase ID token. The function verifies it with `firebase-admin`, reads that `uid`'s tasks and sends the email **to the token's email address**. Nobody can use the endpoint to send arbitrary content or to other recipients.
6. **Testable server logic.** `api/send-summary.ts` follows the `handler(request: VercelRequest, response: VercelResponse)` style and delegates to `processSendSummary(deps, { method, authorization })`, which receives its dependencies (verify token, read tasks, send email). Tests pass fake functions instead of real Firebase and AWS.
7. **Errors that help both users and developers.** The UI shows friendly messages; the real error goes to the console (client) or the Vercel logs (server). An invalid token returns 401, but a configuration error returns 500 so it is not mistaken for "session expired".
8. **Own, accessible UI components.** `Button`, `Field`, `Alert`, `Spinner`, `Toast` and `Modal` (native `<dialog>`). Associated labels, `aria-invalid`, `role="alert"`, visible focus.

## Structure

```
├─ api/send-summary.ts          # Vercel Function (VercelRequest/VercelResponse)
├─ functions/
│  ├─ sendSummary.ts            # processSendSummary: method → token → tasks → SES
│  ├─ summaryEmail.ts           # buildSummary, renderSummaryEmail, escapeHtml (pure)
│  ├─ firebaseAdmin.ts          # verifyIdToken, getTasksForUser
│  ├─ ses.ts                    # sendEmail with SES v2
│  └─ env.ts                    # requireEnv
├─ src/
│  ├─ pages/                    # LoginPage, RegisterPage, TasksPage
│  ├─ components/
│  │  ├─ ui/                    # Button, Field, Alert, Spinner, Toast, Modal
│  │  ├─ auth/                  # AuthLayout, GoogleButton
│  │  └─ tasks/                 # TodoForm, TodoList, TodoItem, SendSummaryButton
│  ├─ features/auth/            # mapAuthError
│  ├─ services/                 # firebase.ts, auth.service.ts, tasks.service.ts
│  ├─ api/                      # summary.api.ts → POST /api/send-summary
│  ├─ routes/                   # AppRouter, ProtectedRoute, PublicOnlyRoute
│  ├─ hooks/                    # useAuth, useAuthAction, useTasks
│  ├─ types/                    # auth.ts, task.ts, api.ts
│  ├─ utils/                    # validators.ts
│  └─ styles/                   # tokens.css, global.css
├─ tests/
│  ├─ unit/                     # validators, mapAuthError, hooks, API client
│  ├─ components/               # TodoForm, TodoList, LoginPage, routes, UI, Toast
│  └─ server/                   # email template and send-summary logic
├─ docs/                        # design document and implementation plan
├─ firestore.rules
├─ vercel.json
├─ .env.example
└─ AI_LOG.md                    # detailed log of AI use per phase (in Spanish)
```

## Setup

Requirements: Node.js 22+ and the Vercel CLI (`npm i -g vercel`) to run the email function locally.

```bash
git clone https://github.com/anakayni/ProyectoM4_Ana_Marquez_Almazan.git
cd ProyectoM4_Ana_Marquez_Almazan
npm install
cp .env.example .env      # fill in the values (see the table below)
```

| Script | What it does |
|---|---|
| `npm run dev` | Frontend only (Vite) at http://localhost:5173 |
| `vercel dev` | Frontend + Vercel Functions (`/api`) at http://localhost:3000 |
| `npm test` | Runs all tests with Vitest |
| `npm run test:watch` | Tests in watch mode |
| `npm run build` | Type check (client and server) + production build |
| `npm run lint` | oxlint |

**Firebase setup:** create a project, enable Authentication (Email/Password and Google), create Firestore in production mode, publish `firestore.rules` and add the Vercel domain under *Authentication → Settings → Authorized domains*.

**AWS SES setup:** verify the sender email in SES (region `us-east-1`) and create an IAM user with a policy that only allows `ses:SendEmail`.

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | Client | Firebase web config |
| `VITE_FIREBASE_AUTH_DOMAIN` | Client | |
| `VITE_FIREBASE_PROJECT_ID` | Client | |
| `VITE_FIREBASE_STORAGE_BUCKET` | Client | |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Client | |
| `VITE_FIREBASE_APP_ID` | Client | |
| `FIREBASE_ADMIN_PROJECT_ID` | Server | Firebase service account |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Server | |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Server | In double quotes, with line breaks as `\n` |
| `SES_AWS_REGION` | Server | e.g. `us-east-1` |
| `SES_AWS_ACCESS_KEY_ID` | Server | IAM user with `ses:SendEmail` permission |
| `SES_AWS_SECRET_ACCESS_KEY` | Server | |
| `SES_FROM_EMAIL` | Server | Sender verified in SES |
| `APP_URL` | Server | Public URL (the email's "Open my tasks" button) |

- Only variables prefixed with `VITE_` reach the browser. **No secret uses that prefix.**
- The `SES_` prefix is used because Vercel reserves names such as `AWS_REGION` and `AWS_ACCESS_KEY_ID`.
- `.env` is in `.gitignore`; `.env.example` is versioned with the same keys and no values.
- On Vercel, variables are set under *Settings → Environment Variables* (secrets as *sensitive*).

## Email flow

```
[TasksPage] "Send summary by email" button
   │
   ▼
src/api/summary.api.ts
   token = await auth.currentUser.getIdToken()
   POST /api/send-summary   Authorization: Bearer <token>   (no body)
   │
   ▼
api/send-summary.ts  →  functions/sendSummary.ts (processSendSummary)
   1. Method other than POST             → 405 (Allow: POST header)
   2. No token                           → 401
   3. verifyIdToken (firebase-admin)     → uid + email   (invalid token → 401)
   4. Firestore: tasks where userId == uid               (error → 500)
   5. renderSummaryEmail → subject + HTML + plain text   (titles escaped)
   6. SES v2 SendEmailCommand → to the token's email     (error → 502)
   7. 200 { ok: true, messageId, to }
   │
   ▼
[UI] "Summary sent to …" toast, or an error message with "Retry"
```

**SES sandbox:** while the AWS account is in the sandbox, SES only sends to verified addresses. For real production use, request leaving the sandbox in the AWS console.

## Security

- Security Rules: each user can only read, create, edit and delete their own tasks; rules check that `userId` does not change and that fields have the right type and length.
- Least-privilege IAM user (only `ses:SendEmail`).
- Secrets only in `.env` (ignored by git) and in Vercel's variables; never in the code or the bundle.
- The email HTML escapes user-written text (prevents HTML injection).
- The function ignores any client data except the token: the recipient comes from the verified token.

## Testing

82 tests with Vitest + React Testing Library (`npm test`):

- **Unit:** form validators, `mapAuthError`, `useAuth`, `useTasks`, `filterTasks`, `sortTasks`, due dates (`formatDate`) and the API client (mocked `fetch`).
- **Components:** `TodoForm` (validation, submit, priority and date, editing, error), `TodoList` (render, priority and due date, complete, edit, delete with confirmation, empty state), `TaskFilters`, `LoginPage` (validation, translated error, Google), `ProtectedRoute`/`PublicOnlyRoute`, `Toast` and UI components.
- **Server:** email template (counts, HTML escaping, plain text) and `processSendSummary` (405, 401, 400, 500, 502 and 200) with fake dependencies.
- **Mocks:** `vi.mock` of `services/*` and `hooks/useAuth`; no test calls the real Firebase or AWS.

## Problems found and how they were solved

| Problem | Cause | Solution |
|---|---|---|
| "We couldn't save the task" | Firestore rules from another project had been published | Log the real error to the console, isolate it with a minimal test and publish `firestore.rules` |
| The app did not load with `vercel dev` | The SPA rewrite sent `/src/main.tsx` to `index.html` | Rewrite only extension-less routes and exclude `/api`, `/@*`, `/src`, `/node_modules` |
| `not authorized to perform ses:SendEmail` | The IAM policy was not attached to the user | Attach the policy with `ses:SendEmail` |
| The function failed on Vercel (`ERR_REQUIRE_ESM`) | `firebase-admin` 14 depends on `jose` 6 (ESM only) | Use `firebase-admin` 13 |

## How I worked with AI

I used **Claude Code** as an assistant throughout the project. The phase-by-phase detail (what I asked, what it proposed, what I reviewed or changed, what I learned and what went wrong) is in [`AI_LOG.md`](../../AI_LOG.md), in Spanish.

**How I integrated it:**
- **Before coding:** I asked it to analyze the assignment and ask me questions. That is how we defined the scope (Google sign-in, hand-written CSS, extras at the end) and a design document with alternatives and their trade-offs (`docs/specs/`).
- **Phased plan:** once the design was approved, we built a plan of small tasks, each with its own tests and commit (`docs/plans/`).
- **Test-driven implementation:** for every task the test was written first, we checked that it failed, and only then was the code implemented.
- **Debugging:** for every error we first looked for the real cause (console, Vercel logs, minimal tests against the API) before changing code.

**Where it was most effective:**
- Generating tests from a defined behavior and spotting edge cases (invalid token vs. configuration error, HTML escaping).
- Diagnosing configuration errors: wrong Firestore rules, IAM permissions, ESM/CommonJS incompatibilities on Vercel.
- Explaining concepts as they came up: Context, `onSnapshot`, Security Rules, dependency injection, `.gitignore`.

**Where I had to step in:**
- I did all the Firebase, AWS and Vercel configuration (consoles and credentials) myself; I never shared secrets in the chat.
- Manual testing in the browser and on my phone.
- Decisions such as adapting the function to the class style we use (`VercelRequest`/`VercelResponse`).

**Patterns and good practices I discovered:**
- Ask for questions and a design first, and only then code.
- One small task at a time, with a test and a commit: the history documents the process.
- Don't swallow errors: a friendly message for the user and the real error in the console or logs.
- Isolate the cause with a minimal test before touching code.
- Review and understand every change before accepting it, and always verify with tests, the build and a manual check.
- Never paste secrets into the prompt; load them directly into `.env` or Vercel.

## Future improvements

- Reorder tasks with drag & drop (dnd-kit), saving the manual order in Firestore.
- Show priority, due date and the number of overdue tasks in the summary email.
- Improve the visual design.
- Per-user email sending limit (rate limit).
- Leave the SES sandbox.
- Password recovery and email verification.
