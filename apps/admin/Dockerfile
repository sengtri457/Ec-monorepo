FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"
ENV NODE_PATH="/app/node_modules:/app/apps/admin/node_modules"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --chown=nextjs:nodejs apps/admin/.next/standalone ./
COPY --chown=nextjs:nodejs apps/admin/.next/static ./apps/admin/.next/static
COPY apps/admin/public ./apps/admin/public

USER nextjs
EXPOSE 3001
CMD ["node", "apps/admin/server.js"]
