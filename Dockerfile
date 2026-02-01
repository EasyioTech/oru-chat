# Dockerfile
# Stage 1: Install dependencies and build
FROM node:18-alpine AS builder

# Add metadata labels
LABEL maintainer="ERPComm Team"
LABEL description="ERPComm Enterprise Chat Application"
LABEL version="1.0"

WORKDIR /app

# Install dependencies (including devDependencies for build)
COPY package.json bun.lock* ./
# Install ALL dependencies (no --production flag)
RUN npm install --ignore-scripts && \
    npm cache clean --force

# Copy source code
COPY . .

# Set environment variables for build
# Build argument for client-side env vars (must be passed during docker build)
ARG NEXT_PUBLIC_GIPHY_API_KEY
ENV NEXT_PUBLIC_GIPHY_API_KEY=$NEXT_PUBLIC_GIPHY_API_KEY

# Build the app
RUN npm run build

# Stage 2: Prepare production dependencies
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json bun.lock* ./
# Install ONLY production dependencies
RUN npm install --production --ignore-scripts && \
    npm cache clean --force

# Stage 3: Run the application
FROM node:18-alpine AS runner

LABEL maintainer="ERPComm Team"
LABEL description="ERPComm Enterprise Chat Application - Runtime"

WORKDIR /app

ENV NODE_ENV=production

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built assets from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/next.config.ts ./next.config.ts

# Switch to non-root user
USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["npm", "start"]
