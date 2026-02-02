FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --no-audit --fund=false

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev"]

