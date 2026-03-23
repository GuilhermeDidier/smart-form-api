# Use official Playwright image — Chromium pre-installed
FROM mcr.microsoft.com/playwright:v1.58.2-noble

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY src/ ./src/
COPY .env.example ./.env.example

# Create screenshots directory
RUN mkdir -p screenshots

EXPOSE 3000

CMD ["node", "src/index.js"]
