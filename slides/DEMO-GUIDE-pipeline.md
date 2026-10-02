# CI/CD demo guide — dev → qa → prod

Push a change, watch it deploy to dev, then promote it to qa and prod.
Promotion is a **pull request** between the long-lived branches.

- Repo: `nus-iss-team1/rescufood` · branches `develop`→dev, `qa`→qa, `main`→prod
- URLs: `dev.rescufood.com` · `qa.rescufood.com` · `rescufood.com`
- The branch decides the environment — a push can only roll its own cluster.

The demo change is a green banner on the landing page
(`web/platform/src/components/landing.tsx`), visible without logging in.

---

## 0. Before you start

- Open the repo's **Actions** and **Pull requests** tabs in the browser.
- Have the three URLs ready.
- `gh auth status` to confirm you can open PRs from the terminal.
- The `demo/pipeline-walkthrough` branch (off `develop`) already has the
  banner change applied, verified with lint + type-check.

**Timing:** build + push is a few minutes; the ECS rollout usually finishes in
1–3 min (it fails fast and rolls back if the circuit breaker trips).

---

## 1. Ship to dev

```powershell
git switch demo/pipeline-walkthrough
git add web/platform/src/components/landing.tsx
git commit -m "demo: landing banner to prove the pipeline"
git push -u origin demo/pipeline-walkthrough

gh pr create --base develop --head demo/pipeline-walkthrough `
  --title "Demo: pipeline walkthrough" --body "Visible change to demo the pipeline."
gh pr view --web
```

**Show on the PR:** Platform CI running — lint + type-check, SAST
(CodeQL/Semgrep/Trivy), DAST (ZAP). Findings show as SARIF under
**Security → Code scanning**, report-only for now.

**Merge → dev deploy:**

```powershell
gh pr merge --merge --delete-branch
```

**Show in Actions:** `Build & Push Platform Image` on `develop` → SAST → build
& push → Deploy to ECS (`rescufood-dev`). Then **End-to-End Tests** auto-runs
against dev.

**Prove it:** open `dev.rescufood.com` → the green banner is there.

---

## 2. Promote to qa

```powershell
git fetch origin
git log --oneline origin/qa..origin/develop   # what's promoting

gh pr create --base qa --head develop `
  --title "Promote develop -> qa" --body "Promotion."
gh pr merge --merge
```

**Show in Actions:** build runs on `qa` → deploys `rescufood-qa` → Playwright
e2e fires automatically against the live qa site.

**Prove it:** open `qa.rescufood.com`.

---

## 3. Promote to prod

```powershell
git fetch origin
git log --oneline origin/main..origin/qa

gh pr create --base main --head qa `
  --title "Promote qa -> prod" --body "Promotion to production."
gh pr merge --merge      # may wait for a required reviewer on prod
```

**Show in Actions:** build runs on `main` → image tagged **`prod`** →
deploys `rescufood-prod`. No e2e on prod by design (it writes real data).

**Prove it:** open `rescufood.com`.

---

## Cheat sheet

| Stage | PR | Deploys | Tag | Prove it |
|---|---|---|---|---|
| dev | merge `demo/*` → `develop` | `rescufood-dev` + e2e | `develop`, `latest` | `dev.rescufood.com` |
| qa | `develop` → `qa` | `rescufood-qa` + e2e | `qa` | `qa.rescufood.com` |
| prod | `qa` → `main` | `rescufood-prod` | `prod` | `rescufood.com` |

## If it breaks

- **CI red on the PR** — the gate worked, nothing shipped. Fix and re-push.
- **Rollout failed** — the ECS circuit breaker rolled back; the old image keeps
  serving.
- **Nothing built** — the change missed every `paths:` filter (expected for a
  slides-only edit).
- **Re-deploy with no code change** — Actions → the build workflow →
  Run workflow → pick the branch.
- **Roll back prod** — revert the commit on `main` and push; the build redeploys.

## Cleanup

```powershell
git switch develop
git pull origin develop
```
