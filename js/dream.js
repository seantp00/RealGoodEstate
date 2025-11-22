(function(){
    const app = window.app;

    // --- Pretty slider fill + live label for years ---
    const yearsSlider = document.getElementById('inp-years');
    const yearsLabel = document.getElementById('val-years');
    function updateYearsFill() {
        if (!yearsSlider) return;
        const min = parseFloat(yearsSlider.min) || 0;
        const max = parseFloat(yearsSlider.max) || 100;
        const val = parseFloat(yearsSlider.value) || 0;
        const pct = ((val - min) / (max - min)) * 100;
        // WebKit/Chromium uses background on the input; Firefox uses progress pseudo which is okay
        yearsSlider.style.backgroundImage = `linear-gradient(to right, #005EA8 0%, #005EA8 ${pct}%, #CBD5E1 ${pct}%, #CBD5E1 100%)`;
        if (yearsLabel) yearsLabel.innerText = String(val);
    }
    if (yearsSlider) {
        yearsSlider.addEventListener('input', updateYearsFill);
        // Initialize on load
        updateYearsFill();
    }

    app.setRisk = function(level, el) {
        // UI Update
        document.querySelectorAll('.risk-card').forEach(c => c.classList.remove('selected', 'bg-F0F9FF', 'border-interhyp-blue'));
        if (el) el.classList.add('selected');

        // Logic Update
        const warning = document.getElementById('risk-warning');
        if(level === 'low') {
            app.data.rate = 2.5;
            app.data.riskName = 'Conservative';
            if (warning) warning.innerText = "Low risk selected. Returns may not beat high inflation.";
        } else if(level === 'med') {
            app.data.rate = 5.0;
            app.data.riskName = 'Balanced';
            if (warning) warning.innerText = "Balanced strategy selected. Moderate market exposure.";
        } else {
            app.data.rate = 7.5;
            app.data.riskName = 'Aggressive';
            if (warning) warning.innerText = "Warning: High risk selected. Capital loss is possible.";
        }
    };

    // --- NEW: Property Price Calculation with ML Backend ---
    app.calculatePropertyPrice = async function() {
        // Get property parameters from form
        const sqm = parseFloat(document.getElementById('inp-sqm')?.value || 100);
        const rooms = parseFloat(document.getElementById('inp-rooms')?.value || 3);
        const bathrooms = parseFloat(document.getElementById('inp-bathrooms')?.value || 1);
        const location = document.getElementById('inp-property-location')?.value || 'city';
        const condition = document.getElementById('inp-condition')?.value || 'good';
        const yearBuilt = parseInt(document.getElementById('inp-year-built')?.value || 2000);

        try {
            // Show loading state
            const priceStatus = document.getElementById('price-status');
            if (priceStatus) priceStatus.innerText = '(calculating...)';

            // Call ML backend for property price prediction
            const response = await fetch('http://localhost:5000/api/predict-property-price', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sqm: sqm,
                    rooms: rooms,
                    bathrooms: bathrooms,
                    location: location,
                    condition: condition,
                    yearBuilt: yearBuilt
                })
            });

            if (!response.ok) {
                throw new Error(`Property price prediction failed: ${response.status}`);
            }

            const result = await response.json();
            const predictedPrice = result.predictedPrice;

            // Update the target price input with predicted value
            const targetInput = document.getElementById('inp-target');
            if (targetInput) {
                targetInput.value = predictedPrice;
                // Highlight that this is AI-predicted
                targetInput.classList.add('bg-blue-50');
                setTimeout(() => targetInput.classList.remove('bg-blue-50'), 2000);
            }

            // Update status message
            if (priceStatus) {
                priceStatus.innerText = '(AI Estimated)';
                priceStatus.classList.add('text-green-600');
                setTimeout(() => {
                    priceStatus.innerText = '';
                    priceStatus.classList.remove('text-green-600');
                }, 3000);
            }

            console.log('✓ Property price predicted:', result);

        } catch (error) {
            console.error('Error predicting property price:', error);
            const priceStatus = document.getElementById('price-status');
            if (priceStatus) {
                priceStatus.innerText = '(estimate failed)';
                priceStatus.classList.add('text-red-600');
                setTimeout(() => {
                    priceStatus.innerText = '';
                    priceStatus.classList.remove('text-red-600');
                }, 3000);
            }
            // Silently fail - user can still enter manual price
        }
    };

    app.runAnalysis = async function() {
        // 1. Gather Inputs
        app.data.income = parseFloat(document.getElementById('inp-income').value);
        app.data.equity = parseFloat(document.getElementById('inp-equity').value);
        app.data.savings = parseFloat(document.getElementById('inp-savings').value);
        app.data.location = document.getElementById('inp-location').value;
        app.data.target = parseFloat(document.getElementById('inp-target').value);
        app.data.years = parseInt(document.getElementById('inp-years').value);
        app.data.marital = document.getElementById('inp-marital').value;
        app.data.kids = parseInt(document.getElementById('inp-kids').value);

        // ---------------------------------------------------------
        // AI/ML PREDICTIONS USING PYTHON BACKEND
        // ---------------------------------------------------------
        try {
            // Show loading indicator
            const loadingMsg = document.createElement('div');
            loadingMsg.id = 'ml-loading';
            loadingMsg.style.cssText = 'position:fixed;top:20px;right:20px;background:#005EA8;color:white;padding:12px 20px;border-radius:8px;z-index:9999;box-shadow:0 4px 6px rgba(0,0,0,0.1);';
            loadingMsg.innerHTML = '<i class="fas fa-robot"></i> AI calculating predictions...';
            document.body.appendChild(loadingMsg);

            // Call Python ML backend
            const response = await fetch('http://localhost:5000/api/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    income: app.data.income,
                    equity: app.data.equity,
                    savings: app.data.savings,
                    target: app.data.target,
                    years: app.data.years,
                    rate: app.data.rate,
                    marital: app.data.marital,
                    kids: app.data.kids
                })
            });

            if (!response.ok) {
                throw new Error(`Backend server error: ${response.status}`);
            }

            const mlResults = await response.json();

            // Remove loading indicator
            document.getElementById('ml-loading')?.remove();

            // Extract ML predictions
            const readiness = mlResults.readiness;
            const likelihood = mlResults.likelihood;
            app.data.currPower = mlResults.currPower;
            const futureEquity = mlResults.futureEquity;

            console.log('✓ AI/ML Predictions received:', mlResults);

            // ---------------------------------------------------------
            // UI UPDATES WITH ML PREDICTIONS
            // ---------------------------------------------------------
            const byId = (id)=>document.getElementById(id);
            byId('out-readiness').innerText = readiness + "%";
            byId('bar-readiness').style.width = readiness + "%";
            byId('txt-power').innerText = app.fmt(app.data.currPower);
            byId('cta-power').innerText = app.fmt(app.data.currPower);

            byId('out-likelihood').innerText = likelihood + "%";
            byId('bar-likelihood').style.width = likelihood + "%";
            byId('txt-year').innerText = app.data.years;
            byId('disp-risk-name').innerText = app.data.riskName;

            byId('out-final-equity').innerText = app.fmt(futureEquity);

            // Update Chat Context Text
            const familyText = app.data.marital === 'married' ? `married with ${app.data.kids} kids` : `single with ${app.data.kids} kids`;
            byId('chat-status-text').innerText = familyText;
            byId('chat-risk-text').innerText = app.data.riskName;

            // Family Label
            byId('disp-family').innerText = app.data.marital === 'married' ? 'Family' : 'Household';

            // Calculate monthly rate for chart
            const monthlyRate = (app.data.rate / 100) / 12;
            app.updateChart && app.updateChart(monthlyRate);
            app.nav && app.nav('plan');

        } catch (error) {
            // Remove loading indicator
            document.getElementById('ml-loading')?.remove();

            console.error('Error calling ML backend:', error);
            alert('⚠️ Could not connect to AI prediction server.\n\n' +
                  'Please ensure the Python backend is running:\n' +
                  '1. Open terminal in backend folder\n' +
                  '2. Run: pip install -r requirements.txt\n' +
                  '3. Run: python server.py\n\n' +
                  'Then try again.');
        }
    };
})();
