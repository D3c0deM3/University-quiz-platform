FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# Copy source
COPY . .

# Generate prisma client
RUN npx prisma generate

# Build
RUN npm run build

# Production
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./
COPY --from=base /app/prisma ./prisma

EXPOSE 3000
CMD ["node", "dist/main.js"]
