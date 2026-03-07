FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY server.mjs /app/server.mjs

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "/app/server.mjs"]
