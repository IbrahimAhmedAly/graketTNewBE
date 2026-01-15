# Stage 1 — Build the app
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build the project (Nest compiles TypeScript -> JavaScript)
RUN npm run build

# Stage 2 — Run the app
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

# Copy only what’s needed for runtime
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built files and other necessary assets from builder
COPY --from=builder /usr/src/app/dist ./dist

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Run the compiled app
CMD ["node", "dist/main.js"]

