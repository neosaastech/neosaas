# Stage build
FROM node:20-alpine AS build
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
# si Next.js ou build spécifique
RUN npm run build

# Stage runtime
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Pour Next.js/SSR, expose le port attendu (ex : 3000)
EXPOSE 3000
# Copie uniquement les artefacts nécessaires
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next   # si Next
COPY --from=build /app/public ./public
COPY --from=build /app/server.js ./server.js  # si tu as un server custom
CMD ["node", "server.js"]
