# REST API v1

Base URL: `https://your-domain.example/api/v1` (local Vite: `http://localhost:5173/api/v1`). JSON is used for requests and responses except downloads, ZIP export, and multipart uploads. Owner login uses a cookie; API keys use `Authorization: Bearer ps_...`. Keys are project-specific, with `readonly` or `readwrite` permissions. Owner-only operations are not available to keys. Errors are JSON, e.g. `{"error":"Project access denied"}`. Typical statuses: 400 invalid input, 401 unauthenticated, 403 forbidden, 404 missing, 409 collision, 413 too large, 415 not text, 429 rate/daily limit.

## Authentication and projects

```bash
# Owner login. Protect the cookie jar as a credential.
curl -c cookies.txt -H 'Content-Type: application/json' -d '{"username":"owner","password":"YOUR_PASSWORD"}' "$BASE/auth/login"
curl -b cookies.txt "$BASE/projects?limit=20&offset=0"
curl -b cookies.txt -H 'Content-Type: application/json' -d '{"name":"Demo"}' "$BASE/projects"
```

- `POST /auth/login` `{username,password}`; `GET /auth/me`; owner `POST /auth/logout`.
- `GET /projects` lists authorized projects. `POST /projects` owner creates one. Returns e.g. `{"id":"...","name":"Demo","status":"active","created_at":"...","updated_at":"..."}`.
- Owner `PATCH /projects/:id` with `{name}` and/or `{status:"active"|"completed"}`.
- Owner `DELETE /projects/:id` with `{confirm:"exact project name"}` permanently deletes its files and revokes its keys. Completion does not delete anything.
- Owner `GET /projects/:id/export` downloads a ZIP excluding common secret paths. Verify its contents before sharing.

## Files and retrieval

All paths are relative to the project root, use `/`, and cannot include `.` or `..` components. Each list response is `{items,total,offset,limit,nextOffset}`; default limit 50, max 100. Continue using `nextOffset` until null. Tree/search results include path, type, size and modified time. Search results are useful as a first pass to identify relevant files, then read selected files in sections.

```bash
# Use a project-scoped API key; provide BASE, PROJECT and KEY yourself.
curl -H "Authorization: Bearer $KEY" "$BASE/projects/$PROJECT/tree?limit=50&offset=0"
curl -G -H "Authorization: Bearer $KEY" --data-urlencode 'q=router' --data-urlencode 'mode=name' "$BASE/projects/$PROJECT/search"
curl -G -H "Authorization: Bearer $KEY" --data-urlencode 'q=authenticate' --data-urlencode 'mode=content' "$BASE/projects/$PROJECT/search"
curl -G -H "Authorization: Bearer $KEY" --data-urlencode 'path=src/app.js' --data-urlencode 'offset=0' --data-urlencode 'limit=16384' "$BASE/projects/$PROJECT/content"
```

- `GET /projects/:id/tree?path=src&limit=50&offset=0` recursively lists entries under an optional folder. Without `path`, lists the whole project.
- `GET /projects/:id/search?q=...&mode=name|content` searches filenames/paths or text. Content search is case-insensitive, skips binary files and files larger than 1 MiB, and returns a short excerpt. Use pagination. Search scans files and is intended for small personal workspaces.
- `GET /projects/:id/content?path=...&offset=0&limit=16384` returns `{"path":"...","content":"...","offset":0,"bytesRead":123,"size":123,"nextOffset":null}`. Limit is 4–65536 bytes. Content is UTF-8 text; offsets are byte offsets and sections end at UTF-8 character boundaries. Always use `nextOffset` for subsequent requests. Binary/non-UTF-8 files return 415.
- `GET /projects/:id/download?path=...` downloads a file as an attachment.
- `POST /projects/:id/folders` `{path:"src/components"}` creates a folder whose parent exists.
- `PUT /projects/:id/content` `{path:"src/app.js",content:"...",overwrite:true}` creates or updates a UTF-8 text file (max 1 MiB or configured limit, whichever is smaller). Existing files are never overwritten unless `overwrite` is explicitly `true`.
- `POST /projects/:id/upload` accepts multipart `file` and optional `path`. It streams to private temporary storage and never overwrites existing files. Parent must exist. Example: `curl -b cookies.txt -F 'path=src/example.txt' -F 'file=@example.txt' "$BASE/projects/$PROJECT/upload"`.
- `POST /projects/:id/move` `{from:"src/old.js",to:"src/new.js"}` moves or renames; destination must not exist.
- `DELETE /projects/:id/files` `{path:"src/old.js",confirm:"src/old.js"}` permanently deletes a file or directory. Exact path confirmation required.

Writes, upload, move, folder creation and deletion require owner or read/write key. Executable binary/script extensions listed in `server/app.js` are rejected; no uploaded file is executed. AI keys cannot access common environment/credential paths including `.env*`, `.git`, `.ssh`, `.aws`, `.npmrc`, `.netrc`, `credentials*`, private key files, or directories containing them for moves/deletes. This is a best-effort default, not a complete secret scanner.

## Keys, logs and settings (owner only)

- `GET /keys` lists metadata without secrets. `POST /keys` `{name,projectId,permission:"readonly"|"readwrite"}` returns the secret **once**, e.g. `{"id":"...","token":"ps_...","name":"...","projectId":"...","permission":"readonly"}`. `DELETE /keys/:id` revokes immediately.
- `GET /logs?limit=50&offset=0` lists recent successful and failed authenticated key requests (up to the most recent 1000); paths omit query parameters and content. Unauthenticated/invalid key requests have no key identity and are not recorded.
- `GET /settings` returns `{dailyLimit,createdToday,maxFileBytes}`. Daily quota is based on UTC creation date, and deleting a project does not restore quota.

MCP is optional future work; this application currently exposes REST only. The AI client must support calling an HTTP API or a custom tool, and should store tokens securely. Do not paste tokens into public chats or repositories.
