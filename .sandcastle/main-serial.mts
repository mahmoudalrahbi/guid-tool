// Serial Issue Runner — one issue per cycle
//
// Same three-phase loop as main.mts but processes ONE issue at a time:
//   Phase 1 (Plan):    Haiku planner reads open issues, picks the single
//                      highest-priority unblocked issue.
//   Phase 2 (Execute): Sonnet implementer works the issue (up to 30 iter).
//                      If it commits, Haiku reviewer cleans up (1 iter).
//   Phase 3 (Merge):   Haiku merger merges the branch and closes the issue.
//
// The outer loop repeats until no unblocked issues remain or MAX_ITERATIONS
// is reached.
//
// Usage:
//   npx tsx .sandcastle/main-serial.mts

import * as sandcastle from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";

const MAX_ITERATIONS = 10;

const hooks = {
  sandbox: { onSandboxReady: [{ command: "npm install" }] },
};

const copyToWorktree = ["node_modules"];

for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
  console.log(`\n=== Iteration ${iteration}/${MAX_ITERATIONS} ===\n`);

  // -------------------------------------------------------------------------
  // Phase 1: Plan — pick ONE issue
  // -------------------------------------------------------------------------
  const plan = await sandcastle.run({
    hooks,
    sandbox: docker(),
    name: "planner",
    maxIterations: 1,
    agent: sandcastle.claudeCode("claude-haiku-4-5-20251001"),
    promptFile: "./.sandcastle/plan-prompt.md",
  });

  const planMatch = plan.stdout.match(/<plan>([\s\S]*?)<\/plan>/);
  if (!planMatch) {
    throw new Error(
      "Planning agent did not produce a <plan> tag.\n\n" + plan.stdout,
    );
  }

  const { issues } = JSON.parse(planMatch[1]!) as {
    issues: { id: string; title: string; branch: string }[];
  };

  if (issues.length === 0) {
    console.log("No unblocked issues to work on. Exiting.");
    break;
  }

  // Take only the first (highest-priority) issue.
  const issue = issues[0]!;
  console.log(`Working on: ${issue.id}: ${issue.title} → ${issue.branch}`);

  // -------------------------------------------------------------------------
  // Phase 2: Execute + Review — single issue, sequential
  // -------------------------------------------------------------------------
  const sandbox = await sandcastle.createSandbox({
    branch: issue.branch,
    sandbox: docker(),
    hooks,
    copyToWorktree,
  });

  let allCommits: string[] = [];

  try {
    const implement = await sandbox.run({
      name: "implementer",
      maxIterations: 30,
      agent: sandcastle.claudeCode("claude-sonnet-4-6"),
      promptFile: "./.sandcastle/implement-prompt.md",
      promptArgs: {
        TASK_ID: issue.id,
        ISSUE_TITLE: issue.title,
        BRANCH: issue.branch,
      },
    });

    allCommits = implement.commits;

    if (implement.commits.length > 0) {
      const review = await sandbox.run({
        name: "reviewer",
        maxIterations: 1,
        agent: sandcastle.claudeCode("claude-haiku-4-5-20251001"),
        promptFile: "./.sandcastle/review-prompt.md",
        promptArgs: {
          BRANCH: issue.branch,
        },
      });

      allCommits = [...implement.commits, ...review.commits];
    }
  } finally {
    await sandbox.close();
  }

  console.log(`\nExecution complete. ${allCommits.length} commit(s) produced.`);

  if (allCommits.length === 0) {
    console.log("No commits produced. Skipping merge, moving to next issue.");
    continue;
  }

  // -------------------------------------------------------------------------
  // Phase 3: Merge
  // -------------------------------------------------------------------------
  await sandcastle.run({
    hooks,
    sandbox: docker(),
    name: "merger",
    maxIterations: 1,
    agent: sandcastle.claudeCode("claude-haiku-4-5-20251001"),
    promptFile: "./.sandcastle/merge-prompt.md",
    promptArgs: {
      BRANCHES: `- ${issue.branch}`,
      ISSUES: `- ${issue.id}: ${issue.title}`,
    },
  });

  console.log(`\nIssue ${issue.id} merged and closed.`);
}

console.log("\nAll done.");
