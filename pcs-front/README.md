# pcs-front

SN318 产品中心前端的脱敏工作区快照，基于 2026-10-14 本地 `dev` 分支及已有未提交适配。包含 Vue 3、TypeScript、Vite SPA、内联核心层 `src/core`、本地主数据 Mock 与 Fastify BFF。

需要 Node.js `^22.18.0` 或 `>=24.12.0`。锁文件保留当前依赖版本；认证依赖 `@baiyun/auth-center-browser` 与 `@baiyun/auth-center-node` 使用 `file:../BYAuthCenter/packages/...`。该认证工程及 SDK 不在此次公开范围内，重新安装依赖前需自行提供合法授权的包目录。发布验证复用本机已有依赖，不代表公开网络上的全新安装验证。

取得依赖后可使用：

```powershell
npm run type-check
npm run bff:type-check
npm run build
npm run bff:build
npm run preview -- --host 127.0.0.1
```

`public/config.js` 的 `dev` 配置使用本地 Mock，`prod` 使用真实认证流程并需要自行配置 BFF。内部域名、凭据及服务地址已移除，示例地址不可代替真实后端。BFF 从服务端环境变量读取认证凭据，公开源码不提供这些值。

此快照包含上游源码和本地已有工作；没有导入私有 Git 历史、内部 CI、原始需求、账号配置、运行日志或截图。`public/local-samples` 是本地适配所引用的合成样例，不作为真实业务执行证据。
