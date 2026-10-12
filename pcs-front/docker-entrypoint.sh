#!/bin/sh
# docker-entrypoint.sh（打包一次多环境运行 · env.js 环境标识方案）
#
# 容器启动时用 envsubst 把容器环境变量 APP_ENV 渲染进 /usr/share/nginx/html/env.js.template，
# 生成最终 /usr/share/nginx/html/env.js，再启 Nginx。
# 同一镜像靠不同 APP_ENV 跑不同环境，契合「构建一次、到处运行」。
#
# envsubst 白名单：只替换 APP_ENV（1 个变量，避免误伤 JS 里的 $ 字面量）。
#
# 用法（docker run）：
#   docker run -p 80:80 -e APP_ENV=prod baiyun-vue3-ai-template:latest
#   docker run -p 80:80 -e APP_ENV=test baiyun-vue3-ai-template:latest

set -eu

TEMPLATE_FILE=/usr/share/nginx/html/env.js.template
TARGET_FILE=/usr/share/nginx/html/env.js

# 1) 给 APP_ENV 设默认值（未设置环境变量时用 dev）
: "${APP_ENV:=dev}"
export APP_ENV

# 2) envsubst 渲染 env.js.template -> env.js
echo "[entrypoint] 渲染 env.js: APP_ENV=${APP_ENV}"
envsubst '$APP_ENV' < "${TEMPLATE_FILE}" > "${TARGET_FILE}"

echo "[entrypoint] env.js 渲染完成，启动 nginx..."
exec "$@"
