// Tailwind config and core app state/helpers
tailwind.config = {
    theme: {
        extend: {
            colors: {
                interhyp: {
                    blue: '#005EA8',
                    dark: '#003D6E',
                    light: '#E6F2FA',
                    accent: '#00C0F3',
                    success: '#10B981',
                    warning: '#F59E0B'
                }
            },
            fontFamily: { sans: ['Inter', 'sans-serif'] }
        }
    }
};

(function(){
    const app = {
        data: {
            income: 0, equity: 0, savings: 0, location: '',
            target: 0, years: 0, rate: 5.0,
            marital: 'married', kids: 0, riskName: 'Balanced',
            currPower: 0,
            sqm: 0,
            rooms: 0,
            yearBuilt: 0,
            // One-time override for Buy view budget (do not mutate currPower)
            buyBudgetOverride: null,
            useBudgetOverrideOnce: false
        },
        chart: null,
        init() {
            // Listen for enter key on chat (if chat input exists on the current view)
            const chatInput = document.getElementById('chat-input');
            if (chatInput) {
                chatInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') app.sendChat && app.sendChat();
                });
            }
        },
        fmt(num) {
            return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(num);
        }
    };
    window.app = app;
})();
