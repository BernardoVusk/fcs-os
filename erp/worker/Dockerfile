# Worker do WhatsApp (Grupos de Ofertas). O pacote dist/ é gerado antes com `npm run build`
# (junta o código compartilhado do ERP); aqui só entram as dependências do worker.
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund && npm cache clean --force
COPY dist ./dist
USER node
CMD ["node", "--enable-source-maps", "dist/index.mjs"]
