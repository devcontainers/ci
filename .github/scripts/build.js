//
// This file contains functions that are used in GitHub workflows
// (e.g. to implement the pr-bot for running tests
// There are tests for this code in build.test.js
// These tests can be run from the dev container using `yarn test` or `yarn test-watch`
//
async function getCommandFromComment({ core, context, github }) {
  const commentUsername = context.payload.comment.user.login;
  const repoFullName = context.payload.repository.full_name;
  const repoParts = repoFullName.split("/");
  const repoOwner = repoParts[0];
  const repoName = repoParts[1];
  const prNumber = context.payload.issue.number;
  const commentLink = context.payload.comment.html_url;
  const runId = context.runId;
  const prAuthorUsername = context.payload.issue.user.login;

  // Determine PR ref
  const pr = (await github.rest.pulls.get({ owner: repoOwner, repo: repoName, pull_number: prNumber })).data;
  logAndSetOutput(core, "prNumber", prNumber);
  const potentialMergeCommit = pr.merge_commit_sha;
  logAndSetOutput(core, "prRef", potentialMergeCommit);

  const prHeadSha = pr.head.sha;
  logAndSetOutput(core, "prHeadSha", prHeadSha);

  const gotNonDocChanges = await prContainsNonDocChanges(github, repoOwner, repoName, prNumber);
  logAndSetOutput(core, "nonDocsChanges", gotNonDocChanges.toString());

  //
  // Determine what action to take
  // Only use the first line of the comment to allow remainder of the body for other comments/notes
  //
  const commentBody = context.payload.comment.body;
  const commentFirstLine = commentBody.split("\n")[0];
  let command = "none";
  const trimmedFirstLine = commentFirstLine.trim();
  if (trimmedFirstLine[0] === "/") {
    // only allow actions for users with write access
    if (!await userHasWriteAccessToRepo({ core, github }, commentUsername, repoOwner, repoName)) {
      core.notice("Command: none - user doesn't have write permission]");
      await github.rest.issues.createComment({
        owner: repoOwner,
        repo: repoName,
        issue_number: prNumber,
        body: `Sorry, @${commentUsername}, only users with write access to the repo can run pr-bot commands.`
      });
      logAndSetOutput(core, "command", "none");
      return "none";
    }

    const parts = trimmedFirstLine.split(' ').filter(p => p !== '');
    const commandText = parts[0];
    switch (commandText) {
      case "/test":
        {
          // Docs only changes don't run tests with secrets so don't require the check for
          // whether a SHA needs to be supplied
          if (!gotNonDocChanges) {
            command = "test-force-approve";
            const message = `:white_check_mark: PR only contains docs changes - marking tests as complete`;
            await addActionComment({ github }, repoOwner, repoName, prNumber, commentUsername, commentLink, message);
            break;
          }

          const runTests = await handleTestCommand({ core, github }, parts, "tests", runId, { number: prNumber, authorUsername: prAuthorUsername, repoOwner, repoName, headSha: prHeadSha, details: pr }, { username: commentUsername, link: commentLink });
          if (runTests) {
            command = "run-tests";
          }
          break;
        }

		case "/test-force-approve":
        {
          command = "test-force-approve";
          const message = `:white_check_mark: Marking tests as complete (for commit ${prHeadSha})`;
          await addActionComment({ github }, repoOwner, repoName, prNumber, commentUsername, commentLink, message);
          break;
        }

      case "/help":
        showHelp({ github }, repoOwner, repoName, prNumber, commentUsername, commentLink, null);
        command = "none"; // command has been handled, so don't need to return a value for future steps
        break;

      default:
        core.warning(`'${commandText}' not recognised as a valid command`);
        await showHelp({ github }, repoOwner, repoName, prNumber, commentUsername, commentLink, commandText);
        command = "none";
        break;
    }
  }
  logAndSetOutput(core, "command", command);
  return command;
}

async function handleTestCommand({ core, github }, commandParts, testDescription, runId, pr, comment) {

  if (!pr.details.mergeable) {
    // Since we use the potential merge commit as the ref to checkout, we can only run if there is such a commit
    // If the PR isn't mergeable, add a comment indicating that the merge issue needs addressing
    const message = `:warning: Cannot run tests as PR is not mergeable. Ensure that the PR is open and doesn't have any conflicts.`;
    await addActionComment({ github }, pr.repoOwner, pr.repoName, pr.number, comment.username, comment.link, message);
    return false;
  }

  // check if this is an external PR (i.e. author not a maintainer)
  // if so, need to specify the SHA that has been vetted and check that it matches
  // the latest head SHA for the PR
  const command = commandParts[0]
  const prAuthorHasWriteAccess = await userHasWriteAccessToRepo({ core, github }, pr.authorUsername, pr.repoOwner, pr.repoName);
  const externalPr = !prAuthorHasWriteAccess;
  if (externalPr) {
    if (commandParts.length === 1) {
      const message = `:warning: When using \`${command}\` on external PRs, the SHA of the checked commit must be specified`;
      await addActionComment({ github }, pr.repoOwner, pr.repoName, pr.number, comment.username, comment.link, message);
      return false;
    }
    const commentSha = commandParts[1];
    if (commentSha.length < 7) {
      const message = `:warning: When specifying a commit SHA it must be at least 7 characters (received \`${commentSha}\`)`;
      await addActionComment({ github }, pr.repoOwner, pr.repoName, pr.number, comment.username, comment.link, message);
      return false;
    }
    if (!pr.headSha.startsWith(commentSha)) {
      const message = `:warning: The specified SHA \`${commentSha}\` is not the latest commit on the PR. Please validate the latest commit and re-run \`/test\``;
      await addActionComment({ github }, pr.repoOwner, pr.repoName, pr.number, comment.username, comment.link, message);
      return false;
    }
  }

  const message = `:runner: Running ${testDescription}: https://github.com/${pr.repoOwner}/${pr.repoName}/actions/runs/${runId}`;
  await addActionComment({ github }, pr.repoOwner, pr.repoName, pr.number, comment.username, comment.link, message);
  return true

}

async function prContainsNonDocChanges(github, repoOwner, repoName, prNumber) {
  const prFilesResponse = await github.paginate(github.rest.pulls.listFiles, {
    owner: repoOwner,
    repo: repoName,
    pull_number: prNumber
  });
  const prFiles = prFilesResponse.map(file => file.filename);
  // Regexes describing allowed filenames
  // If a filename matches any regex in the array then it is considered a doc
  // Currently, match all `.md` files and `mkdocs.yml` in the root
  const docsRegexes = [/\.md$/, /^docs\/.*$/];
  const gotNonDocChanges = prFiles.some(file => docsRegexes.every(regex => !regex.test(file)));
  return gotNonDocChanges;
}

async function labelAsExternalIfAuthorDoesNotHaveWriteAccess({ core, context, github }) {
  const username = context.payload.pull_request.user.login;
  const owner = context.repo.owner;
  const repo = context.repo.repo;

  if (!await userHasWriteAccessToRepo({ core, github }, username, owner, repo)) {
    core.info("Adding external label to PR " + context.payload.pull_request.number)
    await github.rest.issues.addLabels({
      owner,
      repo,
      issue_number: context.payload.pull_request.number,
      labels: ['external']
    });
  }
}

async function userHasWriteAccessToRepo({ core, github }, username, repoOwner, repoName) {
  // Previously, we attempted to use github.event.comment.author_association to check for OWNER or COLLABORATOR
  // Unfortunately, that always shows MEMBER if you are in the microsoft org and have that set to publicly visible
  // (Can check via https://github.com/orgs/microsoft/people?query=<username>)

  // https://docs.github.com/en/rest/reference/collaborators#check-if-a-user-is-a-repository-collaborator
  let userHasWriteAccess = false;
  try {
    core.info(`Checking if user "${username}" has write access to ${repoOwner}/${repoName} ...`)
    const result = await github.request('GET /repos/{owner}/{repo}/collaborators/{username}', {
      owner: repoOwner,
      repo: repoName,
      username
    });
    userHasWriteAccess = result.status === 204;
  } catch (err) {
    if (err.status === 404) {
      core.info("User not found in collaborators");
    } else {
      core.error(`Error checking if user has write access: ${err.status} (${err.response.data.message}) `)
    }
  }
  core.info("User has write access: " + userHasWriteAccess);
  return userHasWriteAccess
}

async function showHelp({ github }, repoOwner, repoName, prNumber, commentUser, commentLink, invalidCommand) {
  const leadingContent = invalidCommand ? `\`${invalidCommand}\` is not recognised as a valid command.` : "Hello!";

  const body = `${leadingContent}

You can use the following commands:
&nbsp;&nbsp;&nbsp;&nbsp;/test - build, deploy and run smoke tests on a PR
&nbsp;&nbsp;&nbsp;&nbsp;/test-force-approve - force approval of the PR tests (i.e. skip the deployment checks)
&nbsp;&nbsp;&nbsp;&nbsp;/help - show this help`;

  await addActionComment({ github }, repoOwner, repoName, prNumber, commentUser, commentLink, body);

}
async function addActionComment({ github }, repoOwner, repoName, prNumber, commentUser, commentLink, message) {

  const body = `:robot: pr-bot :robot:

${message}

(in response to [this comment](${commentLink}) from @${commentUser})
`;

  await github.rest.issues.createComment({
    owner: repoOwner,
    repo: repoName,
    issue_number: prNumber,
    body: body
  });

}

function logAndSetOutput(core, name, value) {
  core.info(`Setting output '${name}: ${value}`);
  core.setOutput(name, value);
}

module.exports = {
  getCommandFromComment,
  labelAsExternalIfAuthorDoesNotHaveWriteAccess
}
