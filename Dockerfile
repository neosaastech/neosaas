# Stage build
FROM node:20-alpine AS build
WORKDIR /app

# Installer libs nécessaires pour Next.js (sharp, etc.)
RUN apk add --no-cache libc6-compat python3 make g++

ENV NODE_ENV=production

# Installer dépendances
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copier le reste du code et builder
COPY . .
RUN npm run build

# Stage runtime
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Port attendu par Next.js
EXPOSE 3000

# Copier uniquement les artefacts nécessaires
COPY --from=build /app/package*.json ./ 
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.mjs ./next.config.mjs

# Démarrage Next.js
CMD ["npm", "start"]
