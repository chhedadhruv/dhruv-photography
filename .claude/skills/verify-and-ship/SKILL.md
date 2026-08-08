---
name: verify-and-ship
description: The branch, verify, commit, push and PR workflow for this repo, including the approve-before-commit rule and commit message conventions. Use whenever work is finished and needs committing, pushing, or a pull request opened.
---

# Verify and ship

The rules below are the repo owner's explicit workflow. Follow them exactly.

## 1. Branch first — never commit to `main`

```bash
git checkout main && git pull --ff-only
git checkout -b <type>/<short-description>
```

| Prefix     | For                                |
| ---------- | ---------------------------------- |
| `feat/`    | New capability                     |
| `fix/`     | Bug fix                            |
| `chore/`   | Tooling, config, dependencies      |
| `content/` | Photos, collections, journal posts |
| `test/`    | Tests only                         |
| `docs/`    | Documentation only                 |

## 2. Verify before asking

```bash
yarn verify   # format:check + lint (zero warnings) + typecheck + test
yarn build
```

**Both must pass before you show the work.** Note `yarn verify`, not `yarn check` —
`check` is a yarn 1 builtin that shadows package scripts and exits 0 without running
anything.

### Fix, never suppress

`eslint-disable` is inert here (`noInlineConfig: true`), `@ts-ignore` is banned, and `any`
is an error. When a library hands back loose data, parse it into a real type with Zod.
When a rule flags dead code, delete the dead code. If a rule seems genuinely wrong for a
case, raise it with the user rather than working around it.

A warning is a failure. There is no "fix it later".

## 3. Show the work, then WAIT

Summarise what changed and why, flag anything surprising, and **ask before committing.**
The user reviews first — this is a firm rule, not a formality. Never commit unreviewed
work.

## 4. Commit

- **No `Co-Authored-By` trailer.** The user has asked for this explicitly.
- Subject line in the imperative, under ~70 chars.
- Body explains _why_, not what — the diff already shows what. Record decisions, rejected
  alternatives, and anything discovered by testing rather than assumption.

The `pre-commit` hook runs Prettier on staged files, then ESLint, typecheck, and tests.
If it blocks the commit, fix the cause.

## 5. Push and open a PR

```bash
git push -u origin <branch>
```

`pre-push` re-runs the full verify and a build.

`gh` may not be installed. If it is not, **give the user the PR link** that git prints
and let them open it — do not try to work around its absence:

```
https://github.com/chhedadhruv/dhruv-photography/pull/new/<branch>
```

Suggest a PR title matching the commit subject. The PR template populates automatically.

## 6. Merge is the user's

CI must pass before anything merges. Do not merge on their behalf. Wait for them to
confirm the merge, then sync `main` before starting the next branch.
