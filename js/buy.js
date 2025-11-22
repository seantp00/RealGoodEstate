(function(){
    const app = window.app;

    app.fetchListings = async function(){
        const grid = document.getElementById('listings-grid');
        const msg = document.getElementById('listings-msg');
        if (!grid || !msg) return;

        const locEl = document.getElementById('api-loc');
        const budEl = document.getElementById('api-budget');
        if (locEl) locEl.innerText = app.data.location;
        // Determine effective budget (respect one-time override if requested)
        const effectiveBudget = (app.data.useBudgetOverrideOnce && typeof app.data.buyBudgetOverride === 'number' && app.data.buyBudgetOverride > 0)
            ? app.data.buyBudgetOverride
            : app.data.currPower;

        // Sync effective budget to filter UI if not set (default value)
        setupFilterUI();
        const maxPriceInput = document.getElementById('filter-max-price');
        if (maxPriceInput && !maxPriceInput.value) {
            maxPriceInput.value = effectiveBudget;
            updateActiveSummary();
        }

        // Immediately clear one-time override after capturing to avoid races with rapid navigation
        if (app.data.useBudgetOverrideOnce) {
            app.data.useBudgetOverrideOnce = false;
            app.data.buyBudgetOverride = null;
        }
        if (budEl) budEl.innerText = app.fmt(effectiveBudget);

        grid.innerHTML = '<div class="col-span-full h-64 flex flex-col items-center justify-center text-slate-400"><div class="loader mb-4"></div><p>Scanning Market via ThinkImmo...</p></div>';
        msg.classList.add('hidden');

        const payload = {
            "active": true,
            "type": "APARTMENTBUY" | "HOUSEBUY",
            "sortBy": "asc",
            "sortKey": "buyingPrice",
            "from": 1,
            "size": 10000,
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
            const matches = allListings.filter(l => l.buyingPrice <= effectiveBudget && l.buyingPrice >= 0);
            console.log('[buy.js] Matches found (pre-filter):', matches.length);
            // Read UI filters and apply them
            const filters = getActiveFilters();
            const filtered = applyFilters(matches, filters);
            console.log('[buy.js] Matches after UI filters:', filtered.length, filters);
            app.renderListings(filtered, effectiveBudget);
        } catch (e) {
            console.error('[buy.js] Error:', e);
            grid.innerHTML = '';
            msg.innerHTML = `Connection Error or No Data.`;
            msg.classList.remove('hidden');
        }
    };

    // Filter UI setup flag
    let _filterUISetup = false;

    // Setup filter panel handlers (idempotent)
    function setupFilterUI() {
        if (_filterUISetup) return;

        const openBtn = document.getElementById('btn-open-filters');
        const closeBtn = document.getElementById('btn-close-filters');
        const backdrop = document.getElementById('filter-panel-backdrop');
        const panel = document.getElementById('filter-panel');
        const applyBtn = document.getElementById('btn-apply-panel');
        const clearBtn = document.getElementById('btn-clear-panel');
        const summary = document.getElementById('active-filter-summary');

        function openPanel() {
            if (panel) panel.classList.remove('hidden');
            updateActiveSummary();
        }
        function closePanel() {
            if (panel) panel.classList.add('hidden');
        }

        if (openBtn) openBtn.addEventListener('click', openPanel);
        if (closeBtn) closeBtn.addEventListener('click', closePanel);
        if (backdrop) backdrop.addEventListener('click', closePanel);
        if (applyBtn) applyBtn.addEventListener('click', function(){
            // Apply: fetch listings (will read filter values and apply client-side)
            closePanel();
            app.fetchListings();
        });
        if (clearBtn) clearBtn.addEventListener('click', function(){
            // Clear all filter inputs
            const inputs = panel.querySelectorAll('input');
            inputs.forEach(i => { if (i.type === 'checkbox') i.checked = false; else i.value = ''; });
            const selects = panel.querySelectorAll('select');
            selects.forEach(s => { s.selectedIndex = 0; });
            updateActiveSummary();
            app.fetchListings();
        });

        // Update summary when inputs change
        if (panel) {
            panel.addEventListener('change', updateActiveSummary);
        }
        if (summary) summary.addEventListener('click', openPanel);
            // Only mark setup complete if at least one UI element exists and handlers were attached
            if (openBtn || closeBtn || backdrop || applyBtn || clearBtn || summary) {
                _filterUISetup = true;
            }
    }

    // Read active filters from DOM (expanded)
    function getActiveFilters() {
        setupFilterUI();
        const getVal = id => {
            const el = document.getElementById(id);
            return el ? el.value : '';
        };

        const filters = {
            minPrice: parseNumber(getVal('filter-min-price')),
            maxPrice: parseNumber(getVal('filter-max-price')),
            minRooms: parseNumber(getVal('filter-min-rooms')),
            maxRooms: parseNumber(getVal('filter-max-rooms')),
            minSqm: parseNumber(getVal('filter-min-sqm')),
            maxSqm: parseNumber(getVal('filter-max-sqm')),
            minPPSqm: parseNumber(getVal('filter-min-ppsqm')),
            maxPPSqm: parseNumber(getVal('filter-max-ppsqm')),
            minYear: parseNumber(getVal('filter-min-year')),
            maxYear: parseNumber(getVal('filter-max-year')),
            publishedFrom: parseDate(getVal('filter-published-from')),
            publishedTo: parseDate(getVal('filter-published-to')),
            updatedFrom: parseDate(getVal('filter-updated-from')),
            updatedTo: parseDate(getVal('filter-updated-to')),
            priceListedOnly: document.getElementById('filter-price-listed') ? document.getElementById('filter-price-listed').checked : false,
            sortKey: getVal('filter-sort-key') || 'buyingPrice',
            sortOrder: getVal('filter-sort-order') || 'asc'
        };

        return filters;
    }

    // Utility: parse number or return null
    function parseNumber(v) {
        if (v === null || v === undefined || v === '') return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }

    // Utility: parse date string to Date or null
    function parseDate(v) {
        if (!v) return null;
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d;
    }

    // Get first non-null field from possible keys or return null
    function getFirstField(item, keys) {
        for (const k of keys) {
            if (!item) continue;
            const val = item[k];
            if (val !== undefined && val !== null && val !== '') return val;
        }
        return null;
    }

    // Apply filters and sorting to items
    function applyFilters(items, filters) {
        if (!filters) return items;
        let out = items.filter(item => {
            // Price
            const price = getFirstField(item, ['buyingPrice', 'price', 'priceValue']);
            if (filters.priceListedOnly) {
                if (price === null || price === undefined || price === 0) return false;
            }
            if (filters.minPrice != null && price != null && Number(price) < filters.minPrice) return false;
            if (filters.minPrice != null && price === null) return false;
            if (filters.maxPrice != null && price != null && Number(price) > filters.maxPrice) return false;

            // Rooms
            const rooms = getFirstField(item, ['rooms', 'roomCount']);
            if (filters.minRooms != null && rooms != null && Number(rooms) < filters.minRooms) return false;
            if (filters.maxRooms != null && rooms != null && Number(rooms) > filters.maxRooms) return false;

            // Square meters
            const sqm = getFirstField(item, ['squareMeter', 'area', 'size']);
            if (filters.minSqm != null && sqm != null && Number(sqm) < filters.minSqm) return false;
            if (filters.maxSqm != null && sqm != null && Number(sqm) > filters.maxSqm) return false;

            // Price per sqm: try direct field or compute
            let ppsqm = getFirstField(item, ['pricePerSqm', 'pricePerSquareMeter']);
            if ((ppsqm === null || ppsqm === undefined) && price != null && sqm != null && Number(sqm) > 0) {
                ppsqm = Number(price) / Number(sqm);
            }
            if (filters.minPPSqm != null && ppsqm != null && Number(ppsqm) < filters.minPPSqm) return false;
            if (filters.maxPPSqm != null && ppsqm != null && Number(ppsqm) > filters.maxPPSqm) return false;

            // Construction year
            const cYear = getFirstField(item, ['constructionYear', 'yearBuilt', 'builtYear']);
            if (filters.minYear != null && cYear != null && Number(cYear) < filters.minYear) return false;
            if (filters.maxYear != null && cYear != null && Number(cYear) > filters.maxYear) return false;

            // Publish / updated dates (try multiple keys)
            const pub = parseDate(getFirstField(item, ['publishDate', 'publishedAt', 'datePublished']));
            if (filters.publishedFrom && pub && pub < filters.publishedFrom) return false;
            if (filters.publishedTo && pub && pub > filters.publishedTo) return false;

            const upd = parseDate(getFirstField(item, ['updatedAt', 'lastUpdated', 'modified']));
            if (filters.updatedFrom && upd && upd < filters.updatedFrom) return false;
            if (filters.updatedTo && upd && upd > filters.updatedTo) return false;

            return true;
        });

        // Sorting
        const key = filters.sortKey || 'buyingPrice';
        const order = (filters.sortOrder || 'asc').toLowerCase();
        out.sort((a, b) => {
            const aVal = getFirstField(a, [key, key === 'pricePerSqm' ? 'pricePerSqm' : key]);
            const bVal = getFirstField(b, [key, key === 'pricePerSqm' ? 'pricePerSqm' : key]);

            // For pricePerSqm, attempt compute if missing
            let aNum = aVal;
            let bNum = bVal;
            if ((aNum === null || aNum === undefined) && key === 'pricePerSqm') {
                const aPrice = getFirstField(a, ['buyingPrice', 'price']);
                const aSqm = getFirstField(a, ['squareMeter', 'area']);
                if (aPrice != null && aSqm != null && Number(aSqm) > 0) aNum = Number(aPrice) / Number(aSqm);
            }
            if ((bNum === null || bNum === undefined) && key === 'pricePerSqm') {
                const bPrice = getFirstField(b, ['buyingPrice', 'price']);
                const bSqm = getFirstField(b, ['squareMeter', 'area']);
                if (bPrice != null && bSqm != null && Number(bSqm) > 0) bNum = Number(bPrice) / Number(bSqm);
            }

            // Date keys -> convert
            const dateKeys = ['publishDate','publishedAt','datePublished','updatedAt','lastUpdated','modified'];
            if (dateKeys.includes(key)) {
                const da = parseDate(aVal) || 0;
                const db = parseDate(bVal) || 0;
                return order === 'asc' ? da - db : db - da;
            }

            const na = aNum === null || aNum === undefined ? Number.NEGATIVE_INFINITY : Number(aNum);
            const nb = bNum === null || bNum === undefined ? Number.NEGATIVE_INFINITY : Number(bNum);
            if (na === Number.NEGATIVE_INFINITY && nb === Number.NEGATIVE_INFINITY) return 0;
            if (na === Number.NEGATIVE_INFINITY) return order === 'asc' ? 1 : -1;
            if (nb === Number.NEGATIVE_INFINITY) return order === 'asc' ? -1 : 1;
            return order === 'asc' ? na - nb : nb - na;
        });

        return out;
    }

    // Update the small summary next to Filters button
    function updateActiveSummary() {
        const s = document.getElementById('active-filter-summary');
        if (!s) return;
        const f = getActiveFilters();
        const parts = [];
        if (f.minPrice != null) parts.push(`min €${f.minPrice}`);
        if (f.maxPrice != null) parts.push(`max €${f.maxPrice}`);
        if (f.minRooms != null) parts.push(`${f.minRooms}+ rooms`);
        if (f.minSqm != null) parts.push(`${f.minSqm}+ m²`);
        if (f.priceListedOnly) parts.push('priced only');
        if (parts.length === 0) s.innerText = 'No filters selected'; else s.innerText = parts.join(' · ');
    }

    app.renderListings = function(items, effectiveBudget){
        const grid = document.getElementById('listings-grid');
        const msg = document.getElementById('listings-msg');
        if (!grid || !msg) return;

        grid.innerHTML = '';
        msg.classList.add('hidden');
        if(!items || items.length === 0) {
            const bud = (typeof effectiveBudget === 'number' && effectiveBudget > 0) ? effectiveBudget : app.data.currPower;
            msg.innerHTML = `No properties found under <b>${app.fmt(bud)}</b> in ${app.data.location}.`;
            msg.classList.remove('hidden');
            return;
        }

        items.forEach((item, idx) => {

            // Iterate over images to find the first available one
            let img = 'https://placehold.co/600x400/E6F2FA/005EA8?text=Listing';
            if (item.images && item.images.length > 0) {
                console.log('[buy.js] Item has', item.images.length, 'images:', item.images);
                for (let i = 0; i < item.images.length; i++) {
                    console.log('[buy.js] Checking image', i, ':', item.images[i]);
                    try{
                        if (item.images[i] && item.images[i].originalUrl) {
                            img = item.images[i].originalUrl;
                            console.log('[buy.js] Using image:', img);
                            break;
                        }
                    }catch(e){
                        console.error('[buy.js] Error checking image:', e);
                    }
                    
                }
            } else {
                console.log('[buy.js] No images available for this item');
            }
            
            // Extract platform URLs
            const platforms = item.platforms || [];
             const platformsJson = JSON.stringify(platforms.map(p => ({
                name: p.name || 'Platform',
                url: p.url,
                active: p.active,
            }))); 
            //const platformsJson = JSON.stringify();

            const card = document.createElement('div');
            card.className = 'bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all group';

            const top = document.createElement('div');
            top.className = 'h-48 bg-slate-100 relative overflow-hidden';

            const imgEl = document.createElement('img');
            imgEl.src = img;
            imgEl.alt = item.title || 'Property listing';
            imgEl.className = platforms.length > 0 
                ? 'w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer'
                : 'w-full h-full object-cover group-hover:scale-105 transition-transform duration-500';
            imgEl.dataset.platforms = platformsJson;
            imgEl.onerror = function(){ this.src = 'https://placehold.co/600x400/E6F2FA/005EA8?text=No+Image'; };
            
            // Add click handler for image
            if (platforms.length > 0) {
                imgEl.addEventListener('click', function(e) {
                    e.preventDefault();
                    const platformData = JSON.parse(this.dataset.platforms || '[]');
                    console.log('Platform data:', platformData);
                    if(platformData) {
                        for (let i = 0; i < platformData.length; i++) {
                            if (platformData[i] && platformData[i].url && platformData[i].active != null) {
                                window.open(platformData[i].url, '_blank', 'noopener,noreferrer');
                                break;
                            }
                        }
                    }else{
                        openPlatformModal(platformData);
                    }
                });
            }

            const badge = document.createElement('div');
            badge.className = 'absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/60 to-transparent p-3 pointer-events-none';
            const priceSpan = document.createElement('span');
            priceSpan.className = 'text-white font-bold';
            priceSpan.innerHTML = item.buyingPrice === null ? 'Price on Request' : app.fmt(item.buyingPrice);
            badge.appendChild(priceSpan);

            // Add website link indicator (only visible on hover)
            const linkIndicator = document.createElement('div');
            linkIndicator.className = 'absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200';
            if (platforms.length > 0) {
                linkIndicator.className += ' bg-green-500 text-white';
                linkIndicator.innerHTML = '<i class="fa-solid fa-external-link-alt mr-1"></i>Go to website';
            } else {
                linkIndicator.className += ' bg-gray-500 text-white';
                linkIndicator.innerHTML = 'No website';
            }

            top.appendChild(imgEl);
            top.appendChild(badge);
            top.appendChild(linkIndicator);

            const body = document.createElement('div');
            body.className = 'p-4';
            
            const title = document.createElement('h4');
            title.className = 'font-bold text-slate-800 text-sm truncate mb-1';
            title.innerText = item.title || 'Apartment';
            
            const loc = document.createElement('p');
            loc.className = 'text-xs text-slate-500 mb-3';
            loc.innerHTML = `<i class="fa-solid fa-map-pin"></i> ${item.address && item.address.city ? item.address.city : ''}`;
            
            const footer = document.createElement('div');
            footer.className = 'flex justify-between text-xs text-slate-600 border-t pt-2';
            
            const rooms = document.createElement('span');
            rooms.innerText = `${item.rooms != null ? item.rooms : '0'} Rooms`;
            
            const sqm = document.createElement('span');
            sqm.innerText = `${item.squareMeter ? Math.round(item.squareMeter) : 'N/A'} m²`;
            
            footer.appendChild(rooms);
            footer.appendChild(sqm);

            body.appendChild(title);
            body.appendChild(loc);
            body.appendChild(footer);

            card.appendChild(top);
            card.appendChild(body);
            grid.appendChild(card);
        });
    };

    // Modal to display multiple platform URLs
    function openPlatformModal(platforms) {
        const modal = document.getElementById('links-modal');
        const body = document.getElementById('links-modal-body');
        const close = document.getElementById('links-modal-close');
        const backdrop = document.getElementById('links-modal-backdrop');
        
        if (!modal || !body) return;
        
        body.innerHTML = '';
        platforms.forEach(platform => {
            if (!platform.url) return;
            
            const row = document.createElement('div');
            row.className = 'flex items-center justify-between p-3 border rounded hover:bg-slate-50 transition-colors';
            
            const nameEl = document.createElement('div');
            nameEl.className = 'text-sm font-medium text-slate-700';
            nameEl.innerText = platform.name || 'Platform';
            
            const btn = document.createElement('button');
            btn.className = 'bg-interhyp-blue text-white px-4 py-1 rounded text-sm hover:bg-blue-700 transition-colors';
            btn.innerText = 'Open';
            btn.addEventListener('click', () => {
                window.open(platform.url, '_blank', 'noopener,noreferrer');
            });
            
            row.appendChild(nameEl);
            row.appendChild(btn);
            body.appendChild(row);
        });
        
        modal.classList.remove('hidden');
        
        if (close) {
            close.onclick = () => modal.classList.add('hidden');
        }
        if (backdrop) {
            backdrop.onclick = () => modal.classList.add('hidden');
        }
    }
    // Try setup filter UI in case DOM is already present. If not, setup will run later when needed.
    try { setupFilterUI(); } catch(e) { /* ignore */ }

})();
