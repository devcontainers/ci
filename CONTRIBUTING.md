# Contributing

This repo contains a dev container that is intended to be used for developing the project.

As a general rule, it is recommended that you create an issue to discuss proposed changes/features before investing too much effort implementing it. For small changes/fixes, it may be easier to just create a PR and discuss it there.

## Repo Structure

The repo contains code for both a GitHub action and Azure DevOps Pipeline Task.
The code for each is contained in a separate folder.

The main folders in the repo are:

| Folder          | Description                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------- |
| `azdo-task`     | Code for the Azure DevOps Pipeline Task                                                        |
| `common`        | Common code used by both the GitHub Action and Azure DevOps Pipeline Task                      |
| `docs`          | Documentation for using the action/task                                                        |
| `github-action` | Code for the GitHub Action                                                                     |
| `github-tests`  | This folder contains various test projects that are used by the CI for GitHub and Azure DevOps |


## Workflow

The code for both the GitHub Action and Azure DevOps Pipeline Task is written in TypeScript. To ensure that the code compiles locally, run `./scripts/build-local.sh` from the root of the repo.

The intention is for the GitHub action and Azure DevOps task to maintain feature parity as far as possible. As a general rule, and changes should be implemented in both the GitHub action and the Azure DevOps task.

Additionally, it is desirable to add new tests to cover any new functionality.

When a PR is created, some tests will be automatically triggered against the PR. The full suite of tests requires secrets and needs to be triggered by a maintainer.

Testing and publishing the AzDO task requires the `AZDO_TOKEN` GitHub secret to be an AzDO PAT for monacotools with Build Read & Execute, Marketplace Acquire & Manage, Extensions Read & Manage and Packing Read & Write permissions. If the corresponding account needs JIT access for Project Collection Administrators permissions, enable that and re-evaluate permissions at https://dev.azure.com/monacotools/_usersSettings/permissionsRefresh.

## Miscellaneous

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

This project is under an [MIT license](LICENSE.txt).
