FROM node:24-alpine

WORKDIR /app
ENV HOST=0.0.0.0

COPY package*.json ./
RUN npm ci

COPY --chown=node:node . .

USER node
EXPOSE 3000

CMD ["npm", "start"]
