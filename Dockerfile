FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends gosu ffmpeg fonts-dejavu-core ca-certificates libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 libpango-1.0-0 libcairo2 libx11-6 libxext6 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY src ./src
COPY server.mjs core.mjs ./
RUN npx remotion browser ensure && mkdir -p /data && chown -R node:node /app /data
ENV NODE_ENV=production DATA_DIR=/data PORT=8080
COPY docker-entrypoint.sh /usr/local/bin/nafhamha-entrypoint
RUN chmod 755 /usr/local/bin/nafhamha-entrypoint
ENTRYPOINT ["/usr/local/bin/nafhamha-entrypoint"]
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","server.mjs"]
