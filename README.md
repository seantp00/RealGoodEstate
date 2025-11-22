# RealGoodEstate

Here you get the plan on how to make a lot of money and join the group - so stay tuned

## 🤖 NEW: AI/ML Backend Integration

This project now uses **Python Machine Learning** for intelligent predictions! The backend server uses:
- **NumPy** for numerical computations
- **Scikit-learn** for ML algorithms (Polynomial Regression & Linear Regression)
- **Flask** for REST API

### Quick Start (Backend Server)

1. **Install Python dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Start the ML server:**
   ```bash
   python server.py
   ```
   OR double-click `start_server.bat`

3. **Open the frontend:**
   - Open `app.html` in your browser
   - The frontend will automatically connect to the backend at `http://localhost:5000`

📖 See [backend/README.md](backend/README.md) for detailed documentation.

## Project Structure (Modular Architecture)

### HTML Files
- **app.html** — Main shell page that dynamically loads partial views
- **views/navigation.html** — Top navigation bar (RealGoodEstate brand and step buttons)
- **views/dream.html** — View 1: input form for finances, family, and risk selection (id=view-dream)
- **views/plan.html** — View 2: analysis dashboard, chart, and AI assistant chat (id=view-plan)
- **views/buy.html** — View 3: real estate listings section (id=view-buy)

### JavaScript Files
- **js/core.js** — Core app state, Tailwind config, initialization, and formatting helpers
- **js/navigation.js** — Navigation logic (view switching)
- **js/dream.js** — Dream view logic (risk selection, analysis calculations, slider updates)
- **js/plan.js** — Plan view logic (chart updates, AI chat functionality)
- **js/buy.js** — Buy view logic (property listings fetch and render)
- **js/script.js** — Legacy monolithic file (NO LONGER USED - kept for reference only)

### CSS Files
- **css/style.css** — Custom styles (Tailwind utilities provided via CDN)

## How It Works

app.html dynamically loads the four partial HTML files at runtime:

1. The body contains containers: `#nav-container`, `#dream-container`, `#plan-container`, `#buy-container`
2. A loader script fetches navigation.html, dream.html, plan.html, and buy.html into those containers
3. After loading the partials, `app.init()` is called to attach event listeners
4. Each JS module extends the global `window.app` object with its specific functionality

## Load Order

1. app.html registers the partial loader on `DOMContentLoaded`
2. core.js is loaded first (defines `window.app`)
3. Individual module JS files are loaded (navigation.js, dream.js, plan.js, buy.js)
4. The partials are fetched and injected into their containers (HTML only, no inline scripts)
5. After all partials are loaded, `app.init()` runs

## Development Notes

- **No inline scripts** in HTML partials - all JavaScript is in separate .js files
- Keep IDs and classes stable; JS modules look up elements by IDs (e.g., view-dream, view-plan, view-buy, nav-dream, etc.)
- Each view's logic is self-contained in its corresponding JS file
- All functions are attached to the global `app` object to avoid conflicts
- If you add new sections, create a new partial HTML and corresponding JS file

## Architecture Benefits

- **No code duplication** - functions defined once in modular JS files
- **Clean separation** - HTML contains only markup, JS contains only logic
- **Easy maintenance** - each view's logic is in its own file
- **Better debugging** - clear file structure makes issues easier to locate
- **Reusability** - functions can be called from any view through the `app` object

## Function Organization

### core.js
- `app.data` - Global state object
- `app.init()` - Initialize event listeners
- `app.fmt()` - Currency formatting helper

### navigation.js
- `app.nav(view)` - Switch between views

### dream.js
- `app.setRisk(level, el)` - Update risk profile
- `app.runAnalysis()` - Calculate buying power and metrics
- Slider update functionality for years input

### plan.js
- `app.updateChart(monthlyRate)` - Update equity projection chart
- `app.sendChat()` - Handle AI assistant chat
- `app.callGemini(promptText)` - API call to Gemini AI

### buy.js
- `app.fetchListings()` - Fetch properties from ThinkImmo API
- `app.renderListings(items)` - Render property cards

