FROM oven/bun:1.3.3

USER root
WORKDIR /app

ENV PORT=80
ENV NODE_ENV=production

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY tsconfig.json ./
COPY server ./server
COPY calc ./calc
COPY web ./web

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD bun -e "const r=await fetch('http://127.0.0.1:'+(process.env.PORT||'80')+'/api/health'); if(!r.ok) process.exit(1)"

CMD ["bun", "server/server.ts"]
