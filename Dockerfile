# ---------- Build stage ----------
FROM node:22-alpine AS build
WORKDIR /app

# Copy only manifests first to leverage Docker layer caching
COPY package*.json ./

# Install ALL deps (including dev) for Angular build
RUN npm ci

# Copy the rest of the source
COPY . .

# Build Angular (production)
RUN npx ng build --configuration production

# ---------- Runtime stage ----------
FROM nginx:1.27-alpine
# Copy nginx config (expects you to provide nginx.conf alongside this Dockerfile)
COPY nginx.conf /etc/nginx/nginx.conf

# Copy build output
COPY --from=build /app/dist/carmar-intranet-frontend /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
