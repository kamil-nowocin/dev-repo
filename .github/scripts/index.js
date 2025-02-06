// .github/scripts/parseRunTests.js

const core = require('@actions/core');

/**
 * Posts an error comment to the issue/PR and then throws an error.
 * @param {object} github - Authenticated GitHub client.
 * @param {object} repo - Repository object ({owner, repo}).
 * @param {number} issueNumber - The issue or PR number.
 * @param {string} message - The error message.
 */
async function postError(github, repo, issueNumber, message) {
  await github.rest.issues.createComment({
    ...repo,
    issue_number: issueNumber,
    body: message,
  });
  throw new Error(message);
}

/**
 * Validates that a given value is one of the allowed values.
 * @param {string} val - The value to check.
 * @param {string[]} allowed - Array of allowed values.
 * @param {string} field - The field name (for error messages).
 * @param {boolean} caseInsensitive - Whether comparison should be case-insensitive.
 * @returns {string} - The original (or normalized) value.
 */
function validateAllowed(val, allowed, field, caseInsensitive = false) {
  const cmpVal = caseInsensitive ? val.toLowerCase() : val;
  const allowedValues = caseInsensitive ? allowed.map(x => x.toLowerCase()) : allowed;
  if (!allowedValues.includes(cmpVal)) {
    throw new Error(`Invalid ${field}: ${val}! Allowed: ${allowed.join(', ')}.`);
  }
  return val;
}

module.exports = async function parseRunTests(github, context) {
  // Default values for manual triggers.
  const DEFAULT_ENV = 'uat';
  const DEFAULT_MODULE = 'Websters';
  const DEFAULT_GROUP = 'regression';
  const DEFAULT_BOOL = 'false';

  // Allowed sets.
  const allowedEnvs = ['prod', 'uat', 'intg', 'dev'];
  const allowedModules = ['Websters', 'Klasters'];
  const allowedGroups = ['regression', 'smoke', 'all'];

  // For workflow_dispatch events, return defaults.
  if (context.eventName === 'workflow_dispatch') {
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

  // Process comment events.
  if (context.eventName === 'issue_comment' || context.eventName === 'pull_request_review_comment') {
    const issueNumber =
        context.eventName === 'issue_comment'
            ? context.payload.issue.number
            : context.payload.pull_request.number;
    const repo = context.repo;
    const commentBody = context.payload.comment.body.trim();

    if (!commentBody.startsWith('/run-tests')) {
      throw new Error('Comment does not contain \'/run-tests\'. Skipping tests execution!');
    }

    const tokens = commentBody.split(/\s+/);
    if (tokens.length !== 8) {
      const expectedFormat = "```bash\n/run-tests <env> <module> <group> <enablePKCE> <enableTestRetry> <enableXrayReport> <enableSlackReport>\n```";
      await postError(github, repo, issueNumber, `Invalid command format. Expected:\n${expectedFormat}`);
    }
    if (tokens[0] !== '/run-tests') {
      const expectedFormat = "```bash\n/run-tests <env> <module> <group> <enablePKCE> <enableTestRetry> <enableXrayReport> <enableSlackReport>\n```";
      await postError(github, repo, issueNumber, `Invalid command. Expected command to start with /run-tests.\n${expectedFormat}`);
    }

    const [ , envArg, moduleArg, groupArg, enablePKCE, enableTestRetry, enableXrayReport, enableSlackReport ] = tokens;

    try {
      validateAllowed(envArg, allowedEnvs, 'environment', true);
      validateAllowed(moduleArg, allowedModules, 'module');
      validateAllowed(groupArg, allowedGroups, 'group');
    } catch (err) {
      await postError(github, repo, issueNumber, err.message);
    }

    for (const val of [enablePKCE, enableTestRetry, enableXrayReport, enableSlackReport]) {
      if (val !== 'true' && val !== 'false') {
        await postError(github, repo, issueNumber, "Invalid boolean value. Expected 'true' or 'false'.");
      }
    }
    return {
      env: envArg.toLowerCase(),
      module: moduleArg,
      group: groupArg,
      enablePKCE,
      enableTestRetry,
      enableXrayReport,
      enableSlackReport,
    };
  }

  throw new Error('Unsupported event type for this workflow.');
};