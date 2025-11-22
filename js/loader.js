// Partial HTML loader - injects view partials into containers
(function(){
    function injectHTMLWithScripts(container, html) {
        const tpl = document.createElement('template');
        tpl.innerHTML = html;
        // Move child nodes (including non-script) first
        const scripts = [];
        Array.from(tpl.content.childNodes).forEach(node => {
            if (node.tagName === 'SCRIPT') {
                scripts.push(node);
            } else {
                container.appendChild(node);
            }
        });
        // Execute scripts in order
        for (const oldScript of scripts) {
            const s = document.createElement('script');
            // Copy attributes
            Array.from(oldScript.attributes).forEach(attr => s.setAttribute(attr.name, attr.value));
            s.textContent = oldScript.textContent;
            container.appendChild(s);
        }
    }

    async function loadPartials() {
        const parts = [
            { sel: '#nav-container', file: 'views/navigation.html' },
            { sel: '#dream-container', file: 'views/dream.html' },
            { sel: '#plan-container', file: 'views/plan.html' },
            { sel: '#buy-container', file: 'views/buy.html' }
        ];
        for (const p of parts) {
            try {
                const res = await fetch(p.file);
                const html = await res.text();
                const el = document.querySelector(p.sel);
                if (el) {
                    el.innerHTML = '';
                    injectHTMLWithScripts(el, html);
                }
            } catch (e) {
                console.error('Failed to load', p.file, e);
            }
        }
        if (window.app && typeof app.init === 'function') app.init();
    }

    document.addEventListener('DOMContentLoaded', loadPartials);
})();

