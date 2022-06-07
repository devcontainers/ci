function lastCallFor(mock, matcher) {
	const matches = mock.mock.calls.filter(matcher);
	const lastMatchIndex = matches.length - 1;
	if (lastMatchIndex < 0) {
	  return null;
	}
	return matches[lastMatchIndex];
  }
  
  // outputFor returns the last call to mock with the specified key
  function outputFor(mock, key) {
	// get last call for mock with first arg matching the key
	const lastCall = lastCallFor(mock, c => c[0] === key);
	if (lastCall) {
	  // return second arg (output value)
	  return lastCall[1];
	}
	return null;
  }
  
  function toHaveComment(received, { owner, repo, issue_number, bodyMatcher }) {
	const commentsForIssue = received.mock.calls
	  .map(c => c[0])
	  .filter(arg => arg.owner === owner && arg.repo === repo && arg.issue_number === issue_number);
	if (commentsForIssue.length === 0) {
	  return { message: () => `No comments found for issue ${JSON.stringify({ owner, repo, issue_number })}`, pass: false };
	}
  
	const gotMatchingBody = commentsForIssue.some(c => bodyMatcher.exec(c.body) !== null)
	if (!gotMatchingBody) {
	  const lastComment = commentsForIssue[commentsForIssue.length - 1]
	  return { message: () => `No comment found with body matching ${bodyMatcher.toString()}. Last comment for issue: '${lastComment.body}'`, pass: false };
	}
	return { message: '', pass: true };
  }
  
  const PR_NUMBER = {
	UPSTREAM_NON_DOCS_CHANGES: 123,
	UPSTREAM_DOCS_ONLY_CHANGES: 125,
	FORK_NON_DOCS_CHANGES: 456,
	UPSTREAM_NON_MERGEABLE: 600,
  }
  
  function createGitHubContext() {
	mockGithubRestIssuesAddLabels = jest.fn();
	mockGithubRestIssuesCreateComment = jest.fn();
	mockGithubRestPullsListFiles = jest.fn();
	mockCoreSetOutput = jest.fn();
	mockCoreNotice = jest.fn();
	mockCoreInfo = jest.fn();
	mockCoreWarning = jest.fn();
	mockCoreError = jest.fn();
	return {
	  mockGithubRestIssuesAddLabels,
	  mockGithubRestIssuesCreateComment,
	  mockCoreSetOutput,
	  mockCoreInfo,
	  mockCoreNotice,
	  mockCoreWarning,
	  mockCoreError,
	  core: {
		setOutput: mockCoreSetOutput,
		info: mockCoreInfo,
		notice: mockCoreNotice,
		warning: mockCoreWarning,
		error: mockCoreError,
	  },
	  github: {
		paginate: (func, params) => {
		  // thin fake for paginate -> faked function being paginated should return a single page of data!
		  // if you're getting a `func is not a function` error then check that a func is being passed in
		  return func(params);
		},
		request: async (route, data) => {
		  if (route === 'GET /repos/{owner}/{repo}/collaborators/{username}') {
			if (data.username === "admin") {
			  return {
				status: 204
			  };
			} else {
			  throw {
				status: 404,
			  };
			}
		  }
		},
		rest: {
		  issues: {
			addLabels: mockGithubRestIssuesAddLabels,
			createComment: mockGithubRestIssuesCreateComment,
		  },
		  pulls: {
			get: async (params) => {
			  if (params.owner === 'someOwner'
				&& params.repo === 'someRepo') {
				switch (params.pull_number) {
				  case PR_NUMBER.UPSTREAM_NON_DOCS_CHANGES: // PR from the upstream repo with non-docs changes
					return {
					  data: {
						head: {
						  ref: 'pr-head-ref',
						  sha: '0123456789',
						  repo: { full_name: 'someOwner/someRepo' },
						},
						merge_commit_sha: '123456789a',
						mergeable: true,
					  },
					}
				  case PR_NUMBER.UPSTREAM_DOCS_ONLY_CHANGES: // PR from the upstream repo with docs-only changes
					return {
					  data: {
						head: {
						  ref: 'pr-head-ref',
						  sha: '0123456789',
						  repo: { full_name: 'someOwner/someRepo' },
						},
						merge_commit_sha: '123456789a',
						mergeable: true,
					  },
					}
				  case PR_NUMBER.FORK_NON_DOCS_CHANGES: // PR from a forked repo
					return {
					  data: {
						head: {
						  ref: 'pr-head-ref',
						  sha: '23456789ab',
						  repo: { full_name: 'anotherOwner/someRepo' },
						},
						merge_commit_sha: '3456789abc',
						mergeable: true,
					  },
					}
				  case PR_NUMBER.UPSTREAM_NON_MERGEABLE: // PR with mergable==false
					return {
					  data: {
						head: {
						  ref: 'pr-head-ref',
						  sha: '23456789ab',
						  repo: { full_name: 'anotherOwner/someRepo' },
						},
						merge_commit_sha: '3456789abc',
						mergeable: false,
					  },
					}
				}
			  }
			  throw 'Unhandled params in fake pulls.get: ' + JSON.stringify(params)
			},
			listFiles: async (params) => {
			  if (params.owner === 'someOwner'
				&& params.repo === 'someRepo') {
				switch (params.pull_number) {
				  case PR_NUMBER.UPSTREAM_NON_DOCS_CHANGES:
				  case PR_NUMBER.FORK_NON_DOCS_CHANGES:
				  case PR_NUMBER.UPSTREAM_NON_MERGEABLE:
					return [{ filename: 'test.py' }, { filename: 'test.md' }];
  
				  case PR_NUMBER.UPSTREAM_DOCS_ONLY_CHANGES:
					return [{ filename: 'test.md' }, { filename: 'docs/some-image.png' }];
				}
			  }
			  throw 'Unhandled params in fake pulls.listFiles: ' + JSON.stringify(params)
			}
		  },
		},
	  }
	};
  }
  
  
  module.exports = {
	lastCallFor,
	outputFor,
	toHaveComment,
	createGitHubContext,
	PR_NUMBER,
  }
  