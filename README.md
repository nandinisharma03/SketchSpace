# SketchSpace

Real-time collaborative whiteboard built with Node.js, Express, Socket.io and MongoDB.

## Progress
- [x] Stage 1: real-time drawing, live cursors, rooms, undo
- [x] Stage 2: signup/login (JWT + bcrypt), protected sockets, rate limiting
- [ ] Stage 3: save boards in MongoDB, roles (owner/editor/viewer)
- [ ] Stage 4: React + TypeScript frontend, chat, export
- [ ] Stage 5: Docker, deployment

## Setup
1. `npm install`
2. Copy `.env.example` to `.env` and fill in:
   - `MONGO_URI` (local MongoDB or a free MongoDB Atlas connection string)
   - `JWT_SECRET` (any long random string)
3. `npm start`
4. Open http://localhost:3000, create an account, and share the invite link.

## API
| Method | Route | Description |
|---|---|---|
| POST | /api/auth/register | Create account, returns JWT |
| POST | /api/auth/login | Login, returns JWT |
| GET | /api/auth/me | Current user (needs Bearer token) |

## Security notes
- Passwords are hashed with bcrypt, never stored in plain text
- JWT required for both REST and WebSocket connections
- Auth routes are rate-limited
- Secrets live in `.env`, which is git-ignored
