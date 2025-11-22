(function(){
    const app = window.app;

    // Update the mid "Key Figures" panel values (purely visual)
    app.updateKeyFigures = function(finalProjectedEquity){
        try {
            const fmtNoSymbol = (v) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(Math.round(Number(v)||0));

            const elBuyingPower = document.getElementById('key-buying-power');
            const elTargetPrice = document.getElementById('key-target-price');
            const elProjectedEq = document.getElementById('key-projected-equity');
            const elDownPayment = document.getElementById('key-down-payment');

            // Inputs sourced from existing app.data and chart math
            const buyingPower = app?.data?.currPower ?? 0;
            const targetPrice = app?.data?.target ?? 0;
            const downPay = (Number(targetPrice) || 0) * 0.20; // keep in sync with chart
            const projectedEquity = (typeof finalProjectedEquity === 'number' && isFinite(finalProjectedEquity))
                ? finalProjectedEquity
                : (app?.data?.equity ?? 0);

            if (elBuyingPower) elBuyingPower.textContent = fmtNoSymbol(buyingPower);
            if (elTargetPrice) elTargetPrice.textContent = fmtNoSymbol(targetPrice);
            if (elProjectedEq) elProjectedEq.textContent = fmtNoSymbol(projectedEquity);
            if (elDownPayment) elDownPayment.textContent = fmtNoSymbol(downPay);
        } catch (e) {
            // visual only; fail silently
        }
    }

    app.updateChart = function(monthlyRate){
        const canvas = document.getElementById('projectionChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if(app.chart) app.chart.destroy();

        const yearsArr = Array.from({length: app.data.years + 1}, (_, i) => `Year ${i}`);
        const dataCompound = [app.data.equity];
        const dataCash = [app.data.equity];

        let tempCompound = app.data.equity;
        let tempCash = app.data.equity;

        for(let y=1; y<=app.data.years; y++) {
            for(let m=0; m<12; m++) {
                tempCompound = (tempCompound * (1 + monthlyRate)) + app.data.savings;
                tempCash += app.data.savings;
            }
            dataCompound.push(tempCompound);
            dataCash.push(tempCash);
        }

        const downpaymentGoal = app.data.target * 0.20; // 20% downpayment ->
        const targetLine = new Array(app.data.years + 1).fill(downpaymentGoal);

        const allValues = dataCompound.concat(dataCash, targetLine).map(v => Number(v) || 0);
        const maxVal = Math.max(...allValues, 0);
        const minVal = Math.min(...allValues, maxVal * 0.95);
        const suggestedMax = Math.ceil(maxVal * 1.04); // 8% headroom
        const suggestedMin = Math.floor(minVal * 0.92);


        app.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: yearsArr,
                datasets: [
                    {
                        label: `Strategy (${app.data.rate}%)`,
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
                        label: `20% Downpayment - (${app.fmt(downpaymentGoal)})`,
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
                scales: {
                    y: {
                        beginAtZero: false,
                        suggestedMin: suggestedMin,
                        suggestedMax: suggestedMax,
                        ticks: {
                            callback: value => app.fmt(value)
                        }
                    }
                },

                plugins: { legend: { position: 'bottom' } }
            }
        });

        // Update mid panel to reflect current numbers (projected equity aligns with chart's final value)
        const finalProjected = dataCompound[dataCompound.length - 1] ?? app.data.equity;
        app.updateKeyFigures(finalProjected);
    };

    app.sendChat = async function(){
        const input = document.getElementById('chat-input');
        const history = document.getElementById('chat-history');
        if (!input || !history) return;
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
            const prompt = `
                Act as an Interhyp financial advisor.
                User Profile:
                - Income: €${app.data.income}
                - Savings: €${app.data.equity} (Current), €${app.data.savings}/mo
                - Family: ${app.data.marital}, ${app.data.kids} children.
                - Risk Profile: ${app.data.riskName} (${app.data.rate}% APY).
                - Goal: €${app.data.target} home in ${app.data.years} years.
                - Current Buying Power: €${app.data.currPower}.
                
                User Question: "${msg}"
                
                Instructions: Answer concisely (max 2-3 sentences). Be realistic about family costs and risk.
            `;

            const response = await app.callGemini(prompt);

            const loadEl = document.getElementById(loadId);
            if (loadEl) loadEl.remove();
            history.innerHTML += `
                <div class="flex items-start chat-bubble">
                    <div class="w-8 h-8 rounded-full bg-interhyp-blue flex items-center justify-center text-white text-xs mr-2 flex-shrink-0"><i class="fa-solid fa-robot"></i></div>
                    <div class="bg-white rounded-2xl rounded-tl-none p-3 text-sm text-slate-700 shadow-sm border border-slate-200">
                        ${response}
                    </div>
                </div>
            `;
        } catch (e) {
            const loadEl = document.getElementById(loadId);
            if (loadEl) loadEl.innerHTML = "Sorry, connection issue.";
        }
        history.scrollTop = history.scrollHeight;
    };

    app.callGemini = async function(promptText){
        const apiKey = "AIzaSyDhbrk45o9aTFMqjtiWiqP3or3N3sUI5go"; // System handles key
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        });
        const data = await response.json();
        return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.';
    };
})();
