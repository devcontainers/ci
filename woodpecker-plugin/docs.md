---
name: Dev Container Build and Run
icon: https://raw.githubusercontent.com/devcontainers/ci/main/docs/images/devcontainer-icon.svg
description: Build and run Dev Containers (https://containers.dev) in Woodpecker CI pipelines
author: devcontainers
tags: [docker, devcontainer, build, container]
containerImage: ghcr.io/devcontainers/ci-woodpecker
containerImageUrl: https://github.com/devcontainers/ci/pkgs/container/ci-woodpecker
url: https://github.com/devcontainers/ci
---

# Dev Container Build and Run Plugin

This Woodpecker CI plugin enables you to build and run [Dev Containers](https://containers.dev) in your CI pipelines. Dev Containers provide a consistent, reproducible development environment defined as code, making it easy to ensure your CI environment matches your local development setup.

## Features

- Build Dev Container images with full feature support
- Run commands inside Dev Containers for CI/CD workflows
- Pre-build and cache Dev Container images
- Push images to container registries
- Support for multi-platform builds (amd64, arm64, etc.)
- Automatic cache management for faster builds

## Settings

| Setting | Required | Default | Description |
|---------|----------|---------|-------------|
| `image_name` | No | - | Image name (including registry, e.g., `ghcr.io/user/repo`) |
| `image_tag` | No | `latest` | One or more comma-separated image tags |
| `platform` | No | - | Platforms for which the image should be built (comma-separated, e.g., `linux/amd64,linux/arm64`) |
| `run_cmd` | No | - | Command to run after building the dev container image |
| `sub_folder` | No | `.` | Child folder containing `.devcontainer` (relative to repository root) |
| `config_file` | No | - | Path to devcontainer.json file (instead of default location) |
| `checkout_path` | No | `$CI_WORKSPACE` | Path to checked out repository |
| `push` | No | `filter` | Control when images are pushed: `never`, `filter`, or `always` |
| `ref_filter_for_push` | No | - | Comma-separated refs allowed to push (e.g., `refs/heads/main,refs/heads/develop`) |
| `event_filter_for_push` | No | `push` | Comma-separated events allowed to push (e.g., `push,tag`) |
| `env` | No | - | Environment variables to pass to the container (JSON array or comma-separated) |
| `inherit_env` | No | `false` | Inherit all environment variables from the runner |
| `skip_container_user_id_update` | No | `false` | Skip updating container user UID/GID to match host |
| `user_data_folder` | No | - | Folder for build files (for caching with cache plugins) |
| `cache_from` | No | - | Additional images to use for build caching (JSON array or comma-separated) |
| `no_cache` | No | `false` | Build with `--no-cache` (takes precedence over `cache_from`) |
| `cache_to` | No | - | Image cache destinations (JSON array or comma-separated) |
| `mounts` | No | - | Additional mounts for the container (JSON array or comma-separated) |

## Examples

### Basic: Build and test in Dev Container

```yaml
steps:
  - name: build-and-test
    image: ghcr.io/devcontainers/ci-woodpecker:latest
    settings:
      run_cmd: npm test
```

### Build and push image

```yaml
steps:
  - name: build-devcontainer
    image: ghcr.io/devcontainers/ci-woodpecker:latest
    settings:
      image_name: ghcr.io/${CI_REPO}
      image_tag: ${CI_COMMIT_SHA}
      push: filter
      ref_filter_for_push: refs/heads/main
    secrets:
      - docker_username
      - docker_password
```

### Multi-platform build

```yaml
steps:
  - name: build-multiplatform
    image: ghcr.io/devcontainers/ci-woodpecker:latest
    settings:
      image_name: ghcr.io/${CI_REPO}
      image_tag: latest,${CI_COMMIT_SHA}
      platform: linux/amd64,linux/arm64
      push: always
    secrets:
      - docker_username
      - docker_password
```

### Custom devcontainer.json location

```yaml
steps:
  - name: build-custom
    image: ghcr.io/devcontainers/ci-woodpecker:latest
    settings:
      config_file: .devcontainer/custom/devcontainer.json
      run_cmd: make test
```

### With environment variables

```yaml
steps:
  - name: build-with-env
    image: ghcr.io/devcontainers/ci-woodpecker:latest
    settings:
      run_cmd: npm run build
      env:
        - NODE_ENV=production
        - API_URL=https://api.example.com
```

### Using cache for faster builds

```yaml
steps:
  - name: build-with-cache
    image: ghcr.io/devcontainers/ci-woodpecker:latest
    settings:
      image_name: ghcr.io/${CI_REPO}
      image_tag: ${CI_COMMIT_SHA}
      cache_from:
        - ghcr.io/${CI_REPO}:latest
        - ghcr.io/${CI_REPO}:cache
      cache_to:
        - ghcr.io/${CI_REPO}:cache
      run_cmd: npm test
```

## Authentication

To push images to a registry, you need to authenticate. Use Woodpecker secrets:

```yaml
steps:
  - name: docker-login
    image: docker:latest
    commands:
      - echo "$DOCKER_PASSWORD" | docker login ghcr.io -u "$DOCKER_USERNAME" --password-stdin
    secrets:
      - docker_username
      - docker_password

  - name: build-and-push
    image: ghcr.io/devcontainers/ci-woodpecker:latest
    settings:
      image_name: ghcr.io/${CI_REPO}
      push: always
```

## Requirements

- Woodpecker CI runner with Docker support
- Docker BuildX enabled on the runner
- For multi-platform builds: skopeo installed (included in plugin image)

## Notes

- The plugin automatically passes Woodpecker CI environment variables (prefixed with `CI_` and `WOODPECKER_`) to the container
- Docker socket is automatically mounted by Woodpecker (when using Docker runner)
- For multi-platform builds, images are saved to an OCI archive and then copied with skopeo

## Support

- Documentation: <https://github.com/devcontainers/ci>
- Issues: <https://github.com/devcontainers/ci/issues>
- Dev Containers Specification: <https://containers.dev>
