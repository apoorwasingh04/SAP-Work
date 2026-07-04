# Build context is the repo root so we can copy the frontend and the config.
FROM nginx:1.27-alpine

COPY gateway/nginx.conf /etc/nginx/nginx.conf
COPY frontend/webapp   /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --retries=5 \
  CMD wget -qO- http://localhost:8080/health || exit 1
