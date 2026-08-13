# Signal Clone — Secure Messaging Platform

A functional, self-hosted clone of Signal's core messaging experience: registration, contacts, 1:1 and group real-time messaging, delivery/read receipts, and typing indicators.

Built as a full-stack assignment with deliberate architectural decisions, clean separation of concerns, and UI fidelity to Signal's actual design system.

---

## Stack

| Layer | Technology | Role |
|-------|-----------|------|
| Frontend | Next.js (TypeScript) | UI only — no business logic |
| Backend | FastAPI | All logic, persistence, real-time fan-out |
| Database | SQLite | Persistent storage via Railway volume |
| Real-time | WebSockets | Live messages, typing, receipts, presence |
| Deploy | Vercel + Railway | Frontend edge, backend with persistence |

---


## What's Built

- **Registration & auth** — phone/username + display name, fixed mock OTP, JWT session
- **Contacts** — directional address book, search, add
- **1:1 messaging** — real-time send/receive, optimistic UI
- **Group conversations** — create, add/remove members, admin roles
- **Delivery pipeline** — `sending → sent → delivered → read` with per-recipient granularity for groups
- **Typing indicators & presence** — ephemeral, never persisted
- **Signal-faithful UI** — tokens pulled from official source, asymmetric bubbles, proper spacing

**Explicitly mocked/placeholder:** E2E encryption, real phone verification, voice/video calls, stories, linked devices.
