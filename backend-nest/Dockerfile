FROM node:22-alpine

WORKDIR /app

ENV DATABASE_URL="postgresql://postgres:1234@db:5432/CGP?schema=public"

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm install --no-audit --fund=false

COPY . .

EXPOSE 3001
CMD ["npm", "run", "start:dev"]
