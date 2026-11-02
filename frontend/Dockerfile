# Stage 1: Build Vite React Application
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Compilar para producción (utiliza proxy inverso relativo /api/ y /panel/)
ENV VITE_BACKEND_URL=""
RUN npm run build

# Stage 2: Serve with Nginx Reverse Proxy
FROM nginx:alpine

# Copiar artefactos compilados del frontend
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración Nginx con proxy inverso hacia Django
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
