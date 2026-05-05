# CLAUDE.md — AP Lang C.E.R. Practice Suite

## Project Overview

This project contains three LLM-powered practice tools for AP Language and Composition argument essay skills, targeting the **Claim → Evidence → Reasoning (C.E.R.)** framework. Built for Deven Parrish's AP Lang classes at Howell High School.

**The three activities:**
1. **The Reasoning Gauntlet** — Students get a pre-built claim + evidence pair and write *only* the reasoning. LLM diagnoses specific failure modes (The Parrot, The Generalizer, etc.). Five rounds, escalating difficulty.
2. **The Diagnosis Lab** — Students read flawed argument paragraphs, identify the flaw type from a list, then rewrite the broken component. LLM evaluates both the diagnosis and the fix. Five specimens, escalating difficulty.
3. **The C.E.R. Step-Builder** — Students write a full argument paragraph from scratch, one piece at a time (claim → evidence → reasoning). Each stage gets LLM feedback before unlocking the next. Final screen shows the assembled paragraph with color-coded C.E.R. components.

All content is thematically tied to the **2023 AP Lang Argument prompt** — Carlos Curbelo's 2018 statement on fear-based persuasion.

---

## Files

| File | Purpose | Runtime |
|------|---------|---------|
| `index.html` | Landing page linking to all three activities + cheat sheet | GitHub Pages |
| `gauntlet.html` | Reasoning Gauntlet activity | GitHub Pages, uses `config.js` + `api.js` |
| `diagnosis-lab.html` | Diagnosis Lab activity | GitHub Pages, uses `config.js` + `api.js` |
| `step-builder.html` | C.E.R. Step-Builder activity | GitHub Pages, uses `config.js` + `api.js` |
| `cheat-sheet.html` | One-page printable C.E.R. reference sheet | Static HTML, no dependencies |
| `config.js` | Shared API key + password config (key is a placeholder in source) | Injected at deploy time via GitHub Actions |
| `styles.css` | Shared dark theme, typography, button styles | All activity pages |
| `api.js` | Shared Gemini API call function with error handling and header auth | All activity pages |
| `.github/workflows/deploy.yml` | GitHub Actions workflow: injects API key at build time, deploys to GitHub Pages | Runs on every push to `main` |

---

## Deployment: GitHub Pages (Primary)

Live URL: **https://dkp-810.github.io/ap-lang-cer/**
Repo: **https://github.com/DKP-810/ap-lang-cer/**

### How it works
The API key is **never stored in the repository source**. `config.js` contains the placeholder `YOUR_GEMINI_API_KEY_HERE`. The GitHub Actions workflow (`.github/workflows/deploy.yml`) runs `sed` to inject the real key from a GitHub repository secret at build time before deploying to GitHub Pages.

### To deploy an update
```bash
git add .
git commit -m "your message here"
git push origin main
```
The Actions workflow triggers automatically. Watch progress at https://github.com/DKP-810/ap-lang-cer/actions.

### API Key Setup (if key needs to be rotated)
1. Get a new key at https://aistudio.google.com/apikey — "Create API key in new project"
2. In Google Cloud Console → Credentials → edit the key:
   - **HTTP referrer restrictions:** Add both `https://dkp-810.github.io/*` and `https://dkp-810.github.io/ap-lang-cer/*`
   - **API restrictions:** Restrict to "Generative Language API" only
3. Go to GitHub repo → **Settings → Secrets and variables → Actions** → update the `GEMINI_API_KEY` secret
4. Push any change to `main` to trigger a redeploy with the new key

### Critical Details
- **Password:** `APLangRulez` (stored in `config.js`)
- **Key in source:** Always the placeholder `YOUR_GEMINI_API_KEY_HERE` — never the real key
- **GitHub secret scanning:** Will flag any real key committed to the repo and revoke it. The workflow approach prevents this entirely.
- **Referrer restriction gotcha:** Must allow `https://dkp-810.github.io/*` (root domain wildcard), not just `/ap-lang-cer/*`. Browsers send the root origin as the referer header. See Bug #5.

---

## Bugs Encountered & Fixes (Critical for Future Sessions)

### 1. Gemini 2.0 Flash is DEPRECATED (404 errors)
- **Symptom:** API returns 404 or misleading "API key not valid" error
- **Cause:** `gemini-2.0-flash` was deprecated February 2026, shut down March 2026
- **Fix:** Use `gemini-2.5-flash-lite` (switched May 2026 — Flash's free tier hard cap is only 20 RPD per project, which is unusable for a class)
- **Future-proofing:** Google deprecates models aggressively. If this breaks again, check https://ai.google.dev/gemini-api/docs/models for current model strings.

### 2. API Key Must Use Header Auth, NOT URL Parameter
- **Symptom:** "API key not valid. Please pass a valid API key." even with a valid key
- **Cause:** Passing the key via URL query parameter (`?key=API_KEY`) no longer works reliably. Google appears to be phasing this out.
- **Fix:** Pass the key via the `x-goog-api-key` HTTP header instead:
  ```javascript
  const apiResponse = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": cleanKey  // ← THIS, not ?key= in URL
    },
    body: JSON.stringify({ ... })
  });
  ```
- **The URL should NOT include the key:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent` (no `?key=` suffix)

### 3. Round Transition Bug (Frozen Textarea)
- **Symptom:** Advancing to round 2+ shows the textarea but it's uneditable; looks like submit was auto-pressed
- **Cause:** `submitResponse()` disables the textarea and submit button during the API call (`disabled = true`), but `renderRound()` never re-enables them when setting up the next round
- **Fix:** Added these resets to `renderRound()`:
  ```javascript
  document.getElementById("response-input").disabled = false;
  document.getElementById("submit-btn").disabled = false;
  document.getElementById("submit-btn").textContent = "SUBMIT";
  document.querySelector(".hint-btn").textContent = "SHOW HINT";
  ```

### 4. Step-Builder Spinner Keeps Spinning After Feedback (FIXED)
- **Symptom:** In the Step-Builder, the submit button stays in "ANALYZING..." state with a spinning animation even after feedback has rendered
- **Cause:** The button was only being reset in the `retryStep()` path, not in `showStepFeedback()`. On a PASS verdict, the user advances to the next step and the old button just sits there spinning.
- **Fix:** Added button reset at the top of `showStepFeedback()`:
  ```javascript
  const btn = document.getElementById(step + "-btn");
  btn.disabled = false;
  btn.textContent = "SUBMIT " + step.toUpperCase();
  ```

### 5. Gemini API Referrer Restriction Must Use Root Domain Wildcard
- **Symptom:** `Requests from referer https://dkp-810.github.io/ are blocked. [status: 403]` even though the page is at `/ap-lang-cer/`
- **Cause:** Browsers send the root origin (`https://dkp-810.github.io/`) as the HTTP referer header, not the full page path. The restriction `https://dkp-810.github.io/ap-lang-cer/*` doesn't match it.
- **Fix:** In Google Cloud Console, add `https://dkp-810.github.io/*` as an allowed referrer (keep the path-specific one too). The root domain wildcard is what actually gets matched.

### 6. Step-Builder Submit Button Allows Double-Clicks (KNOWN, NOT YET FIXED)
- **Symptom:** After feedback renders and the submit button resets, users can click SUBMIT again and fire duplicate API calls for the same text
- **Cause:** The button re-enables when feedback renders (from bug #4 fix), but isn't hidden or locked during the feedback phase
- **Recommended fix for Claude Code:** Either hide the submit button entirely when feedback is showing, or disable it when `fb-[step]` has the `.show` class. The textarea should also stay disabled while feedback is visible — only `retryStep()` should re-enable both.

---

## Architecture & Design Decisions

### Deployment Architecture
GitHub Pages serves the multi-page site (`index.html` → activity pages). The API key lives in a GitHub Actions secret and is injected into `config.js` at build time via `sed` — it never appears in the repo source. All activity pages load `config.js` and `api.js` as shared scripts.

### Gemini Free Tier Limits (as of May 2026, post-December 2025 quota cuts)
- `gemini-2.5-flash`: **20 RPD hard cap** per project (confirmed in Cloud Console) — unusable for a class
- `gemini-2.5-flash-lite`: higher RPD limit — **currently in use**
- Rate limits are per Google Cloud **project**, not per key
- Daily quotas reset at midnight Pacific Time
- A class of 30 students running 5 rounds each = ~150 requests, well within daily limits (but be mindful of the RPM cap during simultaneous use)

### LLM Feedback Prompt Design
The system prompt (stored in the `SYSTEM_PROMPT` constant) is calibrated to:
- Diagnose specific failure modes with named patterns: "The Parrot" (restating evidence), "The Echo" (restating claim), "The Drifter" (tangent), "The Generalizer" (vague), "The Summarizer" (no interpretation)
- Use three verdict levels: **PASS** (genuine analytical depth), **PUSH HARDER** (something there but surface-level), **TRY AGAIN** (restatement/tangent/not reasoning)
- Respond in JSON format: `{ "verdict", "diagnosis", "nudge" }`
- Maintain a tough-but-fair coaching tone: conversational, direct, no formal language, no bullet points
- Keep all feedback to 2-3 sentences max

### Feedback Tone Preference (Deven's Style)
For AP Lang/Psych student feedback: keep commentary very brief, conversational, direct — no formal language. Get to the core issue fast. The LLM prompt is calibrated to match this.

### The Five Rounds (Escalating Difficulty)
1. **WARM-UP:** D.A.R.E. program failure data → Curbelo's claim. Straightforward connection.
2. **STANDARD:** Climate fear imagery study → disengagement + conservative resentment. Two effects that together validate Curbelo's warning.
3. **ELEVATED:** Kennedy's Cuban Missile Crisis address + "nothing to fear" framing. Built-in tension — fear working vs. fear managed.
4. **ADVANCED:** HIV/AIDS fear campaigns driving stigmatized communities away from care. Condition-specific failure requiring nuanced reasoning.
5. **BOSS ROUND:** Civil Rights movement's dual persuasion strategy (fear for white Northern moderates, solidarity for Black communities). Requires interrogating Curbelo's buried assumption about persuader choice.

---

## Activity-Specific Design Details

### The Reasoning Gauntlet
- **Accent color:** Amber (#f59e0b)
- **Five rounds** escalating from WARM-UP to BOSS ROUND
- **Failure mode labels:** "The Parrot" (restates evidence), "The Echo" (restates claim), "The Drifter" (tangent), "The Generalizer" (vague), "The Summarizer" (no interpretation)
- **Three verdicts:** PASS, PUSH HARDER, TRY AGAIN
- Students can revise and resubmit or skip to next round

### The Diagnosis Lab
- **Accent color:** Red (#e05252)
- **Five specimens** with intentional flaws baked in
- **Two-step challenge:** Diagnose the flaw (select from 6 shuffled options) → Rewrite the broken component
- **Flaw types:** Weak Claim, Evidence Dump, Parrot Reasoning, Drifter Reasoning, Unfinished Counter, Missing Reasoning
- LLM evaluates BOTH diagnosis accuracy and rewrite quality
- Flaws escalate: obvious missing reasoning → sneaky parrot → weak claim (look UP not down) → unrebutted counter → evidence dump with five historical examples

### The C.E.R. Step-Builder
- **Accent colors:** Red (Claim), Amber (Evidence), Blue (Reasoning) — one per step
- **Linear scaffolded flow:** Write claim → get feedback → write evidence → get feedback → write reasoning → get feedback
- **Visual progress bar** with C → E → R nodes that fill in as each step passes
- **Locked sections** show previously approved work as context for the next step
- **Final screen** assembles the full paragraph with color-coded underlines marking each C.E.R. component
- Students can skip forward even without a PASS (but skipping is visually distinguished from passing)
- Includes collapsible Curbelo quote for reference
- Each step has its own tailored system prompt with step-appropriate evaluation criteria

---

## Next Steps

1. **Fix Bug #6** (Step-Builder double-click) — hide or disable the submit button while feedback is visible
2. **Consider a serverless proxy** (Netlify Functions) if the key ever needs to be truly hidden from View Source — low priority given domain restrictions already in place

### Recurring Bug Pattern: Button/Input State Management
Bugs #3, #4, and #6 all stem from the same root issue: submit buttons and textareas get `disabled = true` during API calls but aren't consistently re-enabled or hidden across all code paths (success, failure, retry, advance). **When refactoring, centralize UI state management** — a single `setPhaseState(phase)` function that handles which elements are visible, enabled, and focused for each phase would eliminate this entire class of bugs.

---

## Cheat Sheet Content Reference

The `ap_lang_argument_cheat_sheet.html` covers:
- **Claim:** Thesis (defensible, qualifiable, previews line of reasoning) + body paragraph sub-claims
- **Evidence:** Types (historical, current events, personal experience, literature, data, analogies) + what makes evidence good (specific, relevant, varied)
- **Reasoning:** Connecting evidence to claim, interpreting, advancing the argument + self-test questions
- **Counterargument & Rebuttal:** Concession + rebuttal moves, why it matters for sophistication
- **Sophistication Point:** Broader context, tension/complexity, purposeful style, nuanced thesis, insightful connections
- **Essay structure at a glance:** 5-step quick reference

Each section includes a **⚠ TRAP** callout for common student mistakes.
