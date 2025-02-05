const fs = require('fs');
const { execSync } = require('child_process');
const githubToken = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
const eventPath = process.env.GITHUB_EVENT_PATH;
const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
const outputPath = process.env.GITHUB_OUTPUT;

const DEFAULT_ENV = 'UAT (PROD-1)';
const DEFAULT_MODULE = 'Websters';
const DEFAULT_GROUP = 'REGRESSION';
const DEFAULT_BOOL = 'false';

// For comment events (issue_comment or pull_request_review_comment)
if (process.env.GITHUB_EVENT_NAME === 'issue_comment' || process.env.GITHUB_EVENT_NAME === 'pull_request_review_comment') {
  let issue_number;
  if (process.env.GITHUB_EVENT_NAME === 'issue_comment') {
    issue_number = event.issue.number;
  } else {
    issue_number = event.pull_request.number;
  }
  const commentBody = event.comment.body.trim();
  // If the comment does not start with /run-tests, use defaults.
  if (!commentBody.startsWith('/run-tests')) {
    fs.appendFileSync(outputPath, `env=${DEFAULT_ENV}\n`);
    fs.appendFileSync(outputPath, `module=${DEFAULT_MODULE}\n`);
    fs.appendFileSync(outputPath, `group=${DEFAULT_GROUP}\n`);
    fs.appendFileSync(outputPath, `enablePKCE=${DEFAULT_BOOL}\n`);
    fs.appendFileSync(outputPath, `enableTestRetry=${DEFAULT_BOOL}\n`);
    fs.appendFileSync(outputPath, `enableXrayReport=${DEFAULT_BOOL}\n`);
    fs.appendFileSync(outputPath, `enableSlackReport=${DEFAULT_BOOL}\n`);
    process.exit(0);
  }
  // Split the comment into tokens by whitespace.
  const tokens = commentBody.split(/\s+/);
  if (tokens.length !== 8) {
    const expectedFormat = "```\n/run-tests '<env>' '<module>' '<group>' '<enablePKCE>' '<enableTestRetry>' '<enableXrayReport>' '<enableSlackReport>'\n```";
    const errMsg = `Invalid command format. Expected:\n${expectedFormat}`;
    execSync(`curl -s -H "Authorization: token ${githubToken}" -H "Content-Type: application/json" --request POST --data "{\"body\": \"${errMsg.replace(/"/g, '\\\\"')}\"}" https://api.github.com/repos/${repo}/issues/${issue_number}/comments`);
    process.exit(1);
  }
  if (tokens[0] !== '/run-tests') {
    const errMsg = "```\n/run-tests '<env>' '<module>' '<group>' '<enablePKCE>' '<enableTestRetry>' '<enableXrayReport>' '<enableSlackReport>'\n```";
    execSync(`curl -s -H "Authorization: token ${githubToken}" -H "Content-Type: application/json" --request POST --data "{\"body\": \"Invalid command. Expected command to start with /run-tests.\\n${errMsg.replace(/"/g, '\\\\"')}\"}" https://api.github.com/repos/${repo}/issues/${issue_number}/comments`);
    process.exit(1);
  }
  const [cmd, envArg, moduleArg, groupArg, enablePKCE, enableTestRetry, enableXrayReport, enableSlackReport] = tokens;
  // Validate boolean parameters.
  for (let val of [enablePKCE, enableTestRetry, enableXrayReport, enableSlackReport]) {
    if (val !== 'true' && val !== 'false') {
      const errMsg = `\`\`\`\nInvalid boolean value: ${val}. Expected 'true' or 'false'.\n\`\`\``;
      execSync(`curl -s -H "Authorization: token ${githubToken}" -H "Content-Type: application/json" --request POST --data "{\"body\": \"${errMsg.replace(/"/g, '\\\\"')}\"}" https://api.github.com/repos/${repo}/issues/${issue_number}/comments`);
      process.exit(1);
    }
  }
  fs.appendFileSync(outputPath, `env=${envArg}\n`);
  fs.appendFileSync(outputPath, `module=${moduleArg}\n`);
  fs.appendFileSync(outputPath, `group=${groupArg}\n`);
  fs.appendFileSync(outputPath, `enablePKCE=${enablePKCE}\n`);
  fs.appendFileSync(outputPath, `enableTestRetry=${enableTestRetry}\n`);
  fs.appendFileSync(outputPath, `enableXrayReport=${enableXrayReport}\n`);
  fs.appendFileSync(outputPath, `enableSlackReport=${enableSlackReport}\n`);
  process.exit(0);
} else {
  // For workflow_dispatch and PR label events, use defaults.
  fs.appendFileSync(outputPath, `env=${DEFAULT_ENV}\n`);
  fs.appendFileSync(outputPath, `module=${DEFAULT_MODULE}\n`);
  fs.appendFileSync(outputPath, `group=${DEFAULT_GROUP}\n`);
  fs.appendFileSync(outputPath, `enablePKCE=${DEFAULT_BOOL}\n`);
  fs.appendFileSync(outputPath, `enableTestRetry=${DEFAULT_BOOL}\n`);
  fs.appendFileSync(outputPath, `enableXrayReport=${DEFAULT_BOOL}\n`);
  fs.appendFileSync(outputPath, `enableSlackReport=${DEFAULT_BOOL}\n`);
  process.exit(0);
}
