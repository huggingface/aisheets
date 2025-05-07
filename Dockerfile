# Use Debian-based Node.js image as the base for building
FROM node:slim AS build

# Set the working directory
WORKDIR /usr/src/app

# Install dependencies and SQLite
RUN apt-get update && apt-get install -y --no-install-recommends \
    sqlite3 \
    libsqlite3-dev \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm globally
RUN npm install -g pnpm

# Verify installation
RUN pnpm --version

# Copy package.json and lock file
COPY ./package.json ./
COPY ./pnpm-lock.yaml ./

# Install dependencies with pnpm
RUN pnpm install --frozen-lockfile 

# Copy the rest of the source code
COPY ./ ./

# Build the project
RUN pnpm build

# Use a Debian-based Node.js image for production
FROM node:slim AS production

# Set the working directory
WORKDIR /usr/src/app

# Copy the built application from the build stage
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/server ./server
COPY --from=build /usr/src/app/dist ./dist

ENV PLAYWRIGHT_BROWSERS_PATH=/home/node/ms-playwright

# COPY --from=build /usr/src/app/.env ./
RUN npm exec playwright install-deps \
    && npm exec playwright install chromium --only-shell

# Expose the application port
EXPOSE 3000

# Start the application
CMD [ "node", "server/entry.express" ]
