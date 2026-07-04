# syntax=docker/dockerfile:1
FROM node:20-slim

# dumb-init gives us correct PID 1 signal handling -> fast, graceful shutdown
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Dependencies (declared & isolated - 12-factor II)
COPY package.json ./
RUN npm install --no-audit --no-fund

# 2. Application source
COPY . .
RUN chmod +x entrypoint.sh \
    && groupadd --system app && useradd --system --gid app app \
    && chown -R app:app /app
USER app

# 3. Port binding (12-factor VII) - configurable via $PORT
ENV PORT=4004
EXPOSE 4004

ENTRYPOINT ["dumb-init", "--"]
CMD ["./entrypoint.sh"]
