# Docker 一键部署指南（应用 + 反向代理）

> 适用项目：`microSaas`  
> 部署模型：`main-landing` + `nginx` 均运行在 `docker compose` 中  
> 目标：让你不需要手动管理 Node/PM2 进程，也能完成可重复、可回滚的部署

---

## 1. 架构与流程概览

当前部署由两部分组成：

1. **main-landing**（Next.js 服务）
   - 使用多阶段 Docker 构建
   - 以 `standalone` 产物运行
2. **reverse-proxy**（Nginx）
   - 对外暴露 80 端口
   - 反向代理到 `main-landing:3000`

部署触发来源有两种：

- 手动一键启动：`pnpm docker:up`
- Admin 控制台点击 `REDEPLOY`（调用部署 runner）

Admin 重部署时的真实步骤：

1. `git pull`
2. `docker compose --env-file .env.production build main-landing`
3. `docker compose --env-file .env.production up -d main-landing reverse-proxy`
4. 请求 `/api/health`，成功则标记部署 `success`，失败则标记 `failed`

---

## 2. 文件说明（你会用到哪些文件）

- Compose 编排：`docker-compose.yml`
- 应用镜像：`apps/main-landing/Dockerfile`
- 反向代理配置：`deploy/nginx/default.conf`
- 生产环境变量模板：`.env.production.example`
- 健康检查接口：`apps/main-landing/src/app/api/health/route.ts`
- 部署 runner：`scripts/local-deploy-runner.ts`
- 常用命令（脚本）：根 `package.json`

---

## 3. 前置条件（首次部署前必须确认）

请先在服务器上确认：

1. 已安装 **Docker** 与 **Docker Compose v2**（`docker compose` 子命令可用）
2. 仓库代码已拉到目标目录
3. 目标机器可以访问：
   - Supabase
   - Git 远端仓库
4. 80 端口可被本机监听（若冲突，改 `APP_HTTP_PORT`）

建议执行：

```bash
docker --version
docker compose version
```

---

## 4. 环境变量配置（最关键）

### 4.1 复制模板

```bash
cp .env.production.example .env.production
```

### 4.2 填写 `.env.production`

最少需要填写这些键：

- `APP_BASE_DOMAIN`
- `APP_HTTP_PORT`（默认可用 80）
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- `ADMIN_API_TOKEN`
- `ADMIN_API_SCOPES`

可选：

- `ARTIFACT_MAX_BYTES`
- `DEPLOY_RUNNER_CWD`
- `DEPLOY_HEALTHCHECK_URL`（不填则自动使用 `http://127.0.0.1:${APP_HTTP_PORT}/api/health`）

### 4.3 建议值说明

- `APP_BASE_DOMAIN=yourdomain.com` 时，系统会给子应用生成 `https://<slug>.yourdomain.com`
- 若你只在内网调试，可先配一个临时域名，后续再切正式域名

---

## 5. 一键启动与基础运维

### 5.1 一键启动

```bash
pnpm docker:up
```

等价于：

```bash
docker compose --env-file .env.production up -d --build main-landing reverse-proxy
```

### 5.2 查看状态

```bash
pnpm docker:ps
```

### 5.3 查看日志

```bash
pnpm docker:logs
```

### 5.4 停止服务

```bash
pnpm docker:down
```

---

## 6. 自检清单（建议每次部署后执行）

### 6.1 容器状态检查

```bash
pnpm docker:ps
```

期望：`main-landing` 与 `reverse-proxy` 都是 `Up`。

### 6.2 健康检查

```bash
curl http://127.0.0.1:${APP_HTTP_PORT:-80}/api/health
```

期望返回：

```json
{"ok":true}
```

### 6.3 页面可用性

- 打开主站首页
- 随机打开一个已注册应用的 `slug` 页面
- 确认静态资源（CSS/JS/图片）都可正常加载

### 6.4 Admin 重部署链路

在 Admin 控制台点击 `REDEPLOY`，确认状态流转：

`queued -> running -> success`（正常）  
或  
`queued -> running -> failed`（失败）

失败时看部署日志，应该能看到：

- `docker compose ps`
- `docker compose logs --tail 120 main-landing reverse-proxy`

---

## 7. 日常操作手册（常见场景）

### 7.1 更新代码并发布

```bash
git pull
pnpm docker:up
```

### 7.2 仅重启容器（不重建）

```bash
docker compose --env-file .env.production up -d main-landing reverse-proxy
```

### 7.3 强制重建应用镜像

```bash
docker compose --env-file .env.production build --no-cache main-landing
docker compose --env-file .env.production up -d main-landing reverse-proxy
```

### 7.4 查看某个服务日志

```bash
docker compose --env-file .env.production logs -f --tail=200 main-landing
docker compose --env-file .env.production logs -f --tail=200 reverse-proxy
```

---

## 8. 故障排查（按症状快速定位）

### 症状 A：`docker: command not found`

原因：机器未安装 Docker，或 PATH 未生效。  
处理：安装 Docker Engine + Compose v2，确认 `docker compose version` 可执行。

### 症状 B：容器启动了，但网页打不开

排查顺序：

1. `pnpm docker:ps` 看服务是否 `Up`
2. 检查防火墙/安全组是否放行 `APP_HTTP_PORT`
3. 看 Nginx 日志是否有 502/504
4. 本机执行 `curl http://127.0.0.1:<APP_HTTP_PORT>/api/health`

### 症状 C：Admin 重部署失败

常见原因：

- `git pull` 失败（权限或冲突）
- `docker compose build` 失败（依赖或网络）
- 健康检查超时（服务没真正起来）

处理：查看 Admin deployment log，重点看 runner 自动采集的 `compose ps` 与 `compose logs` 片段。

### 症状 D：域名子应用访问异常

排查：

1. `APP_BASE_DOMAIN` 是否正确
2. DNS 的通配解析是否生效（`*.yourdomain.com`）
3. 反向代理入口是否已指向当前服务器

---

## 9. 安全建议（生产必做）

1. `.env.production` 不要提交到 git
2. `ADMIN_API_TOKEN` 使用高强度随机字符串
3. 定期轮换 `SUPABASE_SERVICE_ROLE_KEY` 与 `ADMIN_API_TOKEN`
4. 如果暴露公网，建议在反向代理层加 HTTPS（证书/自动续期）

---

## 10. 回滚建议（简化版）

如果新版本异常，可快速回滚：

1. `git checkout <稳定提交>`
2. `pnpm docker:up`
3. 重新执行健康检查与页面抽样检查

---

## 11. 命令速查

```bash
# 首次/更新部署
pnpm docker:up

# 查看状态
pnpm docker:ps

# 查看日志
pnpm docker:logs

# 停止
pnpm docker:down

# 健康检查
curl http://127.0.0.1:${APP_HTTP_PORT:-80}/api/health
```
