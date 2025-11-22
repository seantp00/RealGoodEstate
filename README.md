# RealGoodEstate

Here you get the plan on how to make a lot of money and join the group - so stay tuned

Project structure update (modular HTML):

- navigation.html — Top navigation bar (RealGoodEstate brand and step buttons)
- dream.html — View 1: input form for finances, family, and risk selection (id=view-dream)
- plan.html — View 2: analysis dashboard, chart, and AI assistant chat (id=view-plan)
- buy.html — View 3: real estate listings section (id=view-buy)
- app.html — Shell page that dynamically includes the above partials
- script.js — Application logic (navigation, analysis, listings)
- style.css — Styles (including Tailwind utilities provided via CDN)

How includes work:

app.html loads the four partial files at runtime:

1. The body contains containers: #nav-container, #dream-container, #plan-container, #buy-container.
2. A small script fetches navigation.html, dream.html, plan.html, and buy.html into those containers.
3. After loading the partials, app.init() is called to attach any event listeners.

Notes for development:

- Keep IDs and classes stable; script.js looks up elements by IDs (e.g., view-dream, view-plan, view-buy, nav-dream, etc.).
- If you add new sections, prefer adding a new partial and include it in the loader list in app.html.
- script.js initialization is null-safe and only binds chat handlers if the chat input exists on the current view.
