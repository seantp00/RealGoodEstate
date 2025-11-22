(function(){
    const app = window.app;

    app.nav = function(view) {
        ['dream', 'plan', 'buy'].forEach(v => {
            const viewEl = document.getElementById(`view-${v}`);
            const navEl = document.getElementById(`nav-${v}`);
            if (viewEl) viewEl.classList.add('hidden');
            if (navEl) navEl.classList.replace('nav-active', 'nav-inactive');
        });
        const tgtView = document.getElementById(`view-${view}`);
        const tgtNav = document.getElementById(`nav-${view}`);
        if (tgtView) tgtView.classList.remove('hidden');
        if (tgtNav) tgtNav.classList.replace('nav-inactive', 'nav-active');

        // Always attempt to fetch listings when entering Buy; internal logic will decide budget and messaging
        if (view === 'buy' && app.fetchListings) app.fetchListings();
    }

    // Navigate to Buy using the dream target price as the max budget cap
    app.showDreamHomes = function(){
        // Set a one-time budget override for Buy view without mutating currPower
        if (app?.data && typeof app.data.target === 'number' && app.data.target > 0) {
            app.data.buyBudgetOverride = app.data.target;
            app.data.useBudgetOverrideOnce = true;
        } else {
            app.data.buyBudgetOverride = null;
            app.data.useBudgetOverrideOnce = false;
        }
        app.nav('buy');
    }

    // Navigate to Buy explicitly using current buying power as max budget
    app.showAffordableHomes = function(){
        if (app?.data) {
            // Clear any pending one-time override to ensure currPower is used
            app.data.buyBudgetOverride = null;
            app.data.useBudgetOverrideOnce = false;
        }
        app.nav('buy');
    }
})();
