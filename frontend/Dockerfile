FROM node:20-alpine AS base

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# For development, this is all we need to do before mounting volumes
FROM base AS development
RUN npm install
# Development container will mount the source code volume
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]

# For production, we build the application
FROM base AS production
RUN npm ci
COPY . .
RUN npm run build
# Use only what's needed for production
RUN npm prune --production
CMD ["node", "server.js"]