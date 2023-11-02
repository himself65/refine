FROM node:18

WORKDIR /app

COPY . .
RUN corepack enable \
    && pnpm install \
    && pnpm run --filter server build

EXPOSE 3030

CMD ["node", "./apps/server/dist/index.js"]
