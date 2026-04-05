FROM node:20-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PORT=3000
ENV BROWSER_EXECUTABLE=/usr/bin/chromium

RUN apt-get update && apt-get install -y --no-install-recommends \
  chromium \
  ffmpeg \
  ca-certificates \
  fontconfig \
  fonts-liberation \
  fonts-noto-color-emoji \
  dumb-init \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

RUN mkdir -p /app/renders

EXPOSE 3000

CMD ["dumb-init", "npm", "start"]
