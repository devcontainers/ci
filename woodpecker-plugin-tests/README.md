# Woodpecker Plugin Tests

This directory contains integration test scenarios for the woodpecker-plugin.

## Test Scenarios

### `simple-node/`
Basic DevContainer using a pre-built image from Docker Hub.
- Tests: Image-based DevContainer, basic commands

### `with-dockerfile/`
DevContainer with a custom Dockerfile.
- Tests: Dockerfile-based builds, custom package installation

### `with-features/`
DevContainer with features and build arguments.
- Tests: Dockerfile with build args (VARIANT, WELCOME_MESSAGE), DevContainer features (git, python), postCreateCommand

## Running Tests

Tests are executed in the main `.woodpecker.yml` pipeline:
1. Plugin builds the DevContainer image for each scenario
2. Commands are executed inside the built DevContainer
3. Results verify plugin functionality
