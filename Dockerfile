# Intermediate docker image to build the bundle in and install dependencies
FROM node:20-alpine AS build

# Set the working directory to /usr/src/app
WORKDIR /usr/src/app

# Install dependencies and SQLite
RUN apk add --no-cache \
    sqlite \
    sqlite-dev \
    build-base \
    python3

# Install pnpm globally
RUN npm install -g pnpm

# Verify installation
RUN pnpm --version


# Copy the package.json and pnpm-lock.yaml over in the intermedate "build" image
COPY ./package.json ./
COPY ./pnpm-lock.yaml ./

# Install the dependencies
# Clean install because we want to install the exact versions
RUN pnpm install --frozen-lockfile

# Copy the source code into the build image
COPY ./ ./

# Build the project
RUN pnpm build

# Pull the same Node image and use it as the final (production image)
FROM node:20-alpine AS production

# Set the working directory to /usr/src/app
WORKDIR /usr/src/app

# Only copy the results from the build over to the final image
# We do this to keep the final image as small as possible
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/server ./server
COPY --from=build /usr/src/app/dist ./dist
# COPY --from=build /usr/src/app/.env ./

# Expose port 3000 (default port)
EXPOSE 3000

# Start the application
CMD [ "node", "server/entry.express"]
