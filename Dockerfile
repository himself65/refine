FROM node:18

WORKDIR ./

COPY ./apps/server/package*.json ./
RUN npm install --only=production
COPY ./apps/server/dist ./
EXPOSE 3030

CMD ["node", "./index.js"]

