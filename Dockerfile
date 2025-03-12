# Use Debian-based Node.js image as the base for building
FROM node:20-slim AS build

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
FROM node:20-slim AS production

# Set the working directory
WORKDIR /usr/src/app

# Copy the built application from the build stage
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/server ./server
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/db ./db
COPY --from=build /usr/src/app/.sequelizerc ./

# COPY --from=build /usr/src/app/.env ./

# Expose the application port
EXPOSE 3000

VOLUME /usr/src/app/data

# Start the application
CMD "/bin/bash -c 'node node_modules/sequelize-cli/lib/sequelize db:migrate --env production && node server/entry.express.js'"
