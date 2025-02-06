const core = require('@actions/core');

/**
 * Posts an error comment to the issue/PR and returns an object indicating tests should be skipped.
 * @param {object} github - Authenticated GitHub client.
 * @param {object} repo - Repository object ({owner, repo}).
 * @param {number} issueNumber - The issue or PR number.
 * @param {string} logMessage - The error message for CI/CD logs (plain text).
 * @param {string} commentMessage - The error message for the GitHub comment (with markdown formatting).
 * @returns {object} - An object with skip: "true".
 */
async function postError(github, repo, issueNumber, logMessage,
    commentMessage) {
  await github.rest.issues.createComment({
    owner: repo.owner,
    repo: repo.repo,
    issue_number: issueNumber,
    body: commentMessage,
  });
  core.error(logMessage.replace(/[`]/g, ''));
  return {skip: "true"};
}

/**
 * Validates that a given value is one of the allowed values.
 * If invalid, throws an error with a message containing markdown formatting.
 * @param {string} val - The value to check.
 * @param {string[]} allowed - Array of allowed values.
 * @param {string} field - The field name (for error messages).
 * @param {boolean} caseInsensitive - Whether comparison should be case-insensitive.
 * @returns {string} - The original value.
 */
function validateAllowed(val, allowed, field, caseInsensitive = false) {
  let cmpVal, allowedValues;
  if (caseInsensitive) {
    cmpVal = val.toUpperCase();
    allowedValues = allowed.map(x => x.toUpperCase());
  } else {
    cmpVal = val;
    allowedValues = allowed;
  }
  if (!allowedValues.includes(cmpVal)) {
    throw new Error(
        `Invalid ${field}: \`${val}\`, allowed values are: ${allowedValues.map(
            x => `\`${x}\``).join(', ')}!`);
  }
  return val;
}

module.exports = async function parseRunTests(github, context) {
  // Default values for manual triggers.
  const DEFAULT_ENV = 'UAT (PROD-1)';
  const DEFAULT_MODULE = 'Websters';
  const DEFAULT_GROUP = 'REGRESSION';
  const DEFAULT_BOOL = 'false';

  // Allowed sets.
  const allowedEnvs = ['PROD', 'UAT', 'INTG', 'DEV'];
  const allowedModules = ['Websters', 'Klasters'];
  const allowedGroups = ['REGRESSION', 'SMOKE', 'ALL'];

  // For workflow_dispatch events, return defaults.
  if (context.eventName === 'workflow_dispatch') {
    return {
      skip: "false",
      env: DEFAULT_ENV,
      module: DEFAULT_MODULE,
      group: DEFAULT_GROUP,
      enablePKCE: DEFAULT_BOOL,
      enableTestRetry: DEFAULT_BOOL,
      enableXrayReport: DEFAULT_BOOL,
      enableSlackReport: DEFAULT_BOOL,
    };
  }

  // Process comment events.
  if (context.eventName === 'issue_comment' || context.eventName
      === 'pull_request_review_comment') {
    const issueNumber = context.eventName === 'issue_comment'
        ? context.payload.issue.number : context.payload.pull_request.number;
    const repo = context.repo;
    const commentBody = context.payload.comment.body.trim();

    // If the comment does not start with /run-tests, skip tests.
    if (!commentBody.startsWith('/run-tests')) {
      core.info(
          "Comment does not contain '/run-tests'; skipping tests execution.");
      return {skip: "true"};
    }

    const tokens = commentBody.split(/\s+/);
    // Expected format: /run-tests <env> <module> <group> <enablePKCE> <enableTestRetry> <enableXrayReport> <enableSlackReport>
    const expectedFormatForComment = "```bash\n/run-tests <env> <module> <group> <enablePKCE> <enableTestRetry> <enableXrayReport> <enableSlackReport>\n```";
    const expectedFormatLog = "/run-tests <env> <module> <group> <enablePKCE> <enableTestRetry> <enableXrayReport> <enableSlackReport>";

    if (tokens.length !== 8) {
      return await postError(github, repo, issueNumber,
          `Invalid command format. Expected: ${expectedFormatLog}`,
          `Invalid command format. Expected:\n${expectedFormatForComment}`);
    }
    if (tokens[0] !== '/run-tests') {
      return await postError(github, repo, issueNumber,
          `Invalid command. Expected command to start with /run-tests. ${expectedFormatLog}`,
          `Invalid command. Expected command to start with /run-tests.\n${expectedFormatForComment}`);
    }

    const [, envArg, moduleArg, groupArg, enablePKCE, enableTestRetry, enableXrayReport, enableSlackReport] = tokens;

    try {
      validateAllowed(envArg, allowedEnvs, 'environment', true);
      validateAllowed(moduleArg, allowedModules, 'module');
      validateAllowed(groupArg, allowedGroups, 'group');
    } catch (err) {
      return await postError(github, repo, issueNumber, err.message,
          err.message);
    }

    for (const val of
        [enablePKCE, enableTestRetry, enableXrayReport, enableSlackReport]) {
      if (val !== 'true' && val !== 'false') {
        return await postError(github, repo, issueNumber,
            "Invalid boolean value. Expected 'true' or 'false'.",
            "Invalid boolean value. Expected `true` or `false`.");
      }
    }
    return {
      skip: "false",
      env: envArg,
      module: moduleArg,
      group: groupArg,
      enablePKCE,
      enableTestRetry,
      enableXrayReport,
      enableSlackReport,
    };
  }

  return {skip: "true"};
};
