# incremental.icu

<p align="left">
  <a href="https://github.com/inrenping/incremental.icu/stargazers"><img src="https://img.shields.io/github/stars/inrenping/incremental.icu?style=flat&label=Stars&labelColor=1F2937&color=2563EB" alt="Stargazers"></a>
  <a href="https://github.com/inrenping/incremental.icu/network/members"><img src="https://img.shields.io/github/forks/inrenping/incremental.icu?style=flat&label=Forks&labelColor=1F2937&color=7C3AED" alt="Forks"></a>
  <a href="https://github.com/inrenping/incremental.icu/issues"><img src="https://img.shields.io/github/issues/inrenping/incremental.icu?style=flat&label=Issues&labelColor=1F2937&color=D97706" alt="Issues"></a>
</p>

[incremental.icu](https://incremental.icu)一个用于佳明、高驰运动数据同步的网页工具,可以协助你更好地a管理佳明和高驰平台上的运动数据，适合有拥有两块手表的用户。

![dash](/doc/dash_page.png)

![activities](/doc/activities_page.png)

![activity](/doc/activity_page.png)

## 主要功能

- 实时同步并查看运动记录
- 运动记录的单条手动推送到其他平台
- 一键同步近期运动数据

## 目前已经对接的平台

| 平台 | 是否支持 | 下载/上传文件格式 |
|------|----------|--------|
| 佳明国内版 | 是 | `.zip` |
| 佳明国际版 | 是 | `.zip` |
| 高驰 | 是 |  `.fit` |

## 快速开始

若你只想使用成品版本，可前往 [incremental.icu](https://incremental.icu) 直接注册使用。

## 相关服务（面向开发者）

> 前端部署之前记得先跑一下 `npm run lint`/

- [对应后端服务 python fastapi 提供接口](https://github.com/inrenping/incremental-serve.git)

- 前端部署平台： [vercel](https://vercel.com)

> 部署注意：后端接口地址需要写在 `/vercel.json`

- [邮件发送服务基于 Resend](resend.com)

- [前端佳明高驰登录参考](https://github.com/XiaoSiHwang/garmin-sync-coros)

- 支持 Google 和 Github 原生的单点登录。

- [neon 数据库](https://console.neon.tech)

- 网站状态监测[betterstack](https://betterstack.com)

- [网站流量分析 google analytics](https://analytics.google.com/analytics/web/)

- 定时任务 github Actions

- Ci/CD 自动化部署 前端 vercel  后端 Gtihub Actions

- 项目管理 github projects

- [React App 参考文档](https://nextjs.org/docs/app/api-reference/cli/create-next-app)

- [shadcn](https://ui.shadcn.com/examples/dashboard)

- [alpine](https://alpine-registry.vercel.app/)

- 图标包： [tabler icons](https://tabler.io/icons)
