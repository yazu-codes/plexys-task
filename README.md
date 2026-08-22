# Plexys Homework — Support Ticket Management

A support ticket management system built on [Corteza](https://cortezaproject.org) (open-source low-code platform) with a Vue 3 frontend.

📄 **Full documentation** (architecture, design decisions, user/admin guides, known limitations) is attached separately as a PDF. This README covers environment setup only.

## Stack

- **Backend platform:** Corteza 2024.9.9 (PostgreSQL 15)
- **Frontend:** Vue 3 (Composition API) + PrimeVue
- **Auth proxy:** Go / Gin — handles OAuth2 token exchange server-side so the client secret never reaches the browser
- **Orchestration:** Docker Compose

```
Browser (Vue 3 SPA)
  |--- Corteza REST API (tickets, customers, records)
  '--- Go auth-proxy (OAuth2 token exchange only)
           '--- Corteza OAuth2 server (internal Docker network)
```

## Prerequisites

- Docker Desktop
- Node.js 18+ (used only to run `scripts/dev-seed.mjs`)

## Setup

### 1. Clone and prepare environment files

```bash
git clone <this-repo-url>
cd corteza-stack

cp .env.example .env
cp frontend/.env.example frontend/.env
cp backend/configs/config.example.yaml backend/configs/config.yaml
```

Open `.env` and set the administrator credentials that will be created automatically on first boot:

```env
ADMIN_EMAIL=your-admin-email
ADMIN_PASSWORD=your-strong-password
```

### 2. Start the stack

```bash
docker-compose -f docker-compose.offline.yml up -d
```

The `corteza-init` service runs once, creates the administrator account from the credentials above, and exits — this is expected, not a failure.

Confirm everything is healthy:

```bash
docker-compose -f docker-compose.offline.yml ps
curl http://localhost:18080/version
```

### 3. Create the OAuth2 Auth Client

The frontend authenticates against Corteza using the `authorization_code` grant. This requires a dedicated Auth Client, created once through the Corteza admin UI.

1. Open `http://localhost:18080` and sign in with the admin credentials from step 1.
2. Go to **Admin → System → Auth Clients → New Auth Client**.
3. Name / Handle: `plexys`.
4. Under **Redirect URI's**, add: `http://localhost:5173/callback`.
5. Select **"Will be used to authenticate users (grant type = authorization_code)"**.
6. Under permissions, check **"Allow client access to user's profile"** and **"Allow client access to Corteza API on behalf of user"**. Leave OIDC and Discovery API unchecked.
7. Ensure **Enabled** and **Trusted** are both checked.
8. Select **Submit**.
9. Reopen the client — note the **Client ID** (shown in the browser's URL bar) and the **Client Secret** (shown on the client's detail page).

> A dedicated client is created deliberately here rather than reusing Corteza's default "Corteza Webapps" client — each integration should have its own client so scope, secret rotation, and revocation can be managed independently.

### 4. Apply client credentials

> **⚠️ Security note:** the Client Secret must be written **only** to `backend/configs/config.yaml`. It must never appear in `frontend/.env` or any `VITE_`-prefixed variable — those values are compiled into client-side JavaScript and are visible to anyone inspecting the app in a browser.

In `frontend/.env`:

```env
VITE_OAUTH_CLIENT_ID=<Client ID from step 3>
VITE_OAUTH_REDIRECT_URI=http://localhost:5173/callback
VITE_AUTH_PROXY_URL=http://localhost:8080
```

In `backend/configs/config.yaml`, under the `corteza:` section:

```yaml
corteza:
  client_id: "<Client ID from step 3>"
  client_secret: "<Client Secret from step 3>"
  auth_base_url: "http://corteza-server/auth"
  redirect_uri: "http://localhost:5173/callback"
```

> **Docker networking note:** `auth_base_url` uses the Docker Compose service name `corteza-server`, not `localhost`. The auth-proxy runs inside a container and must reach Corteza over the internal Docker network — `localhost` from within a container refers to that container itself, not the host machine.

Restart the two services that depend on this config:

```bash
docker-compose -f docker-compose.offline.yml restart backend frontend
```

### 5. Populate the workspace

Go to `http://localhost:5173` and sign in. Open the browser's developer tools → **Application → Local Storage**, and copy the value of the key holding the session JWT.

Run the provisioning script with that token:

```bash
node scripts/dev-seed.mjs <token>
```

This creates the **Plexys Homework** namespace, the **Support Ticket** and **Customer** modules with all fields (including the Customer relationship field), if they don't already exist. It's idempotent — safe to re-run at any time. On completion it prints three IDs.

Copy them into `frontend/.env`:

```env
VITE_CORTEZA_NAMESPACE_ID=<namespace ID>
VITE_CORTEZA_TICKET_MODULE_ID=<ticket module ID>
VITE_CORTEZA_CUSTOMER_MODULE_ID=<customer module ID>
```

Restart again to pick up the new values:

```bash
docker-compose -f docker-compose.offline.yml restart backend frontend
```

### 6. Verify

1. Open `http://localhost:5173`.
2. Select **Sign In with Corteza** — redirects to Corteza's own login page.
3. Sign in with the administrator credentials.
4. Confirm the browser returns to the app and shows the Tickets view.
5. Create, edit, and delete a ticket. Repeat for a customer, and confirm a customer can be associated with a ticket.

## Troubleshooting

```bash
# Full stack logs
docker-compose -f docker-compose.offline.yml logs -f

# Individual services
docker-compose -f docker-compose.offline.yml logs corteza-server
docker-compose -f docker-compose.offline.yml logs backend
docker-compose -f docker-compose.offline.yml logs frontend
```

**Corteza reports unhealthy after a host disk-space issue or unclean shutdown** — remove the container and its image rather than assuming the data volume is corrupted:

```bash
docker-compose -f docker-compose.offline.yml stop corteza-server
docker-compose -f docker-compose.offline.yml rm -f corteza-server
docker rmi cortezaproject/corteza:2024.9
docker-compose -f docker-compose.offline.yml up -d corteza-server
```

## Full Reset

Removes all containers, volumes, and images for this project, including the Corteza database. The Auth Client, namespace, and modules from steps 3–5 will need to be recreated afterward.

```bash
docker-compose -f docker-compose.offline.yml down -v --rmi all
docker-compose -f docker-compose.offline.yml build --no-cache
```

Then repeat from step 2.

## Project Structure

```
.
├── docker-compose.offline.yml   # Local development stack
├── docker-compose.online.yml    # Production stack (Nginx + Let's Encrypt)
├── .env.example
├── scripts/
│   └── dev-seed.mjs             # Idempotent namespace/module provisioning
├── backend/                     # Go auth-proxy (OAuth2 token exchange)
│   └── configs/
│       └── config.example.yaml
└── frontend/                    # Vue 3 application
    └── .env.example
```
