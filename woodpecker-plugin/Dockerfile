# syntax=docker/dockerfile:1

# Build stage
FROM node:20-alpine AS builder

WORKDIR /build

# Copy package files
COPY common/package*.json ./common/
COPY woodpecker-plugin/package*.json ./woodpecker-plugin/

# Install dependencies
RUN cd common && npm ci && \
    cd ../woodpecker-plugin && npm ci

# Copy source files
COPY common/ ./common/
COPY woodpecker-plugin/ ./woodpecker-plugin/

# Build TypeScript
RUN cd common && npm run build && \
    cd ../woodpecker-plugin && npm run build

# Runtime stage
FROM node:20-alpine

# Install runtime dependencies
# - docker-cli: Required for docker operations
# - git: Required by devcontainer CLI for git operations
# - skopeo: Required for multi-platform image operations
# - buildx: Docker BuildX for multi-platform builds
RUN apk add --no-cache \
    docker-cli \
    docker-cli-buildx \
    git \
    skopeo \
    bash

# Install devcontainer CLI globally
# This is the official Dev Containers CLI from Microsoft
RUN npm install -g @devcontainers/cli

WORKDIR /plugin

# Copy built JavaScript from builder
# Note: common builds to ../common_lib, but we need to place it where the imports expect it
# The compiled woodpecker-plugin imports from ../../common/src/, so we copy common_lib there
COPY --from=builder /build/common_lib /plugin/common/src
COPY --from=builder /build/common/package*.json /plugin/common/
COPY --from=builder /build/woodpecker-plugin/dist /plugin/woodpecker-plugin/dist
COPY --from=builder /build/woodpecker-plugin/package*.json /plugin/woodpecker-plugin/

# Install only production dependencies
RUN cd /plugin/common && npm ci --omit=dev && \
    cd /plugin/woodpecker-plugin && npm ci --omit=dev

# Set the entrypoint to the plugin
ENTRYPOINT ["node", "/plugin/woodpecker-plugin/dist/main.js"]
