# Ephemeral single-container deployment (Render free plan): PostgreSQL + API + web.
# Build context is the repository root.
FROM node:22-bookworm

RUN apt-get update \
 && apt-get install -y --no-install-recommends postgresql postgresql-contrib curl ca-certificates util-linux procps \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend ./backend
COPY frontend ./frontend

RUN cd backend && npm ci && npm run build
# Same-origin path: the proxy forwards /api to the API inside the container.
RUN cd frontend && npm ci && NEXT_PUBLIC_API_URL=/api npm run build

COPY deploy/start.sh /start.sh
COPY deploy/proxy.js /proxy.js
COPY deploy/demo.js /demo.js
RUN chmod +x /start.sh

ENV PGDATA=/tmp/pg PGPORT=5433
EXPOSE 7860
CMD ["/start.sh"]
