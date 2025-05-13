#!/bin/bash

# Check if branch name is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <branch-name>"
  exit 1
fi

# Store branch name
BRANCH_NAME="$1"

# Reset the repository
echo "Performing git reset..."
git reset --hard
if [ $? -ne 0 ]; then
  echo "Error: Git reset failed."
  exit 1
fi

# Switch to the specified branch
echo "Switching to branch: $BRANCH_NAME"
git checkout "$BRANCH_NAME"
if [ $? -ne 0 ]; then
  echo "Error: Failed to switch to branch $BRANCH_NAME."
  exit 1
fi

# Pulling
echo "Downloading latest changes..."
git pull
if [ $? -ne 0 ]; then
  echo "Error: Git pull failed."
  exit 1
fi

# Install dependencies with pnpm
echo "Installing dependencies with pnpm..."
pnpm install
if [ $? -ne 0 ]; then
  echo "Error: pnpm install failed."
  exit 1
fi

# Start the development server with pnpm
echo "Starting the development server with pnpm..."
pnpm dev
if [ $? -ne 0 ]; then
  echo "Error: pnpm dev failed."
  exit 1
fi

echo "All tasks completed successfully!"
