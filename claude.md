# CLAUDE.md — AP Lang C.E.R. Practice Suite

## Project Overview

This project contains three LLM-powered practice tools for AP Language and Composition argument essay skills, targeting the **Claim → Evidence → Reasoning (C.E.R.)** framework. Built for Deven Parrish's AP Lang classes at Howell High School.

**The three activities:**
1. **The Reasoning Gauntlet** — Students get a pre-built claim + evidence pair and write *only* the reasoning. LLM diagnoses specific failure modes (The Parrot, The Generalizer, etc.). Five rounds, escalating difficulty.
2. **The Diagnosis Lab** — Students read flawed argument paragraphs, identify the flaw type from a list, then rewrite the broken component. LLM evaluates both the diagnosis and the fix. Five specimens, escalating difficulty.
3. **The C.E.R. Step-Builder** — Students write a full argument paragraph from scratch, one piece at a time (claim → evidence → reasoning). Each stage gets LLM feedback before unlocking the next. Final screen shows the assembled paragraph with color-coded C.E.R. components.

All content is thematically tied to the **2011 AP Lang Argument prompt** (Thomas Paine's *Rights of Man* — the passage about American unity despite diversity). The prompt PDF: `2011_AP_Argument_Essay_Prompt.pdf`.

---

## Files

| File | Purpose | Runtime |
|------|---------|---------|
| `ap_lang_argument_cheat_sheet.html` | One-page printable C.E.R. reference sheet for students | Static HTML, no dependencies |
| `reasoning_gauntlet.jsx` | Claude.ai artifact version of the Gauntlet | Runs inside Claude.ai chat using built-in Anthropic API access |
| `reasoning_gauntlet_standalone.html` | Deployable standalone Reasoning Gauntlet | Runs on Netlify (or any static host), uses Gemini API |
| `diagnosis_lab_standalone.html` | Deployable standalone Diagnosis Lab | Runs on Netlify, uses Gemini API |
| `step_builder_standalone.html` | Deployable standalone C.E.R. Step-Builder | Runs on Netlify, uses Gemini API |
| `gemini_key_tester.html` | Debug tool for testing Gemini API keys | Open locally — but NOTE: local file testing triggers CORS errors (see bugs) |

---

## Deployment: Standalone Activities (Netlify + Gemini)

### Setup Steps (same for all three activities)
1. Get a free Gemini API key at https://aistudio.google.com/apikey — use "Create API key in new project" for cleanest setup
2. Open the HTML file in a text editor
3. Find the CONFIG section near the top of the `<script>` block and replace `YOUR_GEMINI_API_KEY_HERE` with the actual key
4. **Each file needs the key pasted separately** — there's no shared config yet (planned for Claude Code refactor)
5. Rename the file to `index.html` (or set up a multi-page site — see "Next Steps" below)
6. Place `index.html` inside a **new empty folder** (e.g., `gauntlet/`)
7. Go to https://app.netlify.com/drop
8. Drag the **entire folder** (not the file) onto the drop zone
9. Share the resulting URL with students

### Critical Details
- **Password:** `APLangRulez` (stored in the CONFIG section, same area as API key)
- **Redeployment:** To update, go to the Netlify site → Deploys tab → drag the updated folder onto the deploy area. Dragging a single file does NOT work reliably; always use a folder.
- **API key security:** The key is embedded in client-side JavaScript. Since it's a free-tier key with rate limits, real-world risk in a classroom context is negligible. The password gate prevents casual access.

---

## Bugs Encountered & Fixes (Critical for Future Sessions)

### 1. Gemini 2.0 Flash is DEPRECATED (404 errors)
- **Symptom:** API returns 404 or misleading "API key not valid" error
- **Cause:** `gemini-2.0-flash` was deprecated February 2026, shut down March 2026
- **Fix:** Use `gemini-2.5-flash` (current stable free-tier model as of May 2026)
- **Future-proofing:** Google deprecates models aggressively. If this breaks again, check https://ai.google.dev/gemini-api/docs/models for current model strings. `gemini-2.5-flash-lite` is a fallback option with higher free-tier rate limits (15 RPM / 1,000 RPD vs Flash's 10 RPM / 250 RPD).

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

### 4. Local HTML File Testing Triggers CORS Errors
- **Symptom:** `gemini_key_tester.html` opened locally via `file://` shows "Failed to fetch" / "CORS error"
- **Cause:** Browsers block cross-origin requests from `file://` origins. This is a browser security policy, not an API issue.
- **Workaround:** Test from a deployed URL (Netlify) or use a local dev server (`python3 -m http.server`). The key tester is useful for deployed debugging but misleading when opened locally.

### 5. Netlify Deployment Requires a Folder
- **Symptom:** Dragging a single HTML file to Netlify sometimes doesn't update the site or produces errors
- **Fix:** Always place `index.html` inside a folder and drag the folder to the Netlify drop zone. This is consistent and reliable.

### 6. Step-Builder Spinner Keeps Spinning After Feedback (FIXED)
- **Symptom:** In the Step-Builder, the submit button stays in "ANALYZING..." state with a spinning animation even after feedback has rendered
- **Cause:** The button was only being reset in the `retryStep()` path, not in `showStepFeedback()`. On a PASS verdict, the user advances to the next step and the old button just sits there spinning.
- **Fix:** Added button reset at the top of `showStepFeedback()`:
  ```javascript
  const btn = document.getElementById(step + "-btn");
  btn.disabled = false;
  btn.textContent = "SUBMIT " + step.toUpperCase();
  ```

### 7. Step-Builder Submit Button Allows Double-Clicks (KNOWN, NOT YET FIXED)
- **Symptom:** After feedback renders and the submit button resets, users can click SUBMIT again and fire duplicate API calls for the same text
- **Cause:** The button re-enables when feedback renders (from bug #6 fix), but isn't hidden or locked during the feedback phase
- **Recommended fix for Claude Code:** Either hide the submit button entirely when feedback is showing, or disable it when `fb-[step]` has the `.show` class. The textarea should also stay disabled while feedback is visible — only `retryStep()` should re-enable both.

---

## Architecture & Design Decisions

### Two Versions Exist for Different Use Cases
- **JSX version (Claude.ai):** Uses Anthropic's built-in API access inside artifacts. No API key needed. Best for whole-class live demos where the teacher drives the activity on their own Claude account.
- **Standalone HTML (Netlify):** Uses Gemini free tier. Each student accesses independently via URL. Best for individual practice.

### Gemini Free Tier Limits (as of May 2026, post-December 2025 quota cuts)
- `gemini-2.5-flash`: 10 RPM, 250 RPD
- `gemini-2.5-flash-lite`: 15 RPM, 1,000 RPD (lighter model, higher limits)
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
1. **WARM-UP:** Political polarization data → Paine's ideal. Straightforward connection.
2. **STANDARD:** Income inequality + declining mobility → "the poor are not oppressed." Two data points that work together.
3. **ELEVATED:** Peaceful power transfers + Jan 6th. Built-in tension requiring engagement with both sides.
4. **ADVANCED:** Immigrant cities' economic growth + residential segregation. Qualified claim requiring nuanced reasoning.
5. **BOSS ROUND:** Constitution + Three-Fifths Compromise → unresolved founding tension. Requires tracing through-lines across time.

---

## Activity-Specific Design Details

### The Reasoning Gauntlet
- **Accent color:** Amber (#f59e0b)
- **Five rounds** escalating from WARM-UP to BOSS ROUND
- **Failure mode labels:** "The Parrot" (restates evidence), "The Echo" (restates claim), "The Drifter" (tangent), "The Generalizer" (vague), "The Summarizer" (no interpretation)
- **Three verdicts:** PASS, PUSH HARDER, TRY AGAIN
- Students can revise and resubmit or skip to next round
- Has a JSX artifact version for whole-class demos in Claude.ai

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
- Includes collapsible Paine passage for reference
- Each step has its own tailored system prompt with step-appropriate evaluation criteria

---

## Next Steps (Claude Code Refactor)

The current architecture is three standalone HTML files. The planned refactor (to be done in Claude Code) should:

1. **Create a landing page** (`index.html`) with links to all three activities + the cheat sheet
2. **Extract shared code:**
   - `config.js` — API key and password (set once, used everywhere)
   - `styles.css` — shared dark theme, typography, button styles
   - `api.js` — shared Gemini API call function with error handling and header auth
3. **Add a back-to-home button** on each activity page
4. **Consider a serverless proxy** (Netlify Functions) to hide the API key from client-side code
5. **Folder structure:**
   ```
   /
   ├── index.html (landing page)
   ├── gauntlet.html
   ├── diagnosis-lab.html
   ├── step-builder.html
   ├── cheat-sheet.html
   ├── config.js
   ├── styles.css
   └── api.js
   ```

All bugs documented below are already fixed in the current standalone files (except #7). The Claude Code session should carry these fixes forward.

### Recurring Bug Pattern: Button/Input State Management
Three of the seven bugs (#3, #6, #7) stem from the same root issue: submit buttons and textareas get `disabled = true` during API calls but aren't consistently re-enabled or hidden across all code paths (success, failure, retry, advance). **When refactoring, centralize UI state management** — a single `setPhaseState(phase)` function that handles which elements are visible, enabled, and focused for each phase would eliminate this entire class of bugs.

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
