FROM node:18

COPY ./apps/server /app
WORKDIR /app

CMD ["node", "--es-module-specifier-resolution=node", "./dist/index.js"]

EXPOSE 3030
