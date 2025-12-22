# Forgejo Actions Placeholder

This directory exists to prevent Forgejo from falling back to GitHub Actions workflows.

## Why is this directory empty?

This project uses **Woodpecker CI** (configured in `.woodpecker.yml`), not Forgejo Actions.

When Forgejo detects this directory, it will **not** attempt to use any GitHub Actions workflows that might exist in `.github/workflows/`. Without this directory, Forgejo would try to execute GitHub Actions as a fallback, which is not desired for this project.

## Note

- **DO NOT DELETE** this directory unless you want to enable GitHub Actions fallback behavior
- If you want to use Forgejo Actions in the future, place workflow files in `.forgejo/workflows/`
- Current CI system: Woodpecker CI (see `.woodpecker.yml`)
