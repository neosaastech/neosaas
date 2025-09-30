# Stage 1 : Build
FROM node:20-alpine AS build
WORKDIR /app

# Fix Alpine pour Next.js (sharp, etc.)
RUN apk add --no-cache libc6-compat python3 make g++

# Copier manifest
COPY package.json package-lock.json ./

# Installer deps
RUN npm ci --legacy-peer-deps

# Copier le reste
COPY . .

# Build Next.js
RUN npm run build

# Stage 2 : Runtime
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Next.js port
EXPOSE 3000

# Copier artefacts nécessaires
COPY --from=build /app/package.json ./ 
COPY --from=build /app/package-lock.json ./ 
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.js ./next.config.js

# Démarrage Next.js
CMD ["npm", "start"]
