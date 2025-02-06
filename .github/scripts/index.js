// .github/scripts/manage-labels.js
// This is an example module that parses the /run-tests command.
// Adjust the parsing logic as needed for your use case.

module.exports = async function manageLabels(github, context) {
  // Defaults
  const DEFAULT_ENV = 'UAT (PROD-1)';
  const DEFAULT_MODULE = 'Websters';
  const DEFAULT_GROUP = 'REGRESSION';
  const DEFAULT_BOOL = 'false';

  // For comment events (issue_comment or pull_request_review_comment)
  if (
      context.eventName === 'issue_comment' ||
      context.eventName === 'pull_request_review_comment'
  ) {
    // Determine the issue/PR number.
    const issueNumber =
        context.eventName === 'issue_comment'
            ? context.payload.issue.number
            : context.payload.pull_request.number;
    const commentBody = context.payload.comment.body.trim();

    // If the comment doesn't start with /run-tests, return defaults.
    if (!commentBody.startsWith('/run-tests')) {
      return {
        env: DEFAULT_ENV,
        module: DEFAULT_MODULE,
        group: DEFAULT_GROUP,
        enablePKCE: DEFAULT_BOOL,
        enableTestRetry: DEFAULT_BOOL,
        enableXrayReport: DEFAULT_BOOL,
        enableSlackReport: DEFAULT_BOOL,
      };
    }

    // Split the comment into tokens (by whitespace)
    const tokens = commentBody.split(/\s+/);
    if (tokens.length !== 8) {
      const expectedFormat =
          "```bash\n/run-tests <env> <module> <group> <enablePKCE> <enableTestRetry> <enableXrayReport> <enableSlackReport>\n```";
      // Post an error comment to the issue/PR
      await github.rest.issues.createComment({
        ...context.repo,
        issue_number: issueNumber,
        body: `Invalid command format. Expected:\n${expectedFormat}`,
      });
      throw new Error('Invalid command format');
    }
    if (tokens[0] !== '/run-tests') {
      const expectedFormat =
          "```bash\n/run-tests <env> <module> <group> <enablePKCE> <enableTestRetry> <enableXrayReport> <enableSlackReport>\n```";
      await github.rest.issues.createComment({
        ...context.repo,
        issue_number: issueNumber,
        body: `Invalid command. Expected command to start with /run-tests.\n${expectedFormat}`,
      });
      throw new Error('Invalid command');
    }
    // Destructure tokens
    const [cmd, envArg, moduleArg, groupArg, enablePKCE, enableTestRetry, enableXrayReport, enableSlackReport] = tokens;

    // Validate that boolean tokens are either "true" or "false"
    for (const val of [enablePKCE, enableTestRetry, enableXrayReport, enableSlackReport]) {
      if (val !== 'true' && val !== 'false') {
        await github.rest.issues.createComment({
          ...context.repo,
          issue_number: issueNumber,
          body: `\`\`\`\nInvalid boolean value: ${val}. Expected 'true' or 'false'.\n\`\`\``,
        });
        throw new Error('Invalid boolean value');
      }
    }
    // Return the parsed values.
    return {
      env: envArg,
      module: moduleArg,
      group: groupArg,
      enablePKCE,
      enableTestRetry,
      enableXrayReport,
      enableSlackReport,
    };
  } else {
    // For non-comment events (workflow_dispatch or PR label events), return defaults.
    return {
      env: DEFAULT_ENV,
      module: DEFAULT_MODULE,
      group: DEFAULT_GROUP,
      enablePKCE: DEFAULT_BOOL,
      enableTestRetry: DEFAULT_BOOL,
      enableXrayReport: DEFAULT_BOOL,
      enableSlackReport: DEFAULT_BOOL,
    };
  }
};
