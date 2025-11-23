(function(){
    const app = window.app;

    // Track whether defaults have been applied to avoid reapplying after clear
    let _defaultsApplied = false;

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
        
        // Only apply defaults once on first load, not after user clears
        if (!_defaultsApplied) {
            const maxPriceInput = document.getElementById('filter-max-price');
            if (maxPriceInput && !maxPriceInput.value) {
                maxPriceInput.value = effectiveBudget;
            }

            const minSqmInput = document.getElementById('filter-min-sqm');
            if (minSqmInput && !minSqmInput.value) {
                minSqmInput.value = app.data.sqm;
            }

            const minRoomsInput = document.getElementById('filter-min-rooms');
            if (minRoomsInput && !minRoomsInput.value) {
                minRoomsInput.value = app.data.rooms;
            }

            const minYearInput = document.getElementById('filter-min-year');
            if (minYearInput && !minYearInput.value) {
                minYearInput.value = app.data.yearBuilt;
            }

            const priceOrdering = document.getElementById('filter-price-listed');
            if (priceOrdering && !priceOrdering.checked) {
                priceOrdering.checked = true;
            }

            const sortOrderEl = document.getElementById('filter-sort-order');
            if (sortOrderEl) sortOrderEl.value = 'desc';

            _defaultsApplied = true;
            console.log('[buy.js] Applied default filters (first load only)');
        }

        updateActiveSummary();


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
            "size": 400,
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
            const matches = allListings.filter(l =>  l.buyingPrice >= 0);
            console.log('[buy.js] Matches found (pre-filter):', matches.length);
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
            closePanel();
            app.fetchListings();
        });
        if (clearBtn) clearBtn.addEventListener('click', function(){
            const inputs = panel.querySelectorAll('input');
            inputs.forEach(i => { if (i.type === 'checkbox') i.checked = false; else i.value = ''; });
            const selects = panel.querySelectorAll('select');
            selects.forEach(s => { s.selectedIndex = 0; });
            // Don't reset _defaultsApplied flag - keep filters cleared
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
        console.log('MAX PRICE: ' + filters.maxPrice);
        return filters;
    }

    // Get recommendation score for sorting
    function getRecommendationScore(item) {
        if (item._recommendation !== undefined) return item._recommendation;
        item._recommendation = calculateRecommendation(item);
        return item._recommendation;
    }

    function parseNumber(v) {
        if (v === null || v === undefined || v === '') return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }

    function parseDate(v) {
        if (!v) return null;
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d;
    }


    // Calculate recommendation score (0-100) based on similarity to desired property
    // New behavior: construction year is weighed less; we reward "good" deviations
    // (more sqm, lower price) and penalize "bad" deviations (less sqm, higher price).
    function calculateRecommendation(item) {
        let score = 0;
        let factors = 0;

        // Get desired property inputs from app.data
        const desiredSqm = app.data.sqm;
        const desiredRooms = app.data.rooms;
        const desiredYear = app.data.yearBuilt;
        const desiredPrice = app.data.target;

        // Weights (absolute maxima)
        const WEIGHT_SQM = 30;      // reward more sqm, penalize less
        const WEIGHT_ROOMS = 20;    // symmetric penalty for rooms mismatch
        const WEIGHT_YEAR = 10;      // reduced importance for year
        const WEIGHT_PRICE = 30;    // favor lower price, penalize higher price

        // Factor 1: Square meters — reward if larger than desired, penalize if smaller
        if (desiredSqm && item.squareMeter) {
            const sqmRatio = Number(item.squareMeter) / Number(desiredSqm);
            if (isFinite(sqmRatio)) {
                if (sqmRatio >= 1) {
                    // Good deviation: reward up to 50% more sqm, cap beyond that
                    const cappedRatio = Math.min(sqmRatio, 1.5);
                    score += ((cappedRatio - 1) / 0.5) * WEIGHT_SQM;
                } else {
                    // Bad deviation: penalize based on how much smaller
                    score -= (1 - sqmRatio) * WEIGHT_SQM;
                }
                factors += WEIGHT_SQM;
            }
        }

        // Factor 2: Rooms — penalty for differences
        if (desiredRooms && item.rooms !== undefined && item.rooms !== null) {
            const roomsDiff = Math.abs(Number(item.rooms) - Number(desiredRooms));
            const roomsPenalty = Math.min(WEIGHT_ROOMS, roomsDiff * 5);
            score -= roomsPenalty;
            factors += WEIGHT_ROOMS;
        }

        // Factor 3: Year built — reduced weight, small penalty for distant year
        if (desiredYear) {
            const yearField = getFirstField(item, ['constructionYear', 'yearBuilt', 'builtYear']);
            if (yearField) {
                const yearDiff = Math.abs(Number(yearField) - Number(desiredYear));
                // Small impact: every 5 years ~1 point of penalty, capped
                const yearPenalty = Math.min(WEIGHT_YEAR, yearDiff / 5);
                score -= yearPenalty;
                factors += WEIGHT_YEAR;
            }
        }

        // Factor 4: Price — reward lower prices but cap the reward to avoid favoring extremely cheap items
        if (desiredPrice && item.buyingPrice) {
            const priceRatio = Number(item.buyingPrice) / Number(desiredPrice);
            if (isFinite(priceRatio)) {
                if (priceRatio <= 1) {
                    // Good: cheaper than target, but cap reward at 30% cheaper to avoid parking garages scoring 100%
                    const cappedRatio = Math.max(priceRatio, 0.7);
                    score += ((1 - cappedRatio) / 0.3) * WEIGHT_PRICE;
                } else {
                    // Bad: more expensive than target -> penalize proportional (max WEIGHT_PRICE)
                    score -= Math.min(WEIGHT_PRICE, (priceRatio - 1) * WEIGHT_PRICE);
                }
                factors += WEIGHT_PRICE;
            }
        }

        // If no factors present, return neutral
        factors = 100;
        
        // At this point `score` is in range [-factors, +factors]. Map to [0,100].
        const rawMin = -factors;
        const rawMax = factors;
        const normalized = ((score - rawMin) / (rawMax - rawMin)) * 100;
        const clamped = Math.round(Math.max(0, Math.min(100, normalized)));
        return clamped;
    }

    function getFirstField(item, keys) {
        for (const k of keys) {
            if (!item) continue;
            const val = item[k];
            if (val !== undefined && val !== null && val !== '') return val;
        }
        return null;
    }

    function applyFilters(items, filters) {
        if (!filters) return items;
        let out = items.filter(item => {
            const price = getFirstField(item, ['buyingPrice', 'price', 'priceValue']);
            if (filters.priceListedOnly) {
                if (price === null || price === undefined || price === 0) return false;
            }
            if (filters.minPrice != null && price != null && Number(price) < filters.minPrice) return false;
            if (filters.minPrice != null && price === null) return false;
            if (filters.maxPrice != null && price != null && Number(price) > filters.maxPrice) return false;

            const rooms = getFirstField(item, ['rooms', 'roomCount']);
            if (filters.minRooms != null && rooms != null && Number(rooms) < filters.minRooms) return false;
            if (filters.maxRooms != null && rooms != null && Number(rooms) > filters.maxRooms) return false;

            const sqm = getFirstField(item, ['squareMeter', 'area', 'size']);
            if (filters.minSqm != null && sqm != null && Number(sqm) < filters.minSqm) return false;
            if (filters.maxSqm != null && sqm != null && Number(sqm) > filters.maxSqm) return false;

            let ppsqm = getFirstField(item, ['pricePerSqm', 'pricePerSquareMeter']);
            if ((ppsqm === null || ppsqm === undefined) && price != null && sqm != null && Number(sqm) > 0) {
                ppsqm = Number(price) / Number(sqm);
            }
            if (filters.minPPSqm != null && ppsqm != null && Number(ppsqm) < filters.minPPSqm) return false;
            if (filters.maxPPSqm != null && ppsqm != null && Number(ppsqm) > filters.maxPPSqm) return false;

            const cYear = getFirstField(item, ['constructionYear', 'yearBuilt', 'builtYear']);
            if (filters.minYear != null && cYear != null && Number(cYear) < filters.minYear) return false;
            if (filters.maxYear != null && cYear != null && Number(cYear) > filters.maxYear) return false;

            const pub = parseDate(getFirstField(item, ['publishDate', 'publishedAt', 'datePublished']));
            if (filters.publishedFrom && pub && pub < filters.publishedFrom) return false;
            if (filters.publishedTo && pub && pub > filters.publishedTo) return false;

            const upd = parseDate(getFirstField(item, ['updatedAt', 'lastUpdated', 'modified']));
            if (filters.updatedFrom && upd && upd < filters.updatedFrom) return false;
            if (filters.updatedTo && upd && upd > filters.updatedTo) return false;

            return true;
        });

        const key = filters.sortKey || 'buyingPrice';
        const order = (filters.sortOrder || 'asc').toLowerCase();
        out.sort((a, b) => {
            // Special handling for recommendation sorting
            if (key === 'recommendation') {
                const aScore = getRecommendationScore(a);
                const bScore = getRecommendationScore(b);
                return order === 'asc' ? aScore - bScore : bScore - aScore;
            }

            const aVal = getFirstField(a, [key, key === 'pricePerSqm' ? 'pricePerSqm' : key]);
            const bVal = getFirstField(b, [key, key === 'pricePerSqm' ? 'pricePerSqm' : key]);

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
            // Calculate recommendation score
            const recommendationScore = calculateRecommendation(item);
            
            let img = 'https://placehold.co/600x400/E6F2FA/005EA8?text=Listing';
            if (item.images && item.images.length > 0) {
                for (let i = 0; i < item.images.length; i++) {
                    try{
                        if (item.images[i] && item.images[i].originalUrl) {
                            img = item.images[i].originalUrl;
                            break;
                        }
                    }catch(e){
                        console.error('[buy.js] Error checking image:', e);
                    }
                    
                }
            } else {
                console.log('[buy.js] No images available for this item');
            }
            const platforms = item.platforms || [];
             const platformsJson = JSON.stringify(platforms.map(p => ({
                name: p.name || 'Platform',
                url: p.url,
                active: p.active,
            }))); 

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
            // Recommendation badge (always visible)
            const recBadge = document.createElement('div');
            recBadge.className = 'absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-bold shadow-md';
            if (recommendationScore >= 80) {
                recBadge.className += ' bg-green-500 text-white';
                recBadge.innerHTML = '<i class="fa-solid fa-star mr-1"></i>' + recommendationScore + '%';
            } else if (recommendationScore >= 60) {
                recBadge.className += ' bg-blue-500 text-white';
                recBadge.innerHTML = recommendationScore + '%';
            } else if (recommendationScore >= 40) {
                recBadge.className += ' bg-yellow-500 text-white';
                recBadge.innerHTML = recommendationScore + '%';
            } else {
                recBadge.className += ' bg-gray-400 text-white';
                recBadge.innerHTML = recommendationScore + '%';
            }

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
            top.appendChild(recBadge);
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
    try { setupFilterUI(); } catch(e) {}

})();
