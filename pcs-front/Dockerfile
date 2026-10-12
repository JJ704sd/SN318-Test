# Dockerfile（打包一次多环境运行 · env.js 环境标识方案）
#
# 多阶段构建：node 构建静态产物 -> nginx 托管。
# 镜像只 build 一次，docker-entrypoint.sh 在容器启动时用 envsubst 把容器环境变量
# 渲染进 /usr/share/nginx/html/env.js 再启 Nginx -- 同一镜像靠不同 APP_ENV 跑不同环境。
#
# 构建：docker build -t baiyun-vue3-ai-template:latest .
# 运行（dev）：docker run -p 8080:80 -e APP_ENV=dev baiyun-vue3-ai-template:latest
# 运行（test）：docker run -p 8080:80 -e APP_ENV=test baiyun-vue3-ai-template:latest
# 运行（prod）：docker run -p 80:80 -e APP_ENV=prod baiyun-vue3-ai-template:latest
#
# 安全红线：禁止在镜像里硬编码任何密钥；密钥走后端代理，前端只持 endpoint 占位。

# ---------- Stage 1: build ----------
FROM node:24-alpine AS builder

WORKDIR /app

# 先复制 package 元数据利用 docker 层缓存
COPY package.json package-lock.json* ./

RUN npm ci

# 复制源码与配置
COPY . .

# 构建一次（set-env.mjs 生成默认 env.js，build 脚本已内置）
RUN npm run build

# ---------- Stage 2: serve ----------
FROM nginx:1.27-alpine

# 自定义 nginx.conf（SPA history 回退 + env.js/config.js no-cache + hash 资源长缓存）
COPY nginx.conf /etc/nginx/conf.d/default.conf

# entrypoint 脚本：容器启动时用 envsubst 把 APP_ENV 渲染进 env.js
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# 复制构建产物到 nginx html 目录（含 config.js 全环境配置 + env.js 占位）
COPY --from=builder /app/dist /usr/share/nginx/html

# env.js 模板：entrypoint 在容器启动时把它渲染成 env.js
COPY deploy/env.js.template /usr/share/nginx/html/env.js.template

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
