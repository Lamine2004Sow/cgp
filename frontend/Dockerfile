FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --fund=false

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev"]

