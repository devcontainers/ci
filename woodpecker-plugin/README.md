# Dev Container Build and Run - Woodpecker CI Plugin

A [Woodpecker CI](https://woodpecker-ci.org) plugin that enables building and running [Dev Containers](https://containers.dev) in your CI pipelines.

## Overview

This plugin allows you to:

- **Build** Dev Container images with full support for features, lifecycle scripts, and customizations
- **Run** commands inside Dev Containers for testing, building, and other CI tasks
- **Cache** Dev Container builds for faster pipeline execution
- **Push** images to container registries (Docker Hub, GHCR, etc.)
- **Multi-platform** builds (amd64, arm64, etc.) with automatic image management

## Quick Start

### Basic Usage

Run tests in your Dev Container:

```yaml
# .woodpecker.yml
steps:
  - name: test
    image: ghcr.io/devcontainers/ci-woodpecker:latest
    settings:
      run_cmd: npm test
```

### Build and Push

Build and push your Dev Container image:

```yaml
steps:
  - name: docker-login
    image: docker:latest
    commands:
      - echo "$DOCKER_PASSWORD" | docker login ghcr.io -u "$DOCKER_USERNAME" --password-stdin
    secrets:
      - docker_username
      - docker_password

  - name: build-devcontainer
    image: ghcr.io/devcontainers/ci-woodpecker:latest
    settings:
      image_name: ghcr.io/${CI_REPO_OWNER}/${CI_REPO_NAME}
      image_tag: ${CI_COMMIT_SHA}
      push: filter
      ref_filter_for_push: refs/heads/main
      run_cmd: npm test
```

## Configuration

### Settings

All settings are passed as `PLUGIN_*` environment variables by Woodpecker.

#### Image Settings

- **`image_name`** (optional): Full image name including registry (e.g., `ghcr.io/user/repo`)
- **`image_tag`** (optional, default: `latest`): Comma-separated list of tags (e.g., `latest,1.0.0`)
- **`platform`** (optional): Comma-separated platforms (e.g., `linux/amd64,linux/arm64`)

#### Build Settings

- **`sub_folder`** (optional, default: `.`): Subfolder containing `.devcontainer/`
- **`config_file`** (optional): Custom path to `devcontainer.json`
- **`checkout_path`** (optional, default: `$CI_WORKSPACE`): Repository checkout path

#### Execution Settings

- **`run_cmd`** (optional): Command to execute in the container (e.g., `npm test`)
- **`env`** (optional): Environment variables (JSON array or comma-separated)
- **`inherit_env`** (optional, default: `false`): Inherit all runner environment variables

#### Push Settings

- **`push`** (optional, default: `filter`): When to push images
  - `never`: Never push
  - `filter`: Push only when filters match
  - `always`: Always push
- **`ref_filter_for_push`** (optional): Comma-separated refs (e.g., `refs/heads/main`)
- **`event_filter_for_push`** (optional, default: `push`): Comma-separated events

#### Cache Settings

- **`cache_from`** (optional): Additional cache sources (JSON array or comma-separated)
- **`cache_to`** (optional): Cache destinations (JSON array or comma-separated)
- **`no_cache`** (optional, default: `false`): Disable build cache

#### Advanced Settings

- **`skip_container_user_id_update`** (optional, default: `false`): Skip UID/GID alignment
- **`user_data_folder`** (optional): Folder for build artifacts (useful with cache plugins)
- **`mounts`** (optional): Additional container mounts (JSON array or comma-separated)

## Examples

### Example 1: Simple Test Run

```yaml
steps:
  - name: test
    image: ghcr.io/devcontainers/ci-woodpecker:latest
    settings:
      run_cmd: |
        npm install
        npm test
```

### Example 2: Multi-Stage Pipeline

```yaml
steps:
  - name: lint
    image: ghcr.io/devcontainers/ci-woodpecker:latest
    settings:
      run_cmd: npm run lint

  - name: test
    image: ghcr.io/devcontainers/ci-woodpecker:latest
    settings:
      run_cmd: npm test

  - name: build
    image: ghcr.io/devcontainers/ci-woodpecker:latest
    settings:
      run_cmd: npm run build
```

### Example 3: Build, Test, and Push

```yaml
when:
  event: [push, tag]

steps:
  - name: docker-login
    image: docker:latest
    when:
      branch: main
      event: push
    commands:
      - echo "$DOCKER_PASSWORD" | docker login ghcr.io -u "$DOCKER_USERNAME" --password-stdin
    secrets:
      - docker_username
      - docker_password

  - name: build-and-test
    image: ghcr.io/devcontainers/ci-woodpecker:latest
    settings:
      image_name: ghcr.io/${CI_REPO_OWNER}/${CI_REPO_NAME}
      image_tag: ${CI_COMMIT_SHA},latest
      run_cmd: npm test
      push: filter
      ref_filter_for_push: refs/heads/main
      event_filter_for_push: push
```

### Example 4: Multi-Platform Build

```yaml
steps:
  - name: docker-login
    image: docker:latest
    commands:
      - echo "$DOCKER_PASSWORD" | docker login ghcr.io -u "$DOCKER_USERNAME" --password-stdin
    secrets:
      - docker_username
      - docker_password

  - name: build-multiplatform
    image: ghcr.io/devcontainers/ci-woodpecker:latest
    settings:
      image_name: ghcr.io/${CI_REPO_OWNER}/${CI_REPO_NAME}
      image_tag: ${CI_COMMIT_SHA}
      platform: linux/amd64,linux/arm64
      push: always
```

### Example 5: Custom Dev Container Location

```yaml
steps:
  - name: build-custom
    image: ghcr.io/devcontainers/ci-woodpecker:latest
    settings:
      sub_folder: services/api
      config_file: services/api/.devcontainer/devcontainer.json
      run_cmd: go test ./...
```

### Example 6: With Caching

```yaml
steps:
  - name: build-with-cache
    image: ghcr.io/devcontainers/ci-woodpecker:latest
    settings:
      image_name: ghcr.io/${CI_REPO_OWNER}/${CI_REPO_NAME}
      image_tag: ${CI_COMMIT_SHA}
      cache_from:
        - ghcr.io/${CI_REPO_OWNER}/${CI_REPO_NAME}:latest
        - ghcr.io/${CI_REPO_OWNER}/${CI_REPO_NAME}:cache
      cache_to:
        - type=registry,ref=ghcr.io/${CI_REPO_OWNER}/${CI_REPO_NAME}:cache
      run_cmd: npm test
```

### Example 7: Environment Variables

```yaml
steps:
  - name: build-with-env
    image: ghcr.io/devcontainers/ci-woodpecker:latest
    settings:
      run_cmd: npm run build
      env:
        - NODE_ENV=production
        - API_URL=https://api.example.com
        - BUILD_VERSION=${CI_COMMIT_TAG}
```

## Building the Plugin

### Build Prerequisites

- Node.js 20+
- Docker with BuildX support
- TypeScript

### Development

```bash
# Install dependencies
cd common && npm install
cd ../woodpecker-plugin && npm install

# Build TypeScript
cd ../common && npm run build
cd ../woodpecker-plugin && npm run build

# Build Docker image
docker build -f woodpecker-plugin/Dockerfile -t devcontainer-woodpecker:local .

# Test locally
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v $(pwd):/workspace \
  -e PLUGIN_RUN_CMD="echo 'Hello from Dev Container'" \
  -e CI_WORKSPACE=/workspace \
  devcontainer-woodpecker:local
```

### Multi-Architecture Build

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -f woodpecker-plugin/Dockerfile \
  -t ghcr.io/devcontainers/ci-woodpecker:latest \
  --push \
  .
```

## How It Works

1. **Plugin Initialization**: The plugin parses `PLUGIN_*` environment variables set by Woodpecker
2. **Prerequisites Check**: Verifies Docker BuildX and installs `@devcontainers/cli`
3. **Build Phase**: Builds the Dev Container image using the devcontainer.json configuration
4. **Run Phase** (optional): Starts the container and executes the specified command
5. **Push Phase** (optional): Pushes the built image to the registry based on filter settings

## Troubleshooting

### Docker Socket Permission Denied

Ensure your Woodpecker runner has access to the Docker socket:

```yaml
# In your Woodpecker server configuration
services:
  woodpecker-agent:
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

### Multi-Platform Build Fails

Ensure your runner has:

- Docker BuildX installed and enabled
- QEMU configured for cross-platform builds

```bash
docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
```

### Image Push Authentication

Make sure to run `docker login` before pushing:

```yaml
steps:
  - name: docker-login
    image: docker:latest
    commands:
      - echo "$PASSWORD" | docker login registry.example.com -u "$USERNAME" --password-stdin
    secrets: [username, password]
```

## Testing

### Unit Tests

Run the unit tests for the environment parser:

```bash
cd woodpecker-plugin
npm install
npm test
```

The test suite includes 18 tests covering all configuration parsing scenarios.

### Integration Testing with Local Woodpecker CI

This plugin includes a complete local testing environment using Docker Compose with Forgejo (Git forge) and Woodpecker CI.

#### Test Prerequisites

- Docker and Docker Compose
- Free ports: 3000 (Forgejo), 8000 (Woodpecker UI), 9000 (Woodpecker gRPC), 2222 (Forgejo SSH)
- Admin access to modify `/etc/hosts` (for hostname resolution)

#### Setup Steps

1. **Add hostname to /etc/hosts**:

   For the OAuth flow to work correctly, add `forgejo` to your hosts file:

   ```bash
   sudo sh -c 'echo "127.0.0.1 forgejo" >> /etc/hosts'
   ```

   This allows your browser to resolve `forgejo:3000` while Docker containers use their internal DNS.

1. **Start the services**:

   ```bash
   cd woodpecker-plugin
   docker compose -f docker-compose.test.yml up -d
   ```

   This starts three services:

   - `forgejo`: Git forge on <http://forgejo:3000>
   - `woodpecker-server`: CI server on <http://localhost:8000>
   - `woodpecker-agent`: CI agent that executes pipelines

1. **Configure Forgejo** (first time only):

   - Open <http://forgejo:3000>
   - Complete the initial Forgejo setup
   - Create a user account (username: `test` recommended)
   - Create a test repository (e.g., `ci-test`)

1. **Create OAuth Application in Forgejo**:

   - Go to Settings → Applications → Manage OAuth2 Applications
   - Click "Create a new OAuth2 Application"
   - Application Name: `Woodpecker CI`
   - Redirect URI: `http://localhost:8000/authorize`
   - Click "Create Application"
   - Copy the **Client ID** and **Client Secret**

1. **Update Woodpecker Configuration**:

   Create a `.env` file from the example and set the OAuth credentials:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and update the credentials:

   ```bash
   WOODPECKER_GITEA_CLIENT=<your-client-id>
   WOODPECKER_GITEA_SECRET=<your-client-secret>
   WOODPECKER_AGENT_SECRET=test-secret-123
   ```

1. **Restart Woodpecker**:

   ```bash
   docker compose -f docker-compose.test.yml down
   docker compose -f docker-compose.test.yml up -d
   ```

   **Important**: Use `down` without the `-v` flag to preserve Forgejo data.

1. **Login to Woodpecker**:

   - Open <http://localhost:8000>
   - Click "Login with Forgejo"
   - You will be redirected to <http://forgejo:3000> for authorization
   - Authorize the application
   - Your repositories should appear in Woodpecker

1. **Activate Repository and Enable Trusted Mode**:

   - In Woodpecker UI, find your test repository
   - Click to activate it
   - This sets up the webhook in Forgejo
   - Click on the repository, then click "Settings" (gear icon)
   - Scroll down to the "Trusted" section
   - Enable "Volumes" to allow the plugin to mount volumes
   - **Note**: This option is only visible to server admins (user "test" is configured as admin)
   - Without trusted mode, steps using volumes will fail with "Insufficient trust level"

1. **Push Test Code**:

   Create a `.woodpecker.yml` in your repository:

   ```yaml
   when:
     event: [push, pull_request, manual]

   steps:
     - name: test
       image: ghcr.io/devcontainers/ci-woodpecker:latest
       settings:
         run_cmd: echo "Hello from Woodpecker!"
   ```

   Add the Forgejo remote and push:

   ```bash
   git remote add forgejo http://forgejo:3000/test/ci-test.git
   git push forgejo main
   ```

1. **Verify Pipeline Execution**:

   - Go to <http://localhost:8000>
   - Select your repository
   - You should see the pipeline running
   - Click on it to view logs and status

#### Common Issues

**Browser cannot resolve "forgejo:3000"**:

- Make sure you added `127.0.0.1 forgejo` to your `/etc/hosts` file
- Verify with: `ping forgejo` (should respond from 127.0.0.1)

**OAuth Error "Client ID not registered"**:

- Make sure OAuth credentials are correctly set in `docker-compose.test.yml`
- Restart services with `docker compose down && docker compose up -d` (without `-v`)

**Pipeline Clone Error "Could not resolve host: forgejo"**:

- Ensure `WOODPECKER_BACKEND_DOCKER_NETWORK=woodpecker-plugin_default` is set in agent environment
- This allows pipeline containers to resolve the Forgejo hostname

**Agent Not Connecting**:

- Check agent logs: `docker compose -f docker-compose.test.yml logs woodpecker-agent`
- Verify `WOODPECKER_AGENT_SECRET` matches between server and agent

**Permission Errors**:

- The agent needs access to Docker socket: `/var/run/docker.sock:/var/run/docker.sock`
- Agent runs with `privileged: true` for Docker-in-Docker operations

#### Cleanup

To stop and remove all services:

```bash
docker compose -f docker-compose.test.yml down
```

To also remove all data (Forgejo repositories, Woodpecker pipelines):

```bash
docker compose -f docker-compose.test.yml down -v
```

**Warning**: The `-v` flag deletes all volumes, requiring complete reconfiguration.

To remove the hostname entry from `/etc/hosts`:

```bash
sudo sed -i '' '/^127.0.0.1 forgejo$/d' /etc/hosts
```

## Contributing

Contributions are welcome! Please see the main [devcontainers/ci](https://github.com/devcontainers/ci) repository.

## License

MIT - See LICENSE file in the repository root.

## Resources

- [Dev Containers Specification](https://containers.dev)
- [Woodpecker CI Documentation](https://woodpecker-ci.org/docs)
- [devcontainers/cli](https://github.com/devcontainers/cli)
- [Main Repository](https://github.com/devcontainers/ci)
