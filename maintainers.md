# Maintainers

This document is targetted at maintainers of the project.

## PR Comment bot commands

**Notes**
- these commands are not immediate - you need to wait for the GitHub action that performs the task to start up.
- builds triggered via these commands will use the workflow definitions from `main`. To test workflow changes before merging to `main`, push the changes to a branch in the repo and use the `ci_branch` workflow.

These commands can only be run when commented by a user who is identified as a repo collaborator (see [granting access to run commands](#granting-access-to-run-commands))

### `/help`

This command will cause the pr-comment-bot to respond with a comment listing the available commands.

### `/test [<sha>]`

This command runs the build, deploy, and smoke tests for a PR.

For PRs from maintainers (i.e. users with write access to microsoft/AzureTRE), `/test` is sufficient.

For other PRs, the checks below should be carried out. Once satisfied that the PR is safe to run tests against, you should use `/test <sha>` where `<sha>` is the SHA for the commit that you have verified.
You can use the full or short form of the SHA, but it must be at least 7 characters (GitHub UI shows 7 characters).

**IMPORTANT**

This command works on PRs from forks, and makes the deployment secrets available.
Before running tests on a PR, ensure that there are no changes in the PR that could have unintended consequences (e.g. leak secrets or perform undesirable operations in the testing subscription).

Check for changes to anything that is run during the build/deploy/test cycle, including:
- modifications to workflows (including adding new actions or changing versions of existing actions)
- modifications to scripts
- new packages being installed

### `/test-force-approve`

This command skips running tests for a build and marks the checks as completed.
This is intended to be used in scenarios where running the tests for a PR doesn't add value (for example, changing a workflow file that is always pulled from the default branch).

## Granting access to run commands

Currently, the GitHub API to determine whether a user is a collaborator doesn't seem to respect permissions that a user is granted via a group. As a result, users need to be directly granted `write` permission in the repo to be able to run the comment bot commands.

## Implementation notes

The pr-bot workflow is in `.github/workflows/pr-bot.yml`. Most of the logic for handling commands is split out into `.github/scripts/build.js` and there are accompanying tests in the same folder (`yarn install && yarn test` to run tests).

The `build.js` script parses the comment text and sets various output values that are then used to control the behaviour of the remaining workflow. The core of the workflow is in `ci_common.yml` and is re-used between the pr-bot and `ci_main.yml` (triggered for merges into `main` to make a release).
