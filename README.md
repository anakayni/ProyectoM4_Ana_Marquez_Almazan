# MateCode Tasks

🇪🇸 [Versión en español](README.es.md)

A task and project management app for small teams: invite-only access with roles, projects with their own people, list / table / board views, a month and Gantt calendar, and an **audit log of every change that the database itself enforces**.

It started as my final project for **Module 4 at Soy Henry** and grew into a portfolio project, built with an AI assistant (Claude Code) through a design → plan → test-first workflow.

## Live demo

**https://matecode-tasks-dev.vercel.app**

| Demo account (read-only) | |
|---|---|
| Email | `anakayni+demo@gmail.com` |
| Password | `MateDemo-2026` |

The demo account has the **Viewer** role: it can explore everything but not change anything. It runs on a separate development database with sample data.

## What it does

- **Invite-only access with roles.** An admin invites people by email as Admin, Member, Viewer or **Guest**. Guests (a client, a supplier) only see and work on the projects they were added to; they never see the rest of the team.
- **Tasks:** status (to do / in progress / done), assignee, priority, due date, numbered IDs (`MC-12`), subtasks with progress, search and filters, and three views: list, table and board. Finished tasks are visibly crossed out and greyed.
- **Projects:** color, dates, owner, real progress and "late" warning, archive, and a people list managed by the admin.
- **Calendar:** month view (agenda on mobile) and a Gantt view of projects and due dates.
- **Team and profile:** members with photo or initial, open tasks per person, deactivation without losing their tasks.
- **Settings (admin):** workspace name, logo and color palette with a live preview and a **contrast check that blocks saving** unreadable colors; custom task prefix.
- **Audit log (admin):** every change told as a sentence ("Ana changed the status from To do to Done"), filters by type, person and date, before → after detail, paginated, and **CSV export** protected against spreadsheet formula injection.
- **Email summary** of your tasks through AWS SES.

## Technical highlights

- **The database is the source of truth for security.** Firestore Security Rules enforce roles, project scoping for guests, valid assignees, honest "completed by / at" data and immutable task numbers. They are tested against the Firestore emulator, including attempts to cheat (fake audit entries, moving a task out of a guest's project, forged profile cards).
- **Mandatory audit.** Each write happens in a batch/transaction together with an `auditLog` entry (`before` / `after`); the rules reject any change without its matching entry, and entries can't be edited or deleted.
- **Privacy without a backend.** Guests read "person cards" (name and photo only) that the rules verify are exact copies of the real profile; they never read emails or roles.
- **Accessibility:** all text meets 4.5:1 contrast (checked by a test that recomputes the CSS `color-mix()` formulas), labelled controls, keyboard support, no drag-only interactions.
- **Zero cost:** Firebase Spark, Vercel Hobby, no Cloud Functions or Storage (profile photos and the logo are resized in the browser and stored in Firestore).
- **Tested:** 400+ app tests (Vitest + React Testing Library) and 80+ Firestore rules tests.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, React Router |
| Styles | CSS Modules + design tokens (`tokens.css`) |
| Auth and data | Firebase Authentication, Cloud Firestore + Security Rules |
| Backend | Vercel Functions (`firebase-admin`, AWS SES v2) |
| Testing | Vitest, React Testing Library, Firestore emulator |
| Lint and deploy | oxlint, Vercel |

## Branches

| Branch | What it contains |
|---|---|
| [`v2`](https://github.com/anakayni/ProyectoM4_Ana_Marquez_Almazan/tree/v2) | The portfolio version shown in the live demo (in active development). |
| `main` | The original Module 4 delivery: [documentation](docs/m4/README.md) · [en español](docs/m4/README.es.md) · production at https://matecode-tasks-sandy.vercel.app |

## How I worked with AI

I built this project with **Claude Code** as a pair programmer, with a process I kept for every stage:

1. **Questions before code.** For each stage the assistant asked me one question at a time, each with a recommendation, and showed mockups when the question was visual. I made the product decisions (for example: guests as a role scoped to projects, keeping completed tasks for traceability, accessible contrast as a hard rule).
2. **Written design and plan.** Every stage has a design document (`docs/specs/`) and a plan of small tasks with the exact tests and code (`docs/plans/`) — both in the `v2` branch.
3. **Test first.** For each task we wrote the test, watched it fail for the right reason, implemented, and committed: one commit per task.
4. **I test every stage** in a preview deployment before moving on, and I handled every console and credential (Firebase, AWS, Vercel) myself — secrets never went into the chat.
5. **Root cause before fixes.** When something broke (wrong rules published, IAM permissions, ESM incompatibilities, contrast below 4.5:1 found by measuring) we found the cause before changing code.

The full log of what I asked, what the AI proposed, what I changed and what went wrong is in [`AI_LOG.md`](https://github.com/anakayni/ProyectoM4_Ana_Marquez_Almazan/blob/v2/AI_LOG.md) (in Spanish).

## Run it locally

```bash
git clone https://github.com/anakayni/ProyectoM4_Ana_Marquez_Almazan.git
cd ProyectoM4_Ana_Marquez_Almazan
git checkout v2
npm install
cp .env.example .env   # Firebase web config + service account, AWS SES (see docs)
npm test               # app tests
npm run test:rules     # Firestore rules against the emulator (needs Java 21)
vercel dev             # app + functions at http://localhost:3000
```

---

Made by **Ana Márquez** · [GitHub](https://github.com/anakayni)
