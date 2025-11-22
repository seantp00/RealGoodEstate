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

        if (view === 'buy' && app.data.currPower > 0 && app.fetchListings) app.fetchListings();
    }
})();
