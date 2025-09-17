# ---------- Build stage ----------
FROM node:22-alpine AS build
WORKDIR /app

# Instalar deps del proyecto
COPY package*.json ./
RUN npm ci

# Copiar código y compilar Angular (prod)
COPY . .
RUN npx ng build --configuration production

# Normalizar salida a /app/build (con o sin subcarpeta 'browser')
# ajusta APP_NAME si tu carpeta dist difiere (según angular.json -> outputPath)
ARG APP_NAME=carmar-intranet-frontend
RUN if [ -d "dist/$APP_NAME/browser" ]; then \
      mv "dist/$APP_NAME/browser" /app/build; \
    elif [ -d "dist/$APP_NAME" ]; then \
      mv "dist/$APP_NAME" /app/build; \
    elif [ -d "dist" ]; then \
      mv dist /app/build; \
    else \
      echo "Build output not found in dist/"; ls -R; exit 1; \
    fi

# ---------- Runtime stage ----------
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx","-g","daemon off;"]
