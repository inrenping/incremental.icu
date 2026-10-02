# 开发指南

## 源码

- 前端：[https://github.com/incremental-icu/incremental.icu](https://github.com/incremental-icu/incremental.icu)
- 后端：[https://github.com/inrenping/incremental-serve](https://github.com/inrenping/incremental-serve)

## 技术栈

| 层 | 技术 |
| :--- | :--- |
| 前端 | Next.js（App Router）、React、TypeScript、Tailwind CSS、shadcn/ui、next-intl（中英双语）、next-auth |
| 后端 | FastAPI（Python）、SQLAlchemy、APScheduler |
| 数据库 | PostgreSQL（Neon Serverless） |
| 部署 | 前端 Vercel；后端由 GitHub Actions 推送到 `master` 后自动 SSH 部署到服务器（systemd 托管） |
| MCP 服务 | 独立仓库 `incremental-mcp`，对外端点 `https://i.incremental.icu/mcp` |

## 目录结构（前端）

```
src/
  app/           # App Router 页面
    dash/        # 登录后仪表盘（账号、活动、定时任务、同步历史、心率等）
    doc/         # 文档页，按 slug 读取 public/docs/*.md
    heart/       # 心率页面
    sign-in/     # 登录注册
  components/    # 组件（ui/ 为 shadcn 基础组件，dash/ 为业务组件）
  hooks/         # 全局 hooks
  i18n/          # next-intl 配置
  lib/           # 工具、API client（authFetch）、常量、文档菜单
  messages/      # zh.json / en.json 文案
public/
  docs/          # 本站文档 Markdown（新增文档需同步维护 src/lib/doc-menu.json）
```

## 本地运行

### 前端

```bash
npm install
cp .env.example .env.development   # 填写 NEXT_PUBLIC_BACKEND_URL、OAuth 等变量
npm run dev
```

开发环境下 `next.config.ts` 会把 `/api/v1/*` 重写到 `NEXT_PUBLIC_BACKEND_URL`，方便直连本地或远端后端。

### 后端

```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## API 约定

- 所有业务接口前缀为 `/api/v1`，统一用 JWT 鉴权（前端统一走 `authFetch`）；
- 响应统一为 `{ "status": "success" | "error", "message": "...", "data": ... }`；
- 涉及账号连接（源/目标）的接口都会校验归属，避免操作他人绑定。

## 数据库变更

后端不引入 Alembic，DDL 采用**手工 SQL 迁移**：

- 全量建库脚本：`__init__.sql`
- 增量迁移：`migrations/YYYYMMDD_*.sql`，按顺序手动执行

```bash
psql "$DATABASE_URL" -f migrations/20261002_task_multi_items.sql
```

迁移脚本需要保证**可重复执行**（用 `IF NOT EXISTS` / 数据存在性判断做幂等保护）。

## 发布流程

1. 后端：提交到 `dev` → 合并到 `master`，推送即触发 GitHub Actions 部署；
2. 前端：提交到 `dev` → 合并到 `main`，Vercel 自动部署。

若数据库有变更，**先执行迁移 SQL，再发布后端**，最后发布前端。

## 参与贡献

欢迎提 Issue 或 PR。提交前请确认：

- 新增/修改的文案写入 `src/messages/*.json`，不要硬编码中文；
- 新增文档 Markdown 同步注册到 `src/lib/doc-menu.json`；
- 后端数据库变更必须附带迁移脚本。
