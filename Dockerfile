# ────────────────────────────────────────────────────────────────────────────
# MaidenHeadApp — imagen de producción
# Base: nginx:alpine (mínima; ~7 MB)
# Precondición: ejecutar `npm run build` antes de `docker build`
#               (deploy.sh lo hace automáticamente)
# ────────────────────────────────────────────────────────────────────────────

FROM nginx:alpine

# Elimina la configuración por defecto de nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copia la configuración personalizada (SPA + PWA + gzip + cache headers)
COPY nginx.conf /etc/nginx/conf.d/app.conf

# Copia el build de Angular (generado en www/ por `npm run build`)
COPY www/ /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
