# Central Access Manager — Backend (Express + tsx, datos en memoria)
FROM node:20-alpine

WORKDIR /app

# Instalar dependencias primero (mejor cache)
COPY package.json ./
RUN npm install

# Copiar el código fuente
COPY tsconfig.json ./
COPY src ./src

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["npm", "run", "start"]
