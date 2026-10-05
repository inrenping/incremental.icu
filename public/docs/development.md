# 开发指南

## 源码

- 前端：[https://github.com/inrenping/incremental.icu](https://github.com/inrenping/incremental.icu)
- 后端：[https://github.com/inrenping/incremental-serve](https://github.com/inrenping/incremental-serve)

## 技术栈

| 层 | 技术 |
| :--- | :--- |
| 前端 | Next.js 16.2（App Router）、React 19、TypeScript、Tailwind CSS v4、shadcn/ui + Radix、next-intl（中文默认，英文可选）、Recharts、dayjs、sonner、Tabler Icons |
| 认证 | Clerk（`@clerk/nextjs`），支持邮箱验证码与 Google / GitHub OAuth |
| 后端 | FastAPI（Python）、SQLAlchemy、APScheduler |
| 数据库 | PostgreSQL（Neon Serverless） |
| 对象存储 | Supabase Storage（活动文件） |
| 部署 | 前端 Vercel；后端由 GitHub Actions 推送到 `master` 后自动 SSH 部署到服务器（systemd 托管） |
| MCP 服务 | 独立仓库 `incremental-mcp`，对外端点 `https://incremental.icu/mcp` |

## 目录结构（前端）

```
src/
  app/
    page.tsx            # 首页
    sign-in/            # Clerk 登录（catch-all）
    sign-up/            # Clerk 注册（catch-all）
    api/
      garmin/route.ts   # 佳明登录取 token 的服务端路由
      coros/route.ts    # 高驰相关服务端路由
    dash/
      page.tsx          # 仪表盘：跑量 / 同步 / 睡眠 / 心率 四个标签
      layout.tsx        # 侧边栏 + 顶栏布局
      accounts/         # 平台账号管理（含「主数据源」开关）
      activities/       # 详细数据查询，子页 compare / files
      calendar/         # 按周排布的运动日历
      fitness/          # 佳明体能指标（训练状态·负荷、体能年龄、个人纪录、成绩预测）
      task/             # 定时任务
      sync-history/     # 同步历史
      files/            # 活动文件（Supabase）
      logs/             # 用户操作日志
      syslogs/          # 系统请求日志
      profile/          # 个人资料（昵称、时区、年度目标、第三方绑定）
      gpt/              # GPT Code：MCP OAuth 授权码
    heart/              # 独立心率页（复用 HeartRatePanel）
    doc/[slug]/         # 文档页，按 slug 读取 public/docs/*.md
  components/
    ui/                 # shadcn/ui 基础组件，非必要不改动
    dash/               # 仪表盘业务组件
      heart-rate-panel.tsx
      sleep-combined-panel.tsx   # 睡眠：日历 + 环形图 + 详情弹窗
      sleep-shared.ts            # 睡眠分期常量与几何计算
      running-30d-chart.tsx      # 近 30 天跑量柱状图
      recent-activities.tsx      # 主数据源最近记录
      task-dialog.tsx            # 任务新建/编辑（含额度校验）
      connection-dialog.tsx      # 平台账号连接表单
      app-card.tsx / sync-runs.tsx / sync-logs.tsx / pagination.tsx ...
    login/              # 登录页专属组件
    hooks/              # 组件级 hooks
  hooks/                # 全局 hooks（use-layout 等）
  i18n/                 # next-intl 配置（locales: zh / en，默认 zh）
  lib/                  # 工具、API client、常量、活动类型图标
    api.ts              # clerkFetch / authFetch，统一带 Clerk JWT
    token-manager.ts    # getAuthToken()：Clerk getToken + 旧 token 回退
    doc-menu.json       # 文档侧边栏菜单（新增文档必须同步）
    storage.ts / events.ts / activities.ts / utils.ts
  messages/             # zh.json / en.json 文案
  middleware.ts         # clerkMiddleware，白名单路由
public/
  docs/                 # 本站文档 Markdown
  docs/guide/           # 快速开始里的截图
scripts/
  check-i18n.py         # i18n 文案完整性检查（npm run i18n:check）
```

## 本地运行

### 前端

```bash
npm install
cp .env.example .env.development   # 填写 NEXT_PUBLIC_BACKEND_URL、Clerk Key、OAuth 变量
npm run dev
```

`.env.example` 中的变量：

| 变量 | 用途 |
| :--- | :--- |
| `NEXT_PUBLIC_BACKEND_URL` | 后端地址，开发环境 rewrite 目标 |
| `NEXT_PUBLIC_KEY` | 与后端共享的密钥 |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Clerk 认证 |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Clerk 登录/注册路由（`/sign-in`、`/sign-up`） |
| `GOOGLE_*` / `GITHUB_*` | 第三方登录（在 Clerk 后台配置的部分可不填） |

开发环境下 `next.config.ts` 会把 `/api/v1/*` 重写到 `NEXT_PUBLIC_BACKEND_URL`，方便直连本地或远端后端；生产环境由 `vercel.json` 的 rewrite 把 `/api/*` 转发到后端域名。

常用命令：

```bash
npm run dev          # 本地开发
npm run lint         # eslint，提交前必跑
npm run typecheck    # tsc --noEmit
npm run i18n:check   # 检查 zh.json / en.json 文案是否对齐
npm run build        # 构建（next.config.ts 中已开启 ignoreBuildErrors，见下方说明）
```

> `next.config.ts` 开启了 `typescript.ignoreBuildErrors`：`.next/types/validator.ts` 会引用已删除的 `/login` 路由残留类型导致构建失败，属于历史包袱，改动路由时留意。

### 后端

```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## 认证与接口调用

- 认证由 **Clerk** 负责，`src/middleware.ts` 用 `clerkMiddleware` 保护私有路由，公开路由白名单包含 `/sign-in(.*)`、`/sign-up(.*)`、`/api/v1(.*)`、`/heart(.*)`、`/doc(.*)`、`/`；
- 所有请求后端都必须走 `src/lib/api.ts` 的 `clerkFetch`（`authFetch` 是其兼容别名，二者等价），它会在每次请求时通过 `getAuthToken()` 实时取 Clerk JWT 并写入 `Authorization` 头，**不要自行维护 token 缓存**；
- 401/403 时会弹 toast 提示重新登录（5 秒内不重复弹），不自动跳转。

## API 约定

- 所有业务接口前缀为 `/api/v1`，统一用 JWT 鉴权；
- 涉及账号连接（源/目标）的接口都会校验归属，避免操作他人绑定；
- 主要接口（前端侧实际调用）：

| 分组 | 接口 |
| :--- | :--- |
| 账号 | `/api/v1/base/getConnectConfigs`、`/api/v1/base/login`、`/api/v1/base/relogin` |
| 活动 | `/api/v1/base/getActivitiesByPage(/WithFiles)`、`/api/v1/base/pullNewActivities`、`/api/v1/base/pullFullActivities`、`/api/v1/base/downloadActivity/{id}`、`/api/v1/base/cacheActivityFit/{id}`、`/api/v1/base/uploadActivity2Target/{id}/{targetId}` |
| 同步 | `/api/v1/base/execute2`（一键同步）、`/api/v1/base/syncRuns`（同步记录） |
| 心率 | `/api/v1/garmin/getDailyHeartRate`、`/api/v1/garmin/syncDailyHeartRate`、`/api/v1/garmin/getDailyHeartRateRange` |
| 睡眠 | `/api/v1/garmin/getDailySleep`、`/api/v1/garmin/getMonthlySleep`、`/api/v1/garmin/syncMonthlySleep` |
| 体能 | `/api/v1/garmin/getFitnessMetrics`、`/api/v1/garmin/syncFitnessMetrics` |
| 统计 | `/api/v1/base/getRunningTotal`、`/api/v1/main/getActivitiesByWeek`、`/api/v1/main/syncBaseToMainActivity` |
| 任务 | `/api/v1/task`（增删改查） |
| 文件 | `/api/v1/supabase/files`、`/api/v1/supabase/sync` |
| 用户 | `/api/v1/user/me`、`/api/v1/user/timezone`、`/api/v1/user/yearly`、`/api/v1/user/socials`、`/api/v1/user/oauth(-code)` |
| 日志 | `/api/v1/log`、`/api/v1/log/syslog` |

## 文档维护

文档 Markdown 放在 `public/docs/`，由 `src/app/doc/[slug]/page.tsx` 在浏览器端 `fetch('/docs/{slug}.md')` 加载，**因此是纯静态的、无法用服务端 MDX**。

新增一篇文档要同时做两件事：

1. 在 `public/docs/` 下写 `<slug>.md`（一级标题写文档名，二级标题会自动生成右侧目录）；
2. 把菜单项加到 `src/lib/doc-menu.json`，否则侧边栏里找不到入口。

当前菜单：项目介绍、联系作者 / 快速开始、常见问题、推荐、开发指南 / 使用条款、隐私政策。

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

- 新增/修改的文案写入 `src/messages/zh.json` 与 `src/messages/en.json`，不要硬编码中文；
- 新增文档 Markdown 同步注册到 `src/lib/doc-menu.json`；
- 提交前跑 `npm run lint`；
- 后端数据库变更必须附带迁移脚本。
