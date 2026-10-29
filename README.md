# Workspace — Personal AI Project Server

A lightweight, self-hosted project workspace for an individual owner. A React/Vite dashboard talks to a Node/Express API; SQLite stores metadata and private server directories hold the files. Project-scoped API keys let compatible coding tools browse, search, and read or update files without repeated uploads. This does **not** execute code, provide a terminal, connect to Google Drive, or upload to GitHub automatically.

## Architecture and phases

- `client/` — responsive React dashboard and Vite entry point.
- `server/app.js` — Express API, SQLite initialization, filesystem access and authorization.
- `server/index.js` — server entry point; serves the built UI as well as the API.
- `server/test/` — integration tests; `docs/API.md` — endpoint reference.
- `server/data/` (ignored by Git) — default private SQLite DB, projects and upload staging.

The implementation covers owner login, workspaces/files, scoped AI access, manual GitHub export, and tests. The backend is necessary because frontend-only code cannot safely hold server credentials or enforce filesystem access and scoped keys. Drive can store files, but is not a drop-in secure project filesystem/API for every AI tool. Running untrusted projects or terminal commands requires additional isolation and is deliberately out of scope.

## Local setup

Requires **Node.js 22.13+** (the built-in `node:sqlite` module is experimental on Node 22) and npm. No paid services are needed.

```bash
npm ci
cp .env.example .env
# Enter a strong password without putting it in shell history or process arguments:
read -rs -p 'Owner password (12+ characters): ' PASSWORD; echo
printf '%s' "$PASSWORD" | node server/hash-password.js
unset PASSWORD
# Copy the resulting hash into OWNER_PASSWORD_HASH in .env (quote it).
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`), and log in with `OWNER_USERNAME` (default `owner`) and the password used to generate the hash. The backend is proxied at `/api`; no browser-to-localhost API call is required. For a production-style local run, use `npm run build && npm start` and visit port 3001. Run tests with `npm test`.

**Never commit `.env`, the SQLite database, or project files.** The examples are ignored, but if you set `DATA_DIR` elsewhere, make sure that directory is excluded from backups or repositories as appropriate. Password hash changes do not revoke existing sessions; restart alone does not log users out. Delete the `sessions` rows in SQLite to revoke all sessions if needed.

## How to use

1. Create a workspace (default: at most **3 new projects per UTC day**, even if earlier ones are deleted). Open it and use the file/folder upload icons or create files and folders. Folder upload depends on browser directory-upload support and uploads files sequentially; empty folders cannot be included. Existing files are not overwritten on upload.
2. Create a project-scoped read-only or read/write API key under **API keys**. Copy the secret immediately. Configure a compatible AI tool to call the API with its Bearer token. AI platforms need their own HTTP/API or custom-tool capability; a chat interface cannot necessarily connect by itself. See [API documentation](docs/API.md).
3. When done, mark the project completed. Export the ZIP from its project page, extract it, review files for secrets, and upload the extracted files to a GitHub repository yourself (or use your local Git client). Verify the remote copy. Only then, optionally delete the project by typing its exact name. No uploads or deletions happen automatically. The export skips common credential paths, but **you must still review all files**, since secrets can appear anywhere.

Completed workspaces remain on disk until explicitly deleted. No terminal, command execution, MCP integration, or GitHub credential storage is provided in this MVP.

## Production deployment

Use a small Linux server you control. Install Node and npm, copy the code (not your private projects) to the server, run `npm ci`, configure `.env`, then run `npm run build` and `npm start` under a dedicated unprivileged user (a systemd service is appropriate). Set `DATA_DIR` to an absolute directory owned by that user and **outside all public web roots**; set directory permissions to `700`. Keep the database and data directory on persistent storage, and back them up securely. The process must have exclusive control of the storage tree: do not let untrusted users modify it or create symlinks concurrently.

Place a TLS reverse proxy such as Caddy or nginx in front of the Node server, expose only HTTPS publicly, and restrict port 3001 to the proxy/firewall. Set `COOKIE_SECURE=true` and `APP_ORIGIN=https://your-domain.example` (exact origin, no trailing slash). A basic Caddy site config:

```caddyfile
your-domain.example {
    reverse_proxy 127.0.0.1:3001
}
```

Caddy can provision HTTPS for a public domain. Use a strong unique owner password; keep `.env` private (`chmod 600 .env`), apply OS updates, and consider network/IP restrictions. Configure `MAX_FILE_BYTES`, `DAILY_PROJECT_LIMIT`, and `PORT` in `.env`. Uploads are streamed to a private temporary file with a size limit; ensure enough disk space for staging plus the final file. File edits through JSON are limited to 1 MiB (or `MAX_FILE_BYTES`, whichever is lower). The dashboard editor intentionally refuses to save files larger than its 64 KiB preview.

Security boundaries: API key secrets are random and stored only as SHA-256 hashes; browser sessions are random, hashed in SQLite, HTTP-only, SameSite Strict, and expire after 24 hours. Mutations with an Origin header are checked against the configured origin. Login attempts are limited per process/IP. Files are never served as a static directory, symlinks are rejected, and common credential paths are blocked for API keys. This is a personal MVP, not a multi-user sandbox; filtering cannot identify every secret, and anyone with owner or read/write key access should be trusted within its scope. API usage logs omit tokens, query strings, passwords and file content; revoked/invalid key requests cannot be attributed to a key. Log retention and filesystem backups are the owner's responsibility.
