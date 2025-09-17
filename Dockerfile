# ---------- Build stage ----------
FROM node:22-alpine AS build
WORKDIR /app

# 1) Instalar deps
COPY carmar-intranet-frontend/package*.json ./
RUN npm ci

# 2) Copiar código y compilar Angular (prod)
COPY carmar-intranet-frontend/ .
RUN npx ng build --configuration production

# 3) Normalizar salida a /app/build (con o sin 'browser')
RUN if [ -d "dist/carmar-intranet-frontend/browser" ]; then \
      mv dist/carmar-intranet-frontend/browser /app/build; \
    elif [ -d "dist/carmar-intranet-frontend" ]; then \
      mv dist/carmar-intranet-frontend /app/build; \
    else \
      echo "Build output not found in dist/"; ls -R dist; exit 1; \
    fi

# ---------- Runtime stage ----------
FROM nginx:1.27-alpine

# Nginx escuchando en 8080 (coherente con el mapeo 8989:8080)
COPY nginx.conf /etc/nginx/nginx.conf

# Copiar build
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx","-g","daemon off;"]
