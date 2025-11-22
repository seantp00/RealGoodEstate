(function(){
    const app = window.app;

    app.fetchListings = async function(){
        const grid = document.getElementById('listings-grid');
        const msg = document.getElementById('listings-msg');
        if (!grid || !msg) return;

        const locEl = document.getElementById('api-loc');
        const budEl = document.getElementById('api-budget');
        if (locEl) locEl.innerText = app.data.location;
        if (budEl) budEl.innerText = app.fmt(app.data.currPower);

        grid.innerHTML = '<div class="col-span-full h-64 flex flex-col items-center justify-center text-slate-400"><div class="loader mb-4"></div><p>Scanning Market via ThinkImmo...</p></div>';
        msg.classList.add('hidden');

        const payload = {
            "active": true,
            "type": "APPARTMENTBUY",
            "sortBy": "asc",
            "sortKey": "buyingPrice",
            "from": 0,
            "size": 100,
            "geoSearches": { "geoSearchQuery": app.data.location, "geoSearchType": "city" }
        };

        try {
            const res = await fetch('https://thinkimmo-api.mgraetz.de/thinkimmo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('API Error');
            const data = await res.json();
            const allListings = data.results || [];
            const matches = allListings.filter(l => l.buyingPrice <= app.data.currPower && l.buyingPrice >= 0);
            app.renderListings(matches);
        } catch (e) {
            grid.innerHTML = '';
            msg.innerHTML = `Connection Error or No Data.`;
            msg.classList.remove('hidden');
        }
    };

    app.renderListings = function(items){
        const grid = document.getElementById('listings-grid');
        const msg = document.getElementById('listings-msg');
        if (!grid || !msg) return;

        grid.innerHTML = '';
        if(!items || items.length === 0) {
            msg.innerHTML = `No properties found under <b>${app.fmt(app.data.currPower)}</b> in ${app.data.location}.`;
            msg.classList.remove('hidden');
            return;
        }

        items.forEach(item => {
            const img = (item.images && item.images.length > 0) ? item.images[0].originalUrl : 'https://placehold.co/600x400/E6F2FA/005EA8?text=Listing';
            grid.innerHTML += `
                <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all group">
                    <div class="h-48 bg-slate-100 relative overflow-hidden">
                        <img src="${img}" alt="${(item.title || 'Property listing').replace(/"/g, '&quot;')}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onerror="this.src='https://placehold.co/600x400/E6F2FA/005EA8?text=No+Image'">
                        <div class="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/60 to-transparent p-3">
                            <span class="text-white font-bold">${app.fmt(item.buyingPrice)}</span>
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
    };
})();
