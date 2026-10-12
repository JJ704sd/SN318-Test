# pcs-front

SN318 产品中心前端的脱敏源码快照，包含 Vue 3、TypeScript、Vite SPA 与 Fastify BFF。BFF 通过 `/api/product-center/v1` 聚合产品中心和物流主数据服务，默认上游为本机服务。

需要 Node.js `^22.18.0` 或 `>=24.12.0`。`@baiyun/template-core` 是私有依赖，需自行取得包访问权限，在用户级 `.npmrc` 配置授权 registry。`.npmrc.example` 仅演示环境变量配置；其中地址是不可解析的公开占位地址。锁文件保留依赖版本，私有包下载地址也已替换为占位地址，公开网络不能直接完成依赖安装。

取得依赖后可使用：

```powershell
npm run type-check
npm run bff:type-check
npm run build
npm run bff:build
npm run preview -- --host 127.0.0.1
```

运行时配置在 `public/config.js`，环境标识由 `scripts/set-env.mjs` 生成。内部环境地址已移除，真实接口、登录和 AI 服务需要使用者自行配置；示例域名不能作为可用后端。BFF 支持 `BFF_PORT`、`BFF_HOST`、`PCS_SERVICE_BASE_URL` 和 `LMD_SERVICE_BASE_URL` 环境变量。

本快照没有私有工程的 Git 历史、内部 CI、浏览器保存页面或凭据，也没有打包私有核心依赖。目录内的演示页面及合成测试数据保留原有用途。
