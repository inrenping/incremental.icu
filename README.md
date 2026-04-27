# Incremental 前端

一个用于佳明、高驰运动数据同步的网页工具。这是一个前端。（后续会做一个纯前端的自助部署版本）

* [对应后端服务 python fastapi 提供接口](https://github.com/inrenping/incremental-serve.git)

* 前端部署平台： [vercel](https://vercel.com)

> 部署注意：后端接口地址需要写在 `/vercel.json`

* [邮件发送服务基于 Resend](resend.com)

* [前端佳明高驰登录参考](https://github.com/XiaoSiHwang/garmin-sync-coros)

* 支持 Google 和 Github 原生的单点登录。

* [neon 数据库](https://console.neon.tech)

* 文件存储还没定： vercel blob  或者 vultr oss

* 网站状态监测[betterstack](https://betterstack.com)

* [网站流量分析 google analytics](https://analytics.google.com/analytics/web/)

* 定时任务 github Actions

* Ci/CD 自动化部署 前端 vercel  后端 Gtihub Actions

* 项目管理 github projects 还没弄明白怎么搞

> 前端部署之前记得先跑一下 `npm run lint`

## 参考

* [Create React App](https://nextjs.org/docs/app/api-reference/cli/create-next-app)

* [shadcn](https://ui.shadcn.com/examples/dashboard)

* [alpine](https://alpine-registry.vercel.app/)

* 图标包： [tabler icons](https://tabler.io/icons)

## GTIHUB ACTIONS 需要配置的变量

* NEXT_PUBLIC_BACKEND_URL
* GOOGLE_CLIENT_ID
* NEXT_PUBLIC_GOOGLE_CLIENT_ID
* GOOGLE_CLIENT_SECRET
* GITHUB_CLIENT_ID
* NEXT_PUBLIC_GITHUB_CLIENT_ID
* GITHUB_CLIENT_SECRET
