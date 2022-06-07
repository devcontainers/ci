const { getCommandFromComment, labelAsExternalIfAuthorDoesNotHaveWriteAccess } = require('./build.js')
const { createGitHubContext, PR_NUMBER, outputFor, toHaveComment } = require('./test-helpers.js')

expect.extend({
  toHaveComment
})


describe('getCommandFromComment', () => {

  var github;
  var core;
  var mockCoreSetOutput;
  var mockGithubRestIssuesCreateComment;
  beforeEach(() => {
    ({ core, github, mockCoreSetOutput, mockGithubRestIssuesCreateComment } = createGitHubContext());
  });

  function createCommentContext({ username, pullRequestNumber, body, authorUsername }) {
    if (!username) {
      username = 'admin'; // most tests will assume admin (i.e. user can run commands)
    }
    if (!authorUsername) {
      authorUsername = 'admin'; // most tests will assume admin (i.e. user not external)
    }
    if (!pullRequestNumber) {
      pullRequestNumber = PR_NUMBER.UPSTREAM_NON_DOCS_CHANGES;
    }
    if (!body) {
      body = "nothing to see here";
    }
    return {
      payload: {
        comment: {
          user: {
            login: username,
          },
          body,
          html_url: "https://wibble/comment-link"
        },
        issue: {
          number: pullRequestNumber,
          user: {
            login: authorUsername,
          },
        },
        repository: {
          full_name: 'someOwner/someRepo'
        },
      },
      runId: 11112222,
    };
  }

  describe('with non-contributor', () => {
    describe(`for '/test`, () => {
      test(`should return 'none'`, async () => {
        const context = createCommentContext({
          username: 'non-contributor',
          body: '/test',
        });
        const command = await getCommandFromComment({ core, context, github });
        expect(outputFor(mockCoreSetOutput, 'command')).toBe('none');
      });

      test(`should add a comment indicating that the user cannot run commands`, async () => {
        const context = createCommentContext({
          username: 'non-contributor',
          body: '/test',
          pullRequestNumber: PR_NUMBER.UPSTREAM_NON_DOCS_CHANGES,
        });
        await getCommandFromComment({ core, context, github });
        expect(mockGithubRestIssuesCreateComment).toHaveComment({
          owner: 'someOwner',
          repo: 'someRepo',
          issue_number: PR_NUMBER.UPSTREAM_NON_DOCS_CHANGES,
          bodyMatcher: /Sorry, @non-contributor, only users with write access to the repo can run pr-bot commands./
        });
      });
    });
    describe(`for 'non-command`, () => {
      test(`should return 'none'`, async () => {
        const context = createCommentContext({
          username: 'non-contributor',
          body: 'non-command',
        });
        const command = await getCommandFromComment({ core, context, github });
        expect(outputFor(mockCoreSetOutput, 'command')).toBe('none');
      });

      test(`should not add a comment`, async () => {
        const context = createCommentContext({
          username: 'non-contributor',
          body: 'non-command',
          pullRequestNumber: PR_NUMBER.UPSTREAM_NON_DOCS_CHANGES,
        });
        await getCommandFromComment({ core, context, github });
        expect(mockGithubRestIssuesCreateComment).not.toHaveBeenCalled();
      });
    });

  });

  describe('with contributor', () => {
    test(`if doesn't start with '/' should set command to 'none'`, async () => {
      const context = createCommentContext({
        username: 'admin',
        body: 'foo',
      });
      await getCommandFromComment({ core, context, github });
      expect(outputFor(mockCoreSetOutput, 'command')).toBe('none');
    });


    describe('and single line comments', () => {

      describe(`for '/test' for non-external PR with non-docs changes`, () => {
        test(`should set command to 'run-tests'`, async () => {
          const context = createCommentContext({
            username: 'admin',
            body: '/test',
            pullRequestNumber: PR_NUMBER.UPSTREAM_NON_DOCS_CHANGES,
          });
          await getCommandFromComment({ core, context, github });
          expect(outputFor(mockCoreSetOutput, 'command')).toBe('run-tests');
        });

        test(`should set nonDocsChanges to 'true'`, async () => {
          const context = createCommentContext({
            username: 'admin',
            body: '/test',
            pullRequestNumber: PR_NUMBER.UPSTREAM_NON_DOCS_CHANGES,
          });
          await getCommandFromComment({ core, context, github });
          expect(outputFor(mockCoreSetOutput, 'nonDocsChanges')).toBe('true');
        });

        test(`should add comment with run link`, async () => {
          const context = createCommentContext({
            username: 'admin',
            body: '/test',
            pullRequestNumber: PR_NUMBER.UPSTREAM_NON_DOCS_CHANGES,
          });
          await getCommandFromComment({ core, context, github });
          expect(mockGithubRestIssuesCreateComment).toHaveComment({
            owner: 'someOwner',
            repo: 'someRepo',
            issue_number: PR_NUMBER.UPSTREAM_NON_DOCS_CHANGES,
            bodyMatcher: /Running tests: https:\/\/github.com\/someOwner\/someRepo\/actions\/runs\/11112222/,
          });
        });
      });

      describe(`for '/test' for non-external PR with docs-only changes`, () => {
        test(`should set command to 'test-force-approve'`, async () => {
          const context = createCommentContext({
            username: 'admin',
            body: '/test',
            pullRequestNumber: PR_NUMBER.UPSTREAM_DOCS_ONLY_CHANGES,
          });
          await getCommandFromComment({ core, context, github });
          expect(outputFor(mockCoreSetOutput, 'command')).toBe('test-force-approve');
        });

        test(`should set nonDocsChanges to 'false'`, async () => {
          const context = createCommentContext({
            username: 'admin',
            body: '/test',
            pullRequestNumber: PR_NUMBER.UPSTREAM_DOCS_ONLY_CHANGES,
          });
          await getCommandFromComment({ core, context, github });
          expect(outputFor(mockCoreSetOutput, 'nonDocsChanges')).toBe('false');
        });

        test(`should add comment with for skipping checks`, async () => {
          const context = createCommentContext({
            username: 'admin',
            body: '/test',
            pullRequestNumber: PR_NUMBER.UPSTREAM_DOCS_ONLY_CHANGES,
          });
          await getCommandFromComment({ core, context, github });
          expect(mockGithubRestIssuesCreateComment).toHaveComment({
            owner: 'someOwner',
            repo: 'someRepo',
            issue_number: PR_NUMBER.UPSTREAM_DOCS_ONLY_CHANGES,
            bodyMatcher: /PR only contains docs changes - marking tests as complete/,
          });
        });
      });

      describe(`for '/test' for non-mergeable PR`, () => {
        test(`should set command to 'none'`, async () => {
          const context = createCommentContext({
            username: 'admin',
            body: '/test',
            pullRequestNumber: PR_NUMBER.UPSTREAM_NON_MERGEABLE,
          });
          await getCommandFromComment({ core, context, github });
          expect(outputFor(mockCoreSetOutput, 'command')).toBe('none');
        });

        test(`should add comment with for skipping checks`, async () => {
          const context = createCommentContext({
            username: 'admin',
            body: '/test',
            pullRequestNumber: PR_NUMBER.UPSTREAM_NON_MERGEABLE,
          });
          await getCommandFromComment({ core, context, github });
          expect(mockGithubRestIssuesCreateComment).toHaveComment({
            owner: 'someOwner',
            repo: 'someRepo',
            issue_number: PR_NUMBER.UPSTREAM_NON_MERGEABLE,
            bodyMatcher: /Cannot run tests as PR is not mergeable. Ensure that the PR is open and doesn't have any conflicts./,
          });
        });
      });

      describe(`for '/test' for external PR (i.e. without commit SHA specified)`, () => {
        test(`should set command to 'none'`, async () => {
          const context = createCommentContext({
            username: 'admin',
            body: '/test',
            pullRequestNumber: PR_NUMBER.FORK_NON_DOCS_CHANGES,
            authorUsername: 'non-contributor',
          });
          await getCommandFromComment({ core, context, github });
          expect(outputFor(mockCoreSetOutput, 'command')).toBe('none');
        });

        test(`should add comment with prompt to specify SHA`, async () => {
          const context = createCommentContext({
            username: 'admin',
            body: '/test',
            pullRequestNumber: PR_NUMBER.FORK_NON_DOCS_CHANGES,
            authorUsername: 'non-contributor',
          });
          await getCommandFromComment({ core, context, github });
          expect(mockGithubRestIssuesCreateComment).toHaveComment({
            owner: 'someOwner',
            repo: 'someRepo',
            issue_number: PR_NUMBER.FORK_NON_DOCS_CHANGES,
            bodyMatcher: /When using `\/test` on external PRs, the SHA of the checked commit must be specified/,
          });
        });
      });

      describe(`for '/test 00000000' for external PR (i.e. with non-latest commit SHA specified)`, () => {
        test(`should set command to 'none'`, async () => {
          const context = createCommentContext({
            username: 'admin',
            body: '/test 00000000',
            pullRequestNumber: PR_NUMBER.FORK_NON_DOCS_CHANGES,
            authorUsername: 'non-contributor',
          });
          await getCommandFromComment({ core, context, github });
          expect(outputFor(mockCoreSetOutput, 'command')).toBe('none');
        });

        test(`should add comment with prompt that the SHA is out-dated`, async () => {
          const context = createCommentContext({
            username: 'admin',
            body: '/test 00000000',
            pullRequestNumber: PR_NUMBER.FORK_NON_DOCS_CHANGES,
            authorUsername: 'non-contributor',
          });
          await getCommandFromComment({ core, context, github });
          expect(mockGithubRestIssuesCreateComment).toHaveComment({
            owner: 'someOwner',
            repo: 'someRepo',
            issue_number: PR_NUMBER.FORK_NON_DOCS_CHANGES,
            bodyMatcher: /The specified SHA `00000000` is not the latest commit on the PR. Please validate the latest commit and re-run `\/test`/,
          });
        });
      })

      describe(`for '/test 234567' for external PR (i.e. with insufficiently long commit SHA specified)`, () => {
        test(`should set command to 'none'`, async () => {
          const context = createCommentContext({
            username: 'admin',
            body: '/test 234567',
            pullRequestNumber: PR_NUMBER.FORK_NON_DOCS_CHANGES,
            authorUsername: 'non-contributor',
          });
          await getCommandFromComment({ core, context, github });
          expect(outputFor(mockCoreSetOutput, 'command')).toBe('none');
        });

        test(`should add comment with prompt that the SHA is out-dated`, async () => {
          const context = createCommentContext({
            username: 'admin',
            body: '/test 234567',
            pullRequestNumber: PR_NUMBER.FORK_NON_DOCS_CHANGES,
            authorUsername: 'non-contributor',
          });
          await getCommandFromComment({ core, context, github });
          expect(mockGithubRestIssuesCreateComment).toHaveComment({
            owner: 'someOwner',
            repo: 'someRepo',
            issue_number: PR_NUMBER.FORK_NON_DOCS_CHANGES,
            bodyMatcher: /When specifying a commit SHA it must be at least 7 characters \(received `234567`\)/,
          });
        });
      })

      describe(`for '/test 2345678' for external PR (i.e. with latest commit SHA specified)`, () => {
        test(`should set command to 'run-tests'`, async () => {
          const context = createCommentContext({
            username: 'admin',
            body: '/test 2345678',
            pullRequestNumber: PR_NUMBER.FORK_NON_DOCS_CHANGES,
            authorUsername: 'non-contributor',
          });
          await getCommandFromComment({ core, context, github });
          expect(outputFor(mockCoreSetOutput, 'command')).toBe('run-tests');
        });

        test(`should add comment with run link`, async () => {
          const context = createCommentContext({
            username: 'admin',
            body: '/test 2345678',
            pullRequestNumber: PR_NUMBER.FORK_NON_DOCS_CHANGES,
            authorUsername: 'non-contributor',
          });
          await getCommandFromComment({ core, context, github });
          expect(mockGithubRestIssuesCreateComment).toHaveComment({
            owner: 'someOwner',
            repo: 'someRepo',
            issue_number: PR_NUMBER.FORK_NON_DOCS_CHANGES,
            bodyMatcher: /Running tests: https:\/\/github.com\/someOwner\/someRepo\/actions\/runs\/11112222/,
          });
        });
      })

      describe(`for '/test  2345678' for external PR (i.e. with latest commit SHA specified but extra space after test)`, () => {
        test(`should set command to 'run-tests'`, async () => {
          const context = createCommentContext({
            username: 'admin',
            body: '/test  2345678',
            pullRequestNumber: PR_NUMBER.FORK_NON_DOCS_CHANGES,
            authorUsername: 'non-contributor',
          });
          await getCommandFromComment({ core, context, github });
          expect(outputFor(mockCoreSetOutput, 'command')).toBe('run-tests');
        });

        test(`should add comment with run link`, async () => {
          const context = createCommentContext({
            username: 'admin',
            body: '/test  2345678',
            pullRequestNumber: PR_NUMBER.FORK_NON_DOCS_CHANGES,
            authorUsername: 'non-contributor',
          });
          await getCommandFromComment({ core, context, github });
          expect(mockGithubRestIssuesCreateComment).toHaveComment({
            owner: 'someOwner',
            repo: 'someRepo',
            issue_number: PR_NUMBER.FORK_NON_DOCS_CHANGES,
            bodyMatcher: /Running tests: https:\/\/github.com\/someOwner\/someRepo\/actions\/runs\/11112222/,
          });
        });
      })

      describe(`for '/test-force-approve'`, () => {
        test(`should set command to 'test-force-approve'`, async () => {
          const context = createCommentContext({
            username: 'admin',
            body: '/test-force-approve',
          });
          await getCommandFromComment({ core, context, github });
          expect(outputFor(mockCoreSetOutput, 'command')).toBe('test-force-approve');
        });

        test(`should add comment`, async () => {
          const context = createCommentContext({
            username: 'admin',
            body: '/test-force-approve',
          });
          await getCommandFromComment({ core, context, github });
          expect(mockGithubRestIssuesCreateComment).toHaveComment({
            owner: 'someOwner',
            repo: 'someRepo',
            issue_number: PR_NUMBER.UPSTREAM_NON_DOCS_CHANGES,
            bodyMatcher: /Marking tests as complete \(for commit 0123456789\)/,
          });
        });
      });

      describe(`for '/help'`, () => {
        test(`should set command to 'none'`, async () => {
          const context = createCommentContext({
            username: 'admin',
            body: '/help',
            pullRequestNumber: PR_NUMBER.UPSTREAM_NON_DOCS_CHANGES,
          });
          await getCommandFromComment({ core, context, github });
          expect(outputFor(mockCoreSetOutput, 'command')).toBe('none');
        });
        test(`should add help comment`, async () => {
          const context = createCommentContext({
            username: 'admin',
            body: '/help',
            pullRequestNumber: PR_NUMBER.UPSTREAM_NON_DOCS_CHANGES,
          });
          await getCommandFromComment({ core, context, github });
          expect(mockGithubRestIssuesCreateComment).toHaveComment({
            owner: 'someOwner',
            repo: 'someRepo',
            issue_number: PR_NUMBER.UPSTREAM_NON_DOCS_CHANGES,
            bodyMatcher: /Hello!\n\nYou can use the following commands:/,
          });
        });
      });

      describe(`for '/not-a-command'`, () => {
        test(`should set command to 'none'`, async () => {
          const context = createCommentContext({
            username: 'admin',
            body: '/not-a-command',
            pullRequestNumber: PR_NUMBER.UPSTREAM_NON_DOCS_CHANGES,
          });
          await getCommandFromComment({ core, context, github });
          expect(outputFor(mockCoreSetOutput, 'command')).toBe('none');
        });
        test(`should add help comment`, async () => {
          const context = createCommentContext({
            username: 'admin',
            body: '/not-a-command',
            pullRequestNumber: PR_NUMBER.UPSTREAM_NON_DOCS_CHANGES,
          });
          await getCommandFromComment({ core, context, github });
          expect(mockGithubRestIssuesCreateComment).toHaveComment({
            owner: 'someOwner',
            repo: 'someRepo',
            issue_number: PR_NUMBER.UPSTREAM_NON_DOCS_CHANGES,
            bodyMatcher: /`\/not-a-command` is not recognised as a valid command.\n\nYou can use the following commands:/,
          });
        });
      });
    });

    describe('and multi-line comments', () => {
      test(`when first line of comment is '/test' should set command to 'run-tests'`, async () => {
        const context = createCommentContext({
          username: 'admin',
          body: `/test
Other comment content
goes here`,
        });
        await getCommandFromComment({ core, context, github });
        expect(outputFor(mockCoreSetOutput, 'command')).toBe('run-tests');
      });

      test(`when comment doesn't start with '/' (even if later lines contain '/test') should set command to 'none' `, async () => {
        const context = createCommentContext({
          username: 'admin',
          body: `Non-command comment
/test
Other comment content
goes here`,
        });
        await getCommandFromComment({ core, context, github });
        expect(outputFor(mockCoreSetOutput, 'command')).toBe('none');
      });
    });

    describe('PR context', () => {
      test('should set prRef output', async () => {
        // prRef should be set to the SHA for the potentialMergeCommit for the PR
        const context = createCommentContext({
          pullRequestNumber: PR_NUMBER.UPSTREAM_NON_DOCS_CHANGES
        });
        await getCommandFromComment({ core, context, github });
        expect(outputFor(mockCoreSetOutput, 'prRef')).toBe('123456789a');
      });

      test('should set prHeadSha output', async () => {
        // prHeadSha should be the SHA for the head commit for the PR
        const context = createCommentContext({
          pullRequestNumber: PR_NUMBER.UPSTREAM_NON_DOCS_CHANGES
        });
        await getCommandFromComment({ core, context, github });
        expect(outputFor(mockCoreSetOutput, 'prHeadSha')).toBe('0123456789');
      });
    })
  });


  describe('labelAsExternalIfAuthorDoesNotHaveWriteAccess', () => {

    var core;
    var github;
    var mockGithubRestIssuesAddLabels;
    beforeEach(() => {
      ({ core, github, mockGithubRestIssuesAddLabels } = createGitHubContext());
    });

    function createPullRequestContext({ username, pullRequestNumber }) {
      return {
        payload: {
          pull_request: {
            user: {
              login: username,
            },
            number: pullRequestNumber,
          },
          repository: {
            full_name: 'someOwner/SomeRepo'
          }
        },
        repo: {
          owner: 'someOwner',
          repo: 'someRepo'
        },
      };
    }

    test(`should apply the 'external' label for non-contributor author`, async () => {
      const context = createPullRequestContext({
        username: 'non-contributor',
        pullRequestNumber: PR_NUMBER.UPSTREAM_NON_DOCS_CHANGES,
      });
      await labelAsExternalIfAuthorDoesNotHaveWriteAccess({ core, context, github });
      expect(mockGithubRestIssuesAddLabels).toHaveBeenCalled(); // should set the label for non-contributor
    });

    test(`should return not apply the 'external' label for contributor author`, async () => {
      const context = createPullRequestContext({
        username: 'admin',
        pullRequestNumber: PR_NUMBER.UPSTREAM_NON_DOCS_CHANGES,
      });
      await labelAsExternalIfAuthorDoesNotHaveWriteAccess({ core, context, github });
      expect(mockGithubRestIssuesAddLabels).toHaveBeenCalledTimes(0); // shouldn't set the label for contributor
    });
  });

});
