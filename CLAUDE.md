# Chat — CLAUDE.md

This file provides AI assistants with the context needed to work effectively in this codebase.

## Repository Overview

A real-time chat application with a Node.js/Express backend and an Angular 8 frontend. Users authenticate via JWT, join named rooms, and exchange messages in real time over Socket.io. Message history is persisted in MongoDB.

## Monorepo Layout

```
├── README.md
├── .gitignore
├── chat-server/            # Node.js + Express + Socket.io backend
│   ├── server.js           # Entry point: sets config, creates and starts ChatServer
│   ├── package.json
│   ├── .eslintrc.json      # ESLint — Google style guide
│   ├── bin/
│   │   ├── server.js       # ChatServer class: Express app + HTTP server wiring
│   │   ├── rooms.js        # Rooms class: room CRUD + Socket.io event handling
│   │   ├── users.js        # Users class: signup/signin, JWT issuance, password hashing
│   │   └── errors.js       # Custom error classes (BadRequest, RoomExistsError, etc.)
│   └── test/
│       └── tests.js        # Mocha + supertest + should.js integration tests
└── chat-client/            # Angular 8 SPA
    ├── angular.json
    ├── package.json
    ├── tsconfig.json
    ├── tslint.json
    └── src/
        ├── app/
        │   ├── app.module.ts
        │   ├── app.routing.ts
        │   ├── _helpers/   # AuthGuard, JWT interceptor
        │   ├── _models/    # TypeScript interfaces
        │   ├── _services/  # AuthService, ChatService, RoomService
        │   ├── login/      # Login/signup component
        │   ├── home/       # Room list component
        │   └── chat/       # Chat room component
        └── environments/
            └── environment.ts  # SERVER_URL setting
```

## Development Workflow

### Backend

```bash
# 1. Start MongoDB (required for server and tests)
mongod --port 10004

# 2. Install dependencies
npm --prefix chat-server i

# 3. Start the server (listens on :5000 by default)
npm --prefix chat-server start

# 4. Run tests (MongoDB must be running)
npm --prefix chat-server test

# 5. Lint
npm --prefix chat-server run lint
npm --prefix chat-server run lint:fix
```

### Frontend

```bash
# Install dependencies
npm --prefix chat-client i

# Start dev server (opens browser at http://localhost:4200)
npm run start --prefix chat-client

# Build production bundle
npm --prefix chat-client run build

# Lint
npm --prefix chat-client run lint
```

## Server Configuration

All config is set as constants in `chat-server/server.js` (the entry point). Change them there.

| Variable | Default | Notes |
|---|---|---|
| `SERVER_PORT` | `5000` | HTTP + Socket.io listen port |
| `MONGO_PORT` | `10004` | Local MongoDB port |
| `FORBIDDEN_WORDS` | `['voldemort']` | Blocked in usernames, room names, and messages (case-insensitive) |
| `DEFAULT_ROOMS` | `['lobby', 'COVID-19 room', 'shekem']` | Created on server start if they don't exist |
| `JWT_SECRET` | `'chat-token-secret'` | **Must be changed in production** |

## Client Configuration

Edit `chat-client/src/environments/environment.ts`:

| Variable | Default |
|---|---|
| `SERVER_URL` | `'http://localhost:5000'` |

## REST API

Base URL: `http://localhost:5000`

Authenticated routes require the JWT in the `token` request header (not `Authorization`).

| Method | Path | Auth | Body / Params | Description |
|---|---|---|---|---|
| `GET` | `/status` | No | — | Health check, returns 200 |
| `POST` | `/signup` | No | `{ username, email, password }` | Register; returns `{ token }` |
| `POST` | `/signin` | No | `{ email, password }` | Login; returns `{ token }` |
| `POST` | `/room` | Yes | `{ room_name }` | Create a new room |
| `GET` | `/rooms` | Yes | — | List all rooms sorted by active user count |
| `GET` | `/room/:room_name` | Yes | — | Get room details and current user list |
| `GET` | `/room/:room_name/messages` | Yes | — | Get message history sorted by timestamp |

## Socket.io

Connect with query params: `?token=<JWT>&room_name=<room_name>`

| Event | Direction | Payload | Description |
|---|---|---|---|
| `user-message` | Client → Server | `string` | Send a chat message |
| `chat-message` | Server → Client | `{ ts, text, username? }` | Receive a message (system or user) |
| `users-in-room` | Server → Client | `{ name, users[] }` | Updated user list whenever someone joins/leaves |

Socket connections that present an invalid token or a non-existent room are disconnected immediately.

## Architecture Notes

### Class structure

- **`ChatServer`** (`bin/server.js`) — owns the Express app and HTTP server; instantiates `Users` and `Rooms`, wires routes, and calls `setDB` on both after MongoDB connects.
- **`Users`** (`bin/users.js`) — handles signup/signin; hashes passwords with SHA-256 (`crypto.createHash('sha256')`); issues and verifies JWTs.
- **`Rooms`** (`bin/rooms.js`) — manages room CRUD in MongoDB and owns the Socket.io instance; creates default rooms on startup; enforces forbidden words in both room names and messages.
- **`errors.js`** — custom error hierarchy; all domain errors extend a base `BadRequest` class so controllers can catch them uniformly.

### Authentication flow

1. Client calls `POST /signup` or `POST /signin` → receives a JWT.
2. JWT is stored client-side and sent as the `token` header on all subsequent HTTP requests.
3. Express middleware (`validateRequest`) verifies the token and attaches `req.username`.
4. For Socket.io, the token is passed as `socket.handshake.query.token` and verified inside the connection handler.

### Password security note

Passwords are hashed with SHA-256 (not bcrypt). This is a known limitation of the codebase — do not introduce bcrypt without updating all related tests and the signup/signin flow.

## Code Conventions

- **ESLint** (Google style): run `npm run lint` before committing server-side changes.
- **Bunyan** structured JSON logging is used throughout the server — use `this.logger.info/warn/error` instead of `console.log`.
- **Forbidden words** are checked case-insensitively at the point of entry (signup, room creation, message send).
- **Class-based OOP** — new server-side features should follow the existing class pattern in `bin/`.
- **Angular 8** — the client targets Angular 8; avoid syntax or APIs introduced in later versions.
- **Less** is the stylesheet preprocessor for the Angular client (`src/styles.less`).

## Testing

Server tests use **Mocha** + **supertest** + **should.js**. They require a live MongoDB on port 10004.

```bash
# Start mongo first
mongod --port 10004

# Then run tests
npm --prefix chat-server test
```

There are no automated tests for the Angular client.
