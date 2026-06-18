# Web (Next.js BFF) — dev mode, Node 24 + pnpm
FROM node:24-slim

# pnpm via corepack (no packageManager pin in package.json).
RUN corepack enable && corepack prepare pnpm@11 --activate

WORKDIR /app

# Deps first (cacheable layer). pnpm-workspace.yaml carries the allowBuilds
# (sharp/oxide/tailwind-oxide) — required on pnpm 11.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 3000
CMD ["pnpm", "dev", "-H", "0.0.0.0", "-p", "3000"]
