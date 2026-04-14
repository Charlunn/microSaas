# Docker One-Click Deployment Guide (App + Reverse Proxy)

> Project: `microSaas`  
> Deployment model: both `main-landing` and `nginx` run inside `docker compose`  
> Goal: repeatable deployments without manually managing Node/PM2 runtime processes

---

## 1. Architecture and Deployment Flow

The runtime has two services:

1. **main-landing** (Next.js app)
   - Built via multi-stage Docker build
   - Runs from Next.js `standalone` output
2. **reverse-proxy** (Nginx)
   - Exposes port 80 externally
   - Proxies traffic to `main-landing:3000`

Deployments can be triggered in two ways:

- Manual one-click command: `pnpm docker:up`
- Admin Console `REDEPLOY` button (via deployment runner)

Admin redeploy executes this actual sequence:

1. `git pull`
2. `docker compose --env-file .env.production build main-landing`
3. `docker compose --env-file .env.production up -d main-landing reverse-proxy`
4. Call `/api/health` and mark deployment `success` or `failed`

---

## 2. Key Files You Should Know

- Compose definition: `docker-compose.yml`
- App image build: `apps/main-landing/Dockerfile`
- Nginx config: `deploy/nginx/default.conf`
- Production env template: `.env.production.example`
- Health endpoint: `apps/main-landing/src/app/api/health/route.ts`
- Deployment runner: `scripts/local-deploy-runner.ts`
- Helper scripts: root `package.json`

---

## 3. Prerequisites

Before first deployment, make sure the target machine has:

1. **Docker** + **Docker Compose v2** (`docker compose` must work)
2. Repository already cloned/pulled
3. Network access to:
   - Supabase
   - Git remote
4. `APP_HTTP_PORT` available (default 80)

Recommended checks:

```bash
docker --version
docker compose version
```

---

## 4. Environment Variables (Most Important)

### 4.1 Copy template

```bash
cp .env.production.example .env.production
```

### 4.2 Fill `.env.production`

Required keys:

- `APP_BASE_DOMAIN`
- `APP_HTTP_PORT` (80 is fine in most cases)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- `ADMIN_API_TOKEN`
- `ADMIN_API_SCOPES`

Optional keys:

- `ARTIFACT_MAX_BYTES`
- `DEPLOY_RUNNER_CWD`
- `DEPLOY_HEALTHCHECK_URL` (if omitted, defaults to `http://127.0.0.1:${APP_HTTP_PORT}/api/health`)

### 4.3 Value notes

- If `APP_BASE_DOMAIN=yourdomain.com`, generated app URL will be `https://<slug>.yourdomain.com`
- For internal testing, you can start with a temporary domain and switch later

---

## 5. One-Click Start and Basic Operations

### 5.1 Start / Deploy

```bash
pnpm docker:up
```

Equivalent command:

```bash
docker compose --env-file .env.production up -d --build main-landing reverse-proxy
```

### 5.2 Check status

```bash
pnpm docker:ps
```

### 5.3 Tail logs

```bash
pnpm docker:logs
```

### 5.4 Stop services

```bash
pnpm docker:down
```

---

## 6. Post-Deployment Checklist

### 6.1 Container status

```bash
pnpm docker:ps
```

Expected: both `main-landing` and `reverse-proxy` are `Up`.

### 6.2 Health check

```bash
curl http://127.0.0.1:${APP_HTTP_PORT:-80}/api/health
```

Expected response:

```json
{"ok":true}
```

### 6.3 Functional smoke test

- Open landing page
- Open one registered app by slug
- Confirm static assets (CSS/JS/images) load successfully

### 6.4 Admin redeploy flow

Click `REDEPLOY` in Admin Console and verify status transition:

`queued -> running -> success` (normal)  
or  
`queued -> running -> failed` (failure)

On failure, deployment logs should include:

- `docker compose ps`
- `docker compose logs --tail 120 main-landing reverse-proxy`

---

## 7. Daily Operations

### 7.1 Pull latest code and deploy

```bash
git pull
pnpm docker:up
```

### 7.2 Restart without rebuilding

```bash
docker compose --env-file .env.production up -d main-landing reverse-proxy
```

### 7.3 Force rebuild app image

```bash
docker compose --env-file .env.production build --no-cache main-landing
docker compose --env-file .env.production up -d main-landing reverse-proxy
```

### 7.4 Tail one specific service

```bash
docker compose --env-file .env.production logs -f --tail=200 main-landing
docker compose --env-file .env.production logs -f --tail=200 reverse-proxy
```

---

## 8. Troubleshooting by Symptom

### Symptom A: `docker: command not found`

Cause: Docker is not installed (or PATH is not loaded).  
Fix: install Docker Engine + Compose v2 and confirm `docker compose version` works.

### Symptom B: Containers are up, but site is unreachable

Check in order:

1. `pnpm docker:ps` for runtime status
2. Firewall / security group rules for `APP_HTTP_PORT`
3. Nginx logs for 502/504
4. Local check: `curl http://127.0.0.1:<APP_HTTP_PORT>/api/health`

### Symptom C: Admin redeploy fails

Common causes:

- `git pull` fails (permissions/conflicts)
- `docker compose build` fails (deps/network)
- health check timeout (service not ready)

Fix: inspect deployment logs in Admin; runner captures `compose ps` and `compose logs` automatically.

### Symptom D: Subdomain app URL does not work

Check:

1. `APP_BASE_DOMAIN` value
2. wildcard DNS (`*.yourdomain.com`)
3. reverse proxy traffic reaching this server

---

## 9. Security Recommendations

1. Never commit `.env.production`
2. Use a strong random `ADMIN_API_TOKEN`
3. Rotate `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_API_TOKEN` regularly
4. If public-facing, terminate TLS/HTTPS at proxy level

---

## 10. Rollback (Simple Method)

If the latest version is unstable:

1. `git checkout <known-good-commit>`
2. `pnpm docker:up`
3. Re-run health check and smoke tests

---

## 11. Command Quick Reference

```bash
# Deploy / update
pnpm docker:up

# Status
pnpm docker:ps

# Logs
pnpm docker:logs

# Stop
pnpm docker:down

# Health check
curl http://127.0.0.1:${APP_HTTP_PORT:-80}/api/health
```
