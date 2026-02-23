# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
# Instala solo dependencias necesarias para construir
RUN npm install

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Limitar memoria de Node durante el build para evitar crashes en sistemas de 8GB
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# Solo copiamos lo necesario para correr
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY . .

EXPOSE 3001
CMD ["node", "server.js"]
