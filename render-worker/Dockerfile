# FFmpeg render worker for Apollo Reborn.
FROM node:20-slim

# FFmpeg + ffprobe
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps (no lockfile committed yet — npm install resolves them).
COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

ENV NODE_ENV=production
# Railway provides PORT; default for local runs.
ENV PORT=8080
EXPOSE 8080

CMD ["node", "src/index.js"]
