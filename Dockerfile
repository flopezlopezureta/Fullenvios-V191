FROM node:20-slim

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar el resto del código
COPY . .

# Compilar la aplicación
RUN npm run build

EXPOSE 3001

# Comando de inicio
CMD ["node", "server.js"]
