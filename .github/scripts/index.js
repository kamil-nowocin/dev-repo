module.exports = async function manageLabels(github, context) {
  const DEFAULT_ENV = 'UAT (PROD-1)';
  const DEFAULT_MODULE = 'Websters';
  const DEFAULT_GROUP = 'REGRESSION';
  const DEFAULT_BOOL = 'false';

  if (context.eventName === 'issue_comment' || context.eventName
      === 'pull_request_review_comment') {
    const issueNumber = context.eventName === 'issue_comment'
        ? context.payload.issue.number : context.payload.pull_request.number;
    const commentBody = context.payload.comment.body.trim();

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

    const tokens = commentBody.split(/\s+/);
    if (tokens.length !== 8) {
      const expectedFormat = "```bash\n/run-tests <env> <module> <group> <enablePKCE> <enableTestRetry> <enableXrayReport> <enableSlackReport>\n```";
      await github.rest.issues.createComment({
        ...context.repo,
        issue_number: issueNumber,
        body: `Invalid command format. Expected:\n${expectedFormat}`,
      });
      throw new Error('Invalid command format');
    }
    if (tokens[0] !== '/run-tests') {
      const expectedFormat = "```bash\n/run-tests <env> <module> <group> <enablePKCE> <enableTestRetry> <enableXrayReport> <enableSlackReport>\n```";
      await github.rest.issues.createComment({
        ...context.repo,
        issue_number: issueNumber,
        body: `Invalid command. Expected command to start with /run-tests.\n${expectedFormat}`,
      });
      throw new Error('Invalid command');
    }
    const [cmd, envArg, moduleArg, groupArg, enablePKCE, enableTestRetry, enableXrayReport, enableSlackReport] = tokens;

    for (const val of
        [enablePKCE, enableTestRetry, enableXrayReport, enableSlackReport]) {
      if (val !== 'true' && val !== 'false') {
        await github.rest.issues.createComment({
          ...context.repo,
          issue_number: issueNumber,
          body: `\`\`\`\nInvalid boolean value: ${val}. Expected 'true' or 'false'.\n\`\`\``,
        });
        throw new Error('Invalid boolean value');
      }
    }
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
