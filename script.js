tailwind.config = {
    theme: {
        extend: {
            colors: {
                interhyp: {
                    blue: '#005EA8',    // Corporate Blue
                    dark: '#003D6E',    // Deep Blue
                    light: '#E6F2FA',   // Light Background
                    accent: '#00C0F3',  // Cyan Accent
                    success: '#10B981',
                    warning: '#F59E0B'
                }
            },
            fontFamily: { sans: ['Inter', 'sans-serif'] }
        }
    }
}

const app = {
    data: {
        income: 0, equity: 0, savings: 0, location: '',
        target: 0, years: 0, rate: 5.0, // Default Balanced
        marital: 'married', kids: 0, riskName: 'Balanced',
        currPower: 0
    },
    chart: null,

    init() {
        // Listen for enter key on chat (if chat input exists on the current view)
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if(e.key === 'Enter') app.sendChat();
            });
        }
    },

    nav(view) {
        ['dream', 'plan', 'buy'].forEach(v => {
            document.getElementById(`view-${v}`).classList.add('hidden');
            document.getElementById(`nav-${v}`).classList.replace('nav-active', 'nav-inactive');
        });
        document.getElementById(`view-${view}`).classList.remove('hidden');
        document.getElementById(`nav-${view}`).classList.replace('nav-inactive', 'nav-active');

        if(view === 'buy' && this.data.currPower > 0) this.fetchListings();
    },

    setRisk(level, el) {
        // UI Update
        document.querySelectorAll('.risk-card').forEach(c => c.classList.remove('selected', 'bg-F0F9FF', 'border-interhyp-blue'));
        el.classList.add('selected');

        // Logic Update
        const warning = document.getElementById('risk-warning');
        if(level === 'low') {
            this.data.rate = 2.5;
            this.data.riskName = 'Conservative';
            warning.innerText = "Low risk selected. Returns may not beat high inflation.";
        } else if(level === 'med') {
            this.data.rate = 5.0;
            this.data.riskName = 'Balanced';
            warning.innerText = "Balanced strategy selected. Moderate market exposure.";
        } else {
            this.data.rate = 7.5;
            this.data.riskName = 'Aggressive';
            warning.innerText = "Warning: High risk selected. Capital loss is possible.";
        }
    },

    runAnalysis() {
        // 1. Gather Inputs
        this.data.income = parseFloat(document.getElementById('inp-income').value);
        this.data.equity = parseFloat(document.getElementById('inp-equity').value);
        this.data.savings = parseFloat(document.getElementById('inp-savings').value);
        this.data.location = document.getElementById('inp-location').value;
        this.data.target = parseFloat(document.getElementById('inp-target').value);
        this.data.years = parseInt(document.getElementById('inp-years').value);
        this.data.marital = document.getElementById('inp-marital').value;
        this.data.kids = parseInt(document.getElementById('inp-kids').value);

        // ---------------------------------------------------------
        // METRIC 1: FAMILY-ADJUSTED BUYING POWER
        // ---------------------------------------------------------
        // Bank Logic: Net Income - Living Costs = Disposable for Loan
        // Estimates: Adult 2 costs ~400, Child costs ~300
        let costDeduction = 0;
        if(this.data.marital === 'married') costDeduction += 400;
        costDeduction += (this.data.kids * 300);
        
        const adjustedIncome = Math.max(1000, this.data.income - costDeduction);
        
        // Multiplier 90x monthly disposable income + Equity
        this.data.currPower = Math.floor((adjustedIncome * 90) + this.data.equity);

        // ---------------------------------------------------------
        // METRIC 2: READINESS (Quadratic)
        // ---------------------------------------------------------
        const ratio = this.data.currPower / this.data.target;
        let readiness = ratio >= 1.0 ? 100 : Math.max(0, Math.floor(100 * Math.pow(ratio, 2)));

        // ---------------------------------------------------------
        // METRIC 3: EQUITY PROJECTION (Compound Interest)
        // ---------------------------------------------------------
        const monthlyRate = (this.data.rate / 100) / 12;
        const months = this.data.years * 12;
        let futureEquity = this.data.equity;
        
        for(let i=0; i<months; i++) {
            futureEquity = (futureEquity * (1 + monthlyRate)) + this.data.savings;
        }
        
        // ---------------------------------------------------------
        // METRIC 4: LIKELIHOOD (Logistic)
        // ---------------------------------------------------------
        const futurePower = (adjustedIncome * 90) + futureEquity;
        const coverage = futurePower / this.data.target;
        let likelihood = Math.max(10, Math.floor(100 / (1 + Math.exp(-10 * (coverage - 0.85)))));
        if(futurePower >= this.data.target) likelihood = 98;

        // ---------------------------------------------------------
        // UI UPDATES
        // ---------------------------------------------------------
        document.getElementById('out-readiness').innerText = readiness + "%";
        document.getElementById('bar-readiness').style.width = readiness + "%";
        document.getElementById('txt-power').innerText = this.fmt(this.data.currPower);
        document.getElementById('cta-power').innerText = this.fmt(this.data.currPower);

        document.getElementById('out-likelihood').innerText = likelihood + "%";
        document.getElementById('bar-likelihood').style.width = likelihood + "%";
        document.getElementById('txt-year').innerText = this.data.years;
        document.getElementById('disp-risk-name').innerText = this.data.riskName;

        document.getElementById('out-final-equity').innerText = this.fmt(futureEquity);
        
        // Update Chat Context Text
        const familyText = this.data.marital === 'married' ? `married with ${this.data.kids} kids` : `single with ${this.data.kids} kids`;
        document.getElementById('chat-status-text').innerText = familyText;
        document.getElementById('chat-risk-text').innerText = this.data.riskName;

        // Family Label
        document.getElementById('disp-family').innerText = this.data.marital === 'married' ? 'Family' : 'Household';

        this.updateChart(monthlyRate);
        this.nav('plan');
    },

    updateChart(monthlyRate) {
        const ctx = document.getElementById('projectionChart').getContext('2d');
        if(this.chart) this.chart.destroy();

        const yearsArr = Array.from({length: this.data.years + 1}, (_, i) => `Year ${i}`);
        const dataCompound = [this.data.equity];
        const dataCash = [this.data.equity]; 
        
        let tempCompound = this.data.equity;
        let tempCash = this.data.equity;

        for(let y=1; y<=this.data.years; y++) {
            for(let m=0; m<12; m++) {
                tempCompound = (tempCompound * (1 + monthlyRate)) + this.data.savings;
                tempCash += this.data.savings;
            }
            dataCompound.push(tempCompound);
            dataCash.push(tempCash);
        }

        const downpaymentGoal = this.data.target * 0.20;
        const targetLine = new Array(this.data.years + 1).fill(downpaymentGoal);

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: yearsArr,
                datasets: [
                    {
                        label: `Strategy (${this.data.rate}%)`,
                        data: dataCompound,
                        borderColor: '#005EA8',
                        backgroundColor: 'rgba(0, 94, 168, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Cash Savings',
                        data: dataCash,
                        borderColor: '#94A3B8',
                        borderDash: [5, 5],
                        fill: false
                    },
                    {
                        label: '20% Downpayment',
                        data: targetLine,
                        borderColor: '#F59E0B',
                        borderDash: [2, 2],
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    },

    async sendChat() {
        const input = document.getElementById('chat-input');
        const history = document.getElementById('chat-history');
        const msg = input.value.trim();
        if (!msg) return;

        // User Bubble
        history.innerHTML += `
            <div class="flex items-start justify-end chat-bubble">
                <div class="bg-interhyp-dark text-white rounded-2xl rounded-tr-none p-3 text-sm max-w-[85%] shadow-md">
                    ${msg}
                </div>
            </div>
        `;
        input.value = '';
        history.scrollTop = history.scrollHeight;

        // Loading Bubble
        const loadId = 'l-' + Date.now();
        history.innerHTML += `
            <div class="flex items-start chat-bubble" id="${loadId}">
                <div class="w-8 h-8 rounded-full bg-interhyp-blue flex items-center justify-center text-white text-xs mr-2"><i class="fa-solid fa-robot"></i></div>
                <div class="bg-white rounded-2xl rounded-tl-none p-3 text-sm text-slate-700 shadow-sm border border-slate-200 flex items-center">
                    <div class="loader" style="width:14px; height:14px; border-width:2px;"></div><span class="ml-2">Analyzing...</span>
                </div>
            </div>
        `;
        history.scrollTop = history.scrollHeight;

        try {
            // Construct Context-Aware Prompt
            const prompt = `
                Act as an Interhyp financial advisor.
                User Profile:
                - Income: €${this.data.income}
                - Savings: €${this.data.equity} (Current), €${this.data.savings}/mo
                - Family: ${this.data.marital}, ${this.data.kids} children.
                - Risk Profile: ${this.data.riskName} (${this.data.rate}% APY).
                - Goal: €${this.data.target} home in ${this.data.years} years.
                - Current Buying Power: €${this.data.currPower}.
                
                User Question: "${msg}"
                
                Instructions: Answer concisely (max 2-3 sentences). Be realistic about family costs and risk.
            `;
            
            const response = await this.callGemini(prompt);
            
            document.getElementById(loadId).remove();
            history.innerHTML += `
                <div class="flex items-start chat-bubble">
                    <div class="w-8 h-8 rounded-full bg-interhyp-blue flex items-center justify-center text-white text-xs mr-2 flex-shrink-0"><i class="fa-solid fa-robot"></i></div>
                    <div class="bg-white rounded-2xl rounded-tl-none p-3 text-sm text-slate-700 shadow-sm border border-slate-200">
                        ${response}
                    </div>
                </div>
            `;
        } catch (e) {
            document.getElementById(loadId).innerHTML = "Sorry, connection issue.";
        }
        history.scrollTop = history.scrollHeight;
    },

    async callGemini(promptText) {
        const apiKey = ""; // System handles key
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        });
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    },

    async fetchListings() {
        const grid = document.getElementById('listings-grid');
        const msg = document.getElementById('listings-msg');
        
        document.getElementById('api-loc').innerText = this.data.location;
        document.getElementById('api-budget').innerText = this.fmt(this.data.currPower);

        grid.innerHTML = '<div class="col-span-full h-64 flex flex-col items-center justify-center text-slate-400"><div class="loader mb-4"></div><p>Scanning Market via ThinkImmo...</p></div>';
        msg.classList.add('hidden');

        const payload = {
            "active": true,
            "type": "APPARTMENTBUY",
            "sortBy": "asc",
            "sortKey": "buyingPrice",
            "from": 0,
            "size": 100,
            "geoSearches": { "geoSearchQuery": this.data.location, "geoSearchType": "city" }
        };

        try {
            const res = await fetch('https://thinkimmo-api.mgraetz.de/thinkimmo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("API Error");
            const data = await res.json();
            const allListings = data.results || [];
            const matches = allListings.filter(l => l.buyingPrice <= this.data.currPower && l.buyingPrice > 0);
            this.renderListings(matches);
        } catch (e) {
            grid.innerHTML = '';
            msg.innerHTML = `Connection Error or No Data.`;
            msg.classList.remove('hidden');
        }
    },

    renderListings(items) {
        const grid = document.getElementById('listings-grid');
        const msg = document.getElementById('listings-msg');
        grid.innerHTML = '';

        if(items.length === 0) {
            msg.innerHTML = `No properties found under <b>${this.fmt(this.data.currPower)}</b> in ${this.data.location}.`;
            msg.classList.remove('hidden');
            return;
        }

        items.slice(0, 8).forEach(item => {
            const img = (item.images && item.images.length > 0) ? item.images[0].originalUrl : 'https://placehold.co/600x400/E6F2FA/005EA8?text=Listing';
            grid.innerHTML += `
                <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all group">
                    <div class="h-48 bg-slate-100 relative overflow-hidden">
                        <img src="${img}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onerror="this.src='https://placehold.co/600x400/E6F2FA/005EA8?text=No+Image'">
                        <div class="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/60 to-transparent p-3">
                            <span class="text-white font-bold">${this.fmt(item.buyingPrice)}</span>
                        </div>
                    </div>
                    <div class="p-4">
                        <h4 class="font-bold text-slate-800 text-sm truncate mb-1">${item.title || 'Apartment'}</h4>
                        <p class="text-xs text-slate-500 mb-3"><i class="fa-solid fa-map-pin"></i> ${item.address.city}</p>
                        <div class="flex justify-between text-xs text-slate-600 border-t pt-2">
                            <span>${item.rooms} Rooms</span>
                            <span>${Math.round(item.squareMeter)} m²</span>
                        </div>
                    </div>
                </div>
            `;
        });
    },

    fmt(num) {
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(num);
    }
};

window.onload = () => app.init();