# Stage 1 - Build
FROM node:18-alpine AS builder 
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

#Stage 2 - Production
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app ./
RUN npm prune --omit=dev

EXPOSE 5000
CMD [ "npm" , "start" ]