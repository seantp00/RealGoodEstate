(function(){
    const app = window.app;

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

    app.runAnalysis = function() {
        // 1. Gather Inputs
        app.data.income = parseFloat(document.getElementById('inp-income').value);
        app.data.equity = parseFloat(document.getElementById('inp-equity').value);
        app.data.savings = parseFloat(document.getElementById('inp-savings').value);
        app.data.location = document.getElementById('inp-location').value;
        app.data.target = parseFloat(document.getElementById('inp-target').value);
        app.data.years = parseInt(document.getElementById('inp-years').value);
        app.data.marital = document.getElementById('inp-marital').value;
        app.data.kids = parseInt(document.getElementById('inp-kids').value);

        // METRIC 1: FAMILY-ADJUSTED BUYING POWER
        let costDeduction = 0;
        if(app.data.marital === 'married') costDeduction += 400;
        costDeduction += (app.data.kids * 300);

        const adjustedIncome = Math.max(1000, app.data.income - costDeduction);

        // Multiplier 90x monthly disposable income + Equity
        app.data.currPower = Math.floor((adjustedIncome * 90) + app.data.equity);

        // METRIC 2: READINESS (Quadratic)
        const ratio = app.data.currPower / app.data.target;
        let readiness = ratio >= 1.0 ? 100 : Math.max(0, Math.floor(100 * Math.pow(ratio, 2)));

        // METRIC 3: EQUITY PROJECTION (Compound Interest)
        const monthlyRate = (app.data.rate / 100) / 12;
        const months = app.data.years * 12;
        let futureEquity = app.data.equity;
        for(let i=0; i<months; i++) {
            futureEquity = (futureEquity * (1 + monthlyRate)) + app.data.savings;
        }

        // METRIC 4: LIKELIHOOD (Logistic)
        const futurePower = (adjustedIncome * 90) + futureEquity;
        const coverage = futurePower / app.data.target;
        let likelihood = Math.max(10, Math.floor(100 / (1 + Math.exp(-10 * (coverage - 0.85)))));
        if(futurePower >= app.data.target) likelihood = 98;

        // UI UPDATES
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

        app.updateChart && app.updateChart(monthlyRate);
        app.nav && app.nav('plan');
    };
})();
