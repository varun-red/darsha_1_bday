FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY server ./server
COPY public ./public

# Persist the SQLite database on a volume in production.
VOLUME ["/app/data"]
ENV DB_PATH=/app/data/party.sqlite
ENV PORT=3000
EXPOSE 3000

CMD ["node", "--no-warnings=ExperimentalWarning", "server/index.js"]
