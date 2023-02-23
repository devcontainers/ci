#!/bin/bash
set -e

# Create a temporary branch
git checkout -B release-tmp

# Leave just the root-level files/folders needed for the release
find -maxdepth 1 \
	-not -name '.' \
	-not -name '..' \
	-not -name '.git' \
	-not -name action.yml \
	-not -name github-action \
	| xargs rm -rf

# Leave just the dist folder in github-action
(cd github-action && find -maxdepth 1 \
	-not -name '.' \
	-not -name '..' \
	-not -name 'dist' \
	| xargs rm -rf )


# Create a commit
git add .
git commit -m "release"

# Create and push tag for full version number for the release
git tag "$RELEASE_NAME" -f
git push origin "$RELEASE_NAME" -f

# Create a release for the current git ref using the full version number
gh release create "$RELEASE_NAME" \
	--title "Release $RELEASE_NAME" \
	--generate-notes

# Update and push short version number
git tag "$TAG_NAME" -f
git push origin "$TAG_NAME" -f
