# ClipSync

A personal cross-device clipboard manager. Paste text, upload a file, or screenshot, and it's saved to the cloud and available on every signed-in device in real time.

**Live:** [clipsynco.netlify.app](https://clipsynco.netlify.app)

<!-- Add a screenshot or GIF here: ![ClipSync demo](./docs/demo.gif) -->

## Features

### Clipboard
- Text, image, PDF/document and link clips
- Optimistic UI: a clip appears instantly, before the server confirms
- `Ctrl+V` with an image on the clipboard uploads it as an image clip
- Images open in a fullscreen lightbox; PDFs and documents render as cards with a first-page thumbnail, file size and page count
- Links are detected automatically and their hostname is indexed for search

### Organising
- **Saved** clips (bookmark) persist forever
- **Temporary** clips (clock) auto-delete after 7 days and show the days remaining
- Saved and Temporary are mutually exclusive
- Filter by All / Images / Docs / Links / Saved
- Real-time search that respects the active filter. Searching `youtube` matches `https://www.youtube.com/watch?v=...`

### Real-time sync
- One user, many devices, all connected over Socket.IO
- New, deleted and toggled clips update on every other device instantly
- Sockets are JWT-authenticated on connect
- The server tracks sockets per user (`Map<userId, Set<socketId>>`) and broadcasts only to that user's other devices

### Auth
- Email + password registration with an OTP sent over Gmail
- Google OAuth 2.0. If the email already exists, the accounts are merged
- Set-password page for Google users who want a password
- JWT with 7-day expiry. The auth middleware checks the DB on every request, so deleted accounts get a `401` immediately

### PWA
- Installable on Android and iOS (`display: standalone`, opens at `/clips`)
- Install button in the navbar when `beforeinstallprompt` fires
- Service worker caches the app shell for offline loading

## Two-tier file storage

| | Temporary | Permanent |
|---|---|---|
| Storage | MongoDB (inline Buffer) | Cloudinary |
| Size limit | 15 MB | 50 MB |
| Auto-delete | 7 days (MongoDB TTL index) | Never |

The clock button moves a file between tiers:
- **Permanent → temporary:** fetched from Cloudinary, stored in MongoDB, Cloudinary copy deleted
- **Temporary → permanent:** uploaded to Cloudinary, MongoDB buffer cleared

Deleting a user triggers a Mongoose post-hook that removes each of their Cloudinary assets and then bulk-deletes their clips, so no orphaned files are left behind.

## Tech stack

**Frontend:** React 18, Vite, Tailwind CSS v4, React Router v6, Socket.IO client, Lucide React, pdfjs-dist (client-side PDF thumbnails), vite-plugin-pwa

**Backend:** Node.js, Express, MongoDB Atlas (Mongoose), Socket.IO, Passport.js (Google OAuth 2.0), jsonwebtoken, bcryptjs, Multer, pdf-parse (page counts), Cloudinary, Nodemailer

## Getting started

### Prerequisites
- Node.js 18+
- A MongoDB Atlas cluster
- A Cloudinary account
- A Google Cloud OAuth 2.0 client
- A Gmail account with an app password (for OTP emails)

### Install

```bash
git clone https://github.com/<your-username>/Clipsync.git
cd Clipsync

# backend
cd Server && npm install

# frontend
cd ../Client && npm install
```

### Environment variables

`Server/.env`

```env
PORT=5000
MONGO_URI=
JWT_SECRET=
CLIENT_URL=http://localhost:5173

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

EMAIL_USER=
EMAIL_PASS=
```

`Client/.env`

```env
VITE_API_URL=http://localhost:5000
```

### Run

```bash
# terminal 1
cd Server && npm run dev

# terminal 2
cd Client && npm run dev
```

Open `http://localhost:5173`.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Enter` | Send text clip |
| `Shift+Enter` | New line |
| `Ctrl+V` (with image) | Upload screenshot as an image clip |
| `Ctrl+M` | Toggle temporary mode |
| `Esc` | Close image lightbox |

## API

| Method | Route | Description |
|---|---|---|
| GET | `/auth/google` | Start Google OAuth |
| GET | `/auth/google/callback` | OAuth callback |
| POST | `/auth/register` | Email + password register (sends OTP) |
| POST | `/auth/login` | Email + password login |
| POST | `/auth/set-password` | Set a password after Google signup |
| GET | `/clips` | Get clips (newest first, limit 50) |
| POST | `/clips` | Create a text clip |
| PATCH | `/clips/:id` | Toggle temporary / saved |
| DELETE | `/clips/:id` | Delete clip and its Cloudinary asset |
| POST | `/clips/upload` | Upload a file |
| GET | `/clips/:id/download` | Download a file (MongoDB or Cloudinary) |
| GET | `/clips/:id/thumbnail` | PDF thumbnail bytes |
| GET | `/health` | Health check |

All `/clips` routes require `Authorization: Bearer <jwt>`.

## Project structure

```
Clipsync/
├── Client/
│   ├── src/
│   │   ├── Components/
│   │   │   ├── ClipBoard.jsx    # Main page, input bar, state
│   │   │   ├── Home.jsx         # Clip grid, filters, search, cards
│   │   │   ├── Navbar.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx     # Register → OTP flow
│   │   │   └── SetPassword.jsx
│   │   ├── Hooks/useSocket.js
│   │   ├── api/clips.js         # API calls + 401 handling
│   │   └── App.jsx              # Routes + ProtectedRoute
│   └── vite.config.js           # Vite + Tailwind + PWA
└── Server/
    ├── Models/
    │   ├── user.js              # User schema + cascade delete hook
    │   └── file.model.js        # Clip schema + TTL index
    ├── Routes/
    │   ├── routes.js            # Auth
    │   ├── clips.route.js       # Clip CRUD
    │   └── cloudinary.routes.js # Upload, download, thumbnail
    ├── Middleware/
    │   ├── auth.js              # JWT verify + DB existence check
    │   └── upload.js            # Multer config
    ├── Config/passport.js       # Google OAuth strategy
    ├── Utils/cloudinary.util.js
    └── server.js                # Express + Socket.IO + MongoDB
```

## Deployment

- **Frontend:** Netlify
- **Backend:** Railway or any host with persistent WebSocket support. Free tiers that sleep will drop Socket.IO and MongoDB connections.
- Set `CLIENT_URL` on the server and `VITE_API_URL` on the client to the deployed URLs. CORS and Socket.IO credentials must allow the Netlify origin.

## Roadmap

- [ ] Link previews (YouTube thumbnail cards)
- [ ] Room Chat: temporary rooms (6 people max, 24-hour expiry, guest join)
- [ ] End-to-end encryption for clips
- [ ] Redis Pub/Sub for horizontal scaling
- [ ] Full offline PWA support

## License

MIT
