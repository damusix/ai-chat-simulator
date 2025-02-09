#!/bin/bash

# Exit on error
set -e

CURRENT_BRANCH=$(git branch --show-current)


# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting deployment to GitHub Pages...${NC}"

# Check if client dist exists and is not empty
if [ ! -d "dist/client" ] || [ -z "$(ls -A dist/client)" ]; then
    echo -e "${RED}Error: dist/client directory is missing or empty. Run build first.${NC}"
    exit 1
fi

# Create a temporary directory
echo "Creating temporary directory..."
TEMP_DIR=$(mktemp -d)

# Copy only client dist contents to temp directory
echo "Copying client dist contents..."
cp -r dist/client/* "$TEMP_DIR"

# Switch to gh-pages branch, creating it if it doesn't exist
if git show-ref --verify --quiet refs/heads/gh-pages; then
    echo "Switching to existing gh-pages branch..."
    git checkout gh-pages
else
    echo "Creating gh-pages branch..."
    git checkout --orphan gh-pages
fi

# Remove existing files (except .git)
echo "Cleaning existing files..."
git rm -rf .
git clean -fxd

# Copy the contents back from temp directory
echo "Copying new files..."
cp -r "$TEMP_DIR"/* .

# Add all files
echo "Adding files to git..."
git add .

# Commit
echo "Committing changes..."
git commit -m "Deploy to GitHub Pages: $(date)"

# Push
echo "Pushing to GitHub..."
git push origin gh-pages

# Clean up
echo "Cleaning up..."
rm -rf "$TEMP_DIR"

# Switch back to previous branch
echo "Switching back to previous branch..."
git checkout "$CURRENT_BRANCH"

echo -e "${GREEN}✨ Deployment complete!${NC}"