(function(){
    const app = window.app;

    // Calculate required monthly savings to reach down payment goal
    app.calculateRequiredSavings = function(downPaymentGoal, currentEquity, years, monthlyRate) {
        const totalMonths = years * 12;

        // For cash (non-invested): simple calculation
        // Final = currentEquity + (monthlySavings * totalMonths)
        // monthlySavings = (downPaymentGoal - currentEquity) / totalMonths
        const requiredCash = totalMonths > 0
            ? Math.max(0, (downPaymentGoal - currentEquity) / totalMonths)
            : 0;

        // For invested: compound interest formula
        // Final = currentEquity * (1 + r)^n + monthlySavings * [((1 + r)^n - 1) / r]
        // Solving for monthlySavings:
        // monthlySavings = (downPaymentGoal - currentEquity * (1 + r)^n) / [((1 + r)^n - 1) / r]
        let requiredInvested = 0;
        if (totalMonths > 0 && monthlyRate > 0) {
            const raisedRate = Math.pow(1 + monthlyRate, totalMonths);
            const futureValueOfCurrentEquity = currentEquity * raisedRate;
            const annuityFactor = (raisedRate - 1) / monthlyRate;

            if (annuityFactor > 0) {
                requiredInvested = Math.max(0, (downPaymentGoal - futureValueOfCurrentEquity) / annuityFactor);
            } else {
                requiredInvested = requiredCash; // fallback to cash calculation
            }
        } else if (totalMonths > 0) {
            // If no interest rate, same as cash
            requiredInvested = requiredCash;
        }

        return {
            requiredCash: requiredCash,
            requiredInvested: requiredInvested
        };
    };

    // Calculate time in years to reach a goal based on current savings
    app.calculateTimeToGoal = function(downPaymentGoal, currentEquity, currentMonthlySaving, monthlyRate) {
        const needed = downPaymentGoal - currentEquity;
        if (needed <= 0) {
            return { timeToGoalCash: 0, timeToGoalInvested: 0 };
        }

        // --- Cash Calculation ---
        let timeToGoalCash = Infinity;
        if (currentMonthlySaving > 0) {
            const monthsCash = Math.ceil(needed / currentMonthlySaving);
            timeToGoalCash = monthsCash / 12;
        }

        // --- Invested Calculation (Iterative) ---
        let timeToGoalInvested = Infinity;
        // Goal can be reached if savings are positive, or if current equity grows on its own
        if (currentMonthlySaving > 0 || (currentEquity > 0 && monthlyRate > 0)) {
            let investedEquity = currentEquity;
            let monthsInvested = 0;
            const maxMonths = 50 * 12; // 50 year limit to prevent infinite loops

            while (investedEquity < downPaymentGoal && monthsInvested < maxMonths) {
                investedEquity = (investedEquity * (1 + monthlyRate)) + currentMonthlySaving;
                monthsInvested++;
            }

            if (monthsInvested < maxMonths) {
                timeToGoalInvested = monthsInvested / 12;
            }
        }

        return {
            timeToGoalCash: timeToGoalCash,
            timeToGoalInvested: timeToGoalInvested
        };
    };


    // Update the mid "Key Figures" panel values (purely visual)
    app.updateKeyFigures = function(finalProjectedEquity, monthlyRate){
        try {
            const fmtNoSymbol = (v) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(Math.round(Number(v)||0));
            const fmtYears = (y) => {
                if (!isFinite(y)) return '∞';
                if (y < 0) return '0.0';
                return new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(y);
            };

            const elBuyingPower = document.getElementById('key-buying-power');
            const elTargetPrice = document.getElementById('key-target-price');
            const elProjectedEq = document.getElementById('key-projected-equity');
            const elDownPayment = document.getElementById('key-down-payment');
            const elRequiredInvested = document.getElementById('key-required-invested');
            const elRequiredCash = document.getElementById('key-required-cash');
            const elTimeToGoalInvested = document.getElementById('key-time-invested');
            const elTimeToGoalCash = document.getElementById('key-time-cash');

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

            // Calculate and display required monthly savings rates
            const currentEquity = app?.data?.equity ?? 0;
            const years = app?.data?.years ?? 1;
            const rate = monthlyRate ?? 0;

            const requiredSavings = app.calculateRequiredSavings(downPay, currentEquity, years, rate);

            if (elRequiredInvested) elRequiredInvested.textContent = fmtNoSymbol(requiredSavings.requiredInvested);
            if (elRequiredCash) elRequiredCash.textContent = fmtNoSymbol(requiredSavings.requiredCash);

            // Calculate and display time to goal based on CURRENT savings
            const currentSavings = app?.data?.savings ?? 0;
            const timeToGoal = app.calculateTimeToGoal(downPay, currentEquity, currentSavings, rate);

            if (elTimeToGoalInvested) elTimeToGoalInvested.textContent = fmtYears(timeToGoal.timeToGoalInvested);
            if (elTimeToGoalCash) elTimeToGoalCash.textContent = fmtYears(timeToGoal.timeToGoalCash);

        } catch (e) {
            // visual only; fail silently
        }
    }

    // Generate projection data for a given number of years
    app.generateProjectionData = function(years, monthlyRate) {
        const yearsArr = Array.from({length: years + 1}, (_, i) => `Year ${i}`);
        const dataCompound = [app.data.equity];
        const dataCash = [app.data.equity];

        let tempCompound = app.data.equity;
        let tempCash = app.data.equity;

        for(let y=1; y<=years; y++) {
            for(let m=0; m<12; m++) {
                tempCompound = (tempCompound * (1 + monthlyRate)) + app.data.savings;
                tempCash += app.data.savings;
            }
            dataCompound.push(tempCompound);
            dataCash.push(tempCash);
        }

        const downpaymentGoal = app.data.target * 0.20;
        const targetLine = new Array(years + 1).fill(downpaymentGoal);

        const requiredSavings = app.calculateRequiredSavings(downpaymentGoal, app.data.equity, years, monthlyRate);

        const dataRequiredInvested = [app.data.equity];
        let tempRequiredInvested = app.data.equity;
        for(let y=1; y<=years; y++) {
            for(let m=0; m<12; m++) {
                tempRequiredInvested = (tempRequiredInvested * (1 + monthlyRate)) + requiredSavings.requiredInvested;
            }
            dataRequiredInvested.push(tempRequiredInvested);
        }

        const dataRequiredCash = [app.data.equity];
        let tempRequiredCash = app.data.equity;
        for(let y=1; y<=years; y++) {
            for(let m=0; m<12; m++) {
                tempRequiredCash += requiredSavings.requiredCash;
            }
            dataRequiredCash.push(tempRequiredCash);
        }

        return {
            yearsArr,
            dataCompound,
            dataCash,
            dataRequiredInvested,
            dataRequiredCash,
            targetLine,
            downpaymentGoal,
            requiredSavings
        };
    };

    // Redraw chart with a specific number of years
    app.redrawChartWithYears = function(years, monthlyRate) {
        console.log('[Redraw Chart] Starting redraw with years:', years, 'rate:', monthlyRate);
        const canvas = document.getElementById('projectionChart');
        if (!canvas) {
            console.warn('[Redraw Chart] Canvas element not found!');
            return;
        }
        const ctx = canvas.getContext('2d');
        if(app.chart) app.chart.destroy();

        const projData = app.generateProjectionData(years, monthlyRate);
        const { yearsArr, dataCompound, dataCash, dataRequiredInvested, dataRequiredCash, targetLine, downpaymentGoal, requiredSavings } = projData;

        const allValues = dataCompound.concat(dataCash, targetLine, dataRequiredInvested, dataRequiredCash).map(v => Number(v) || 0);
        const maxVal = Math.max(...allValues, 0);
        const minVal = Math.min(...allValues, maxVal * 0.95);
        const suggestedMax = Math.ceil(maxVal * 1.04);
        const suggestedMin = Math.floor(minVal * 0.92);

        app.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: yearsArr,
                datasets: [
                    {
                        label: `Current Rate Invested (${app.data.rate}%)`,
                        data: dataCompound,
                        borderColor: '#005EA8',
                        backgroundColor: 'rgba(0, 94, 168, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Current Rate Cash',
                        data: dataCash,
                        borderColor: '#94A3B8',
                        borderDash: [5, 5],
                        fill: false
                    },
                    {
                        label: `Required Rate Invested (€${app.fmt(requiredSavings.requiredInvested)}/mo)`,
                        data: dataRequiredInvested,
                        borderColor: '#16A34A',
                        borderWidth: 2,
                        borderDash: [8, 4],
                        fill: false,
                        tension: 0.4,
                        pointRadius: 3,
                        pointBackgroundColor: '#16A34A'
                    },
                    {
                        label: `Required Rate Cash (€${app.fmt(requiredSavings.requiredCash)}/mo)`,
                        data: dataRequiredCash,
                        borderColor: '#F59E0B',
                        borderWidth: 2,
                        borderDash: [8, 4],
                        fill: false,
                        pointRadius: 3,
                        pointBackgroundColor: '#F59E0B'
                    },
                    {
                        label: `20% Downpayment Goal (${app.fmt(downpaymentGoal)})`,
                        data: targetLine,
                        borderColor: '#DC2626',
                        borderDash: [2, 2],
                        pointRadius: 0,
                        borderWidth: 2
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

        const finalProjected = dataCompound[dataCompound.length - 1] ?? app.data.equity;
        app.updateKeyFigures(finalProjected, monthlyRate);
        console.log('[Redraw Chart] Chart redrawn successfully');
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
                
                Instructions: Answer in English. Answer concisely (max 2-3 sentences). Be realistic about family costs and risk.
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


        ///// First API call to Gemini - generate initial advice based on user profile

    app.hasGeneratedFirstAdvice = false;

    app.generateFirstAIText = async function(){
        if (app.hasGeneratedFirstAdvice) return;

        const history = document.getElementById('chat-history');
        if (!history) return;

        app.hasGeneratedFirstAdvice = true;

        // Loading Bubble
        const loadId = 'l-init-' + Date.now();
        history.innerHTML += `
                <div class="flex items-start chat-bubble" id="${loadId}">
                    <div class="w-8 h-8 rounded-full bg-interhyp-blue flex items-center justify-center text-white text-xs mr-2"><i class="fa-solid fa-robot"></i></div>
                    <div class="bg-white rounded-2xl rounded-tl-none p-3 text-sm text-slate-700 shadow-sm border border-slate-200 flex items-center">
                        <div class="loader" style="width:14px; height:14px; border-width:2px;"></div><span class="ml-2">Analyzing profile...</span>
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

                Instruction: Answer in English. Begin the response with 'Here are some steps you can take to increase your
                purchasing power: '. Only display 3 concise financial steps the user can take to increase his buying power and his equity as 
                fast as possible based on his current situation, taking into account the provided values. Provide these 3
                 steps in a list format with each step beginning with 1. or 2. or 3. . Do not include any prelude or
                  introduction or conclusion. I only need the steps themselves. Keep each step as concise as possible, don't use any filler words or phrases.
            `;

            const response = await app.callGemini(prompt);

            const formattedResponse = response
                .replace(/1\./g, '<br>1.')
                .replace(/2\./g, '<br>2.')
                .replace(/3\./g, '<br>3.');

            const loadEl = document.getElementById(loadId);
            if (loadEl) loadEl.remove();

            history.innerHTML += `
                    <div class="flex items-start chat-bubble">
                        <div class="w-8 h-8 rounded-full bg-interhyp-blue flex items-center justify-center text-white text-xs mr-2 flex-shrink-0"><i class="fa-solid fa-robot"></i></div>
                        <div class="bg-white rounded-2xl rounded-tl-none p-3 text-sm text-slate-700 shadow-sm border border-slate-200">
                            ${formattedResponse}
                        </div>
                    </div>
                `;
        } catch (e) {
            const loadEl = document.getElementById(loadId);
            if (loadEl) loadEl.remove();
        }
        history.scrollTop = history.scrollHeight;
    };


        ///End of first API call to Gemini - generate initial advice based on user profile


        app.callGemini = async function(promptText){
        const apiKey = "AIzaSyDhbrk45o9aTFMqjtiWiqP3or3N3sUI5go"; // System handles key
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({contents: [{parts: [{text: promptText}]}]})
        });
        const data = await response.json();
        return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.';
    };

    // Initialize slider functionality - attach immediately and on DOM changes
    app.initChartSlider = function() {
        const sliderEl = document.getElementById('chart-year-slider');
        const sliderLabelEl = document.getElementById('chart-slider-label');

        console.log('[Slider Init] sliderEl found:', !!sliderEl, 'sliderLabelEl found:', !!sliderLabelEl);

        if (sliderEl && sliderLabelEl) {
            // Remove any existing listeners to avoid duplicates
            if (app.sliderInputHandler) {
                sliderEl.removeEventListener('input', app.sliderInputHandler);
            }

            // Define the input handler
            app.sliderInputHandler = function() {
                const years = parseInt(this.value, 10);
                console.log('[Slider Event] Slider moved to year:', years);
                sliderLabelEl.textContent = `Projection: Year ${years}`;

                // Redraw chart with new year range
                if (app.chartMonthlyRate !== undefined) {
                    console.log('[Slider Event] Redrawing chart for year:', years, 'with rate:', app.chartMonthlyRate);
                    app.redrawChartWithYears(years, app.chartMonthlyRate);
                } else {
                    console.warn('[Slider Event] chartMonthlyRate is undefined!');
                }
            };

            // Attach the listener
            sliderEl.addEventListener('input', app.sliderInputHandler);
            console.log('[Slider Init] Event listener attached successfully');
        } else {
            console.warn('[Slider Init] Could not find slider elements');
        }
    };

    // Store the original updateChart before we override it
    const originalUpdateChartFunction = app.updateChart;

    // Override updateChart to initialize slider after rendering
    app.updateChart = function(monthlyRate) {
        console.log('[UpdateChart] Called with monthlyRate:', monthlyRate, 'app.data.years:', app.data.years);
        app.chartMonthlyRate = monthlyRate;

        // Initialize slider to default years
        const sliderEl = document.getElementById('chart-year-slider');
        const sliderLabelEl = document.getElementById('chart-slider-label');
        if (sliderEl) {
            sliderEl.value = app.data.years || 1;
            console.log('[UpdateChart] Slider value set to:', sliderEl.value);
        } else {
            console.warn('[UpdateChart] Slider element not found!');
        }
        // Ensure the label matches the slider value on first render
        if (sliderLabelEl && sliderEl) {
            sliderLabelEl.textContent = `Projection: Year ${sliderEl.value}`;
        }

        app.redrawChartWithYears(app.data.years, monthlyRate);

        // Generate initial AI advice after chart is ready
        if (app.generateFirstAIText) {
            app.generateFirstAIText();
        }

        // Initialize slider event listener after chart is rendered
        app.initChartSlider();
    };

    // Try to initialize on DOMContentLoaded as a fallback
    document.addEventListener('DOMContentLoaded', function() {
        app.initChartSlider();
    });
})();
