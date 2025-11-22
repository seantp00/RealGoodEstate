# RealGoodEstate

Here you get the plan on how to make a lot of money and join the group - so stay tuned

Project structure update (HTML partials + embedded JS):

- navigation.html — Top navigation bar (RealGoodEstate brand and step buttons) + inline navigation logic
- dream.html — View 1: input form for finances, family, and risk selection (id=view-dream) + inline analysis/risk logic
- plan.html — View 2: analysis dashboard, chart, and AI assistant chat (id=view-plan) + inline chart and chat logic
- buy.html — View 3: real estate listings section (id=view-buy) + inline listings logic
- app.html — Shell page that dynamically includes the above partials and executes their inline scripts
- core.js — Core app state, Tailwind config, init and formatting helpers
- style.css — Styles (including Tailwind utilities provided via CDN)

How includes work:

app.html loads the four partial files at runtime:

1. The body contains containers: #nav-container, #dream-container, #plan-container, #buy-container.
2. A small script fetches navigation.html, dream.html, plan.html, and buy.html into those containers and safely injects their embedded <script> blocks so they execute.
3. After loading the partials, app.init() is called to attach any event listeners.

Notes for development:

- Keep IDs and classes stable; the JS modules look up elements by IDs (e.g., view-dream, view-plan, view-buy, nav-dream, etc.).
- If you add new sections, prefer adding a new partial and include it in the loader list in app.html.
- Initialization: app.init() is called after partials load; it safely binds chat handlers only if the input exists.

Load order (important):

1. app.html registers the partial loader on DOMContentLoaded.
2. core.js is loaded (defines window.app).
3. The partials are fetched; each partial’s inline scripts are executed as they are injected.
4. After all partials are injected, app.init() runs.

Legacy notes:
- Earlier versions split logic into separate navigation.js, dream.js, plan.js, and buy.js files. That logic is now embedded within the corresponding HTML partials.
- The old script.js remains in the repository for reference and is not referenced by app.html.
