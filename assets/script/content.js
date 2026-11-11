// Content script : moteur d'actualisation + panneau de progression affiché sur le site.
// Dépend de shared.js (objet global FT), chargé avant lui.
(function () {
    const { STEPS, QUESTIONS, RUN_TTL_MS, currentPeriod, getState } = FT;

    const CHOICE_SELECTOR = 'input[type=radio], input[type=checkbox], [role=radio], [role=checkbox]';
    const SUBMIT_WAIT_MS = 15000;
    const MAX_SUBMITS_PER_STEP = 2;

    let busy = false;
    let dismissedInvite = false;
    let lastSnapshotPath = '';

    // ---------- Utilitaires DOM ----------

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const clean = (s, max = 120) => (s || '').replace(/\s+/g, ' ').trim().slice(0, max);

    // Rappelle `fn` jusqu'à ce qu'elle renvoie une valeur, ou abandonne après `timeout`.
    async function waitFor(fn, timeout = 10000) {
        const end = Date.now() + timeout;
        while (Date.now() < end) {
            const res = fn();
            if (res) return res;
            await sleep(250);
        }
        return null;
    }

    function isVisible(el) {
        return el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
    }

    function labelText(el) {
        if (!(el instanceof HTMLInputElement)) return clean(el.textContent);
        const parts = [];
        if (el.id) {
            const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
            if (l) parts.push(l.textContent);
        }
        const wrap = el.closest('label');
        if (wrap) parts.push(wrap.textContent);
        if (el.getAttribute('aria-label')) parts.push(el.getAttribute('aria-label'));
        const by = el.getAttribute('aria-labelledby');
        if (by) by.split(/\s+/).forEach((id) => parts.push(document.getElementById(id)?.textContent));
        return clean(parts.join(' '));
    }

    // Trouve le bouton « oui » / « non » d'une question : par ID, sinon par le texte
    // du groupe (≤ 4 choix) qui contient l'intitulé de la question.
    function findChoice(q, answer) {
        const byId = q.ids?.[answer] && document.querySelector(q.ids[answer]);
        if (byId) return byId;

        const want = answer === 'oui' ? /^oui\b/i : /^non\b/i;
        for (const el of document.querySelectorAll(CHOICE_SELECTOR)) {
            if (!want.test(labelText(el)) && !want.test(el.value || '')) continue;
            let node = el.parentElement;
            for (let i = 0; node && i < 8; i++, node = node.parentElement) {
                // Ne jamais remonter jusqu'au niveau de la page (titre, autres questions).
                if (node.querySelectorAll(CHOICE_SELECTOR).length > 4 || node.querySelector('h1, h2')) break;
                if (q.text.test(node.textContent)) return el;
                if (node.matches('fieldset, [role=radiogroup]')) break;
            }
        }
        return null;
    }

    function findSubmit(step) {
        for (const sel of step.submit.ids) {
            const el = document.querySelector(sel);
            if (el) return el;
        }
        const candidates = document.querySelectorAll('button, input[type=submit], a[role=button]');
        return [...candidates].find((el) => !el.disabled && isVisible(el)
            && step.submit.text.test(clean(el.textContent || el.value)));
    }

    // Coche un choix comme le ferait un vrai clic, pour que le site (Angular/React) le voie.
    function select(el) {
        if (el instanceof HTMLInputElement) {
            if (el.checked) return;
            el.click();
            if (!el.checked) {
                el.checked = true;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        } else if (el.getAttribute('aria-checked') !== 'true') {
            el.click();
        }
    }

    // Étape courante : d'après l'URL, sinon d'après les questions présentes à l'écran.
    function detectStep() {
        const byUrl = STEPS.find((s) => s.url.test(location.pathname));
        if (byUrl) return byUrl;
        return STEPS.find((s) => s.questions.every((q) => findChoice(q, q.fixed || 'non')));
    }

    function questionLabel(key) {
        return QUESTIONS.find((q) => q.key === key)?.label || key;
    }

    // ---------- État ----------

    async function setRun(patch) {
        const { run } = await getState();
        const next = { ...run, ...patch };
        await chrome.storage.local.set({ run: next });
        return next;
    }

    async function fail(step, message) {
        await setRun({ status: 'error', step: step?.id, message });
    }

    // ---------- Moteur ----------

    async function runStep(step, run, answers) {
        await setRun({ step: step.id });

        // Diagnostic de la page telle que le site l'affiche, avant que le moteur n'y touche.
        await waitFor(() => document.querySelector(CHOICE_SELECTOR), 5000);
        await saveSnapshot();

        const submits = run.submitted?.[step.id] || 0;
        // La validation finale n'est jamais envoyée deux fois.
        if (step.final && submits > 0) {
            return fail(step, "Aucune confirmation détectée. Vérifiez sur la page que l'actualisation est bien enregistrée.");
        }
        if (submits >= MAX_SUBMITS_PER_STEP) {
            return fail(step, "Le site n'est pas passé à l'étape suivante. Une réponse a peut-être été refusée : vérifiez la page.");
        }

        const manual = [];
        for (const q of step.questions) {
            const answer = q.fixed || answers[q.key];
            const el = await waitFor(() => findChoice(q, answer));
            if (!el) {
                const name = q.fixed ? 'Souhaitez-vous rester inscrit ?' : questionLabel(q.key);
                return fail(step, `La question « ${name} » est introuvable. Le site a peut-être changé : terminez à la main.`);
            }
            select(el);
            if (answer === 'oui' && !q.fixed) manual.push(q.key);
            await sleep(200);
        }

        // Une réponse « oui » demande des précisions : on laisse la main à l'utilisateur.
        if (manual.length) {
            return setRun({ status: 'manual', step: step.id, manual });
        }

        const button = await waitFor(() => findSubmit(step));
        if (!button) {
            return fail(step, 'Le bouton pour passer à la suite est introuvable. Terminez à la main.');
        }

        // L'utilisateur a pu arrêter l'actualisation depuis le panneau entre-temps.
        if ((await getState()).run.status !== 'running') return;

        await setRun({ submitted: { ...run.submitted, [step.id]: submits + 1 }, submittedAt: Date.now() });
        button.click();

        // Si le site est une application monopage, la confirmation s'affiche ici même ;
        // sinon c'est la nouvelle page qui la détecte (voir act()).
        if (step.final && await waitFor(isConfirmation, SUBMIT_WAIT_MS)) await markDone();
    }

    function isConfirmation() {
        return /(actualisation|d[ée]claration)[^.]{0,60}(enregistr|prise en compte|bien [ée]t[ée])/i.test(document.body.innerText);
    }

    async function markDone() {
        const period = currentPeriod();
        await chrome.storage.local.set({ lastDone: { date: new Date().toISOString(), period: period.key || null } });
        await setRun({ status: 'done', period: period.label });
    }

    // Avant la première étape : tente d'ouvrir l'actualisation depuis l'espace personnel.
    async function openEntry(run) {
        if ((run.entryClicks || 0) >= 3) return;
        const link = [...document.querySelectorAll('a, button')].find((el) => isVisible(el)
            && /m.actualiser|je m.actualise|actualisation mensuelle/i.test(clean(el.textContent)));
        if (link) {
            await setRun({ entryClicks: (run.entryClicks || 0) + 1 });
            link.click();
        }
    }

    async function act() {
        const { run, answers } = await getState();
        const step = detectStep();

        snapshotIfRelevant(step, run);

        if (run.status === 'running' && Date.now() - (run.startedAt || 0) > RUN_TTL_MS) {
            return setRun({ status: 'idle' });
        }

        if (run.status === 'manual' && step && step.id !== run.step) {
            // L'utilisateur a complété l'étape manuelle : on reprend.
            return setRun({ status: 'running', manual: [] });
        }

        const finalStep = STEPS.find((s) => s.final);
        if (run.status === 'running' && run.submitted?.[finalStep.id] && step !== finalStep) {
            // Validation envoyée : on attend la confirmation sur la page d'arrivée.
            if (await waitFor(isConfirmation, 5000)) return markDone();
            if (Date.now() - (run.submittedAt || 0) > SUBMIT_WAIT_MS) {
                return fail(finalStep, "Aucune confirmation détectée. Vérifiez sur la page que l'actualisation est bien enregistrée.");
            }
            return;
        }

        if (run.status === 'running') {
            if (!step) return openEntry(run);
            const justSubmitted = run.submitted?.[step.id] && Date.now() - (run.submittedAt || 0) < SUBMIT_WAIT_MS;
            if (!justSubmitted) await runStep(step, run, answers);
        }
    }

    async function tick() {
        if (busy) return;
        busy = true;
        try {
            await act();
        } finally {
            busy = false;
        }
        await render();
    }

    async function render() {
        const { run, answers, lastDone } = await getState();
        renderPanel(run, detectStep(), lastDone, answers);
    }

    // ---------- Diagnostic ----------

    // Enregistre la structure des pages d'actualisation (intitulés, IDs, boutons) sans les
    // valeurs saisies, pour pouvoir adapter l'extension si le site change.
    function snapshotIfRelevant(step, run) {
        const relevant = step || run.status !== 'idle' || /actualis|declaration/i.test(location.pathname);
        if (!relevant || lastSnapshotPath === location.pathname) return;
        lastSnapshotPath = location.pathname;
        setTimeout(saveSnapshot, 1500);
    }

    async function saveSnapshot() {
        const snap = {
            at: new Date().toISOString(),
            path: location.pathname,
            title: document.title,
            detectedStep: detectStep()?.id || null,
            headings: [...document.querySelectorAll('h1, h2, h3, legend')].slice(0, 30).map((e) => clean(e.textContent)),
            choices: [...document.querySelectorAll(`${CHOICE_SELECTOR}, select, textarea, input[type=text], input[type=number]`)].slice(0, 60).map((e) => ({
                tag: e.tagName.toLowerCase(), type: e.type || e.getAttribute('role'), id: e.id, name: e.name, label: labelText(e),
            })),
            buttons: [...document.querySelectorAll('button, input[type=submit], a[role=button]')].slice(0, 30).map((e) => ({
                id: e.id, text: clean(e.textContent || e.value, 60),
            })),
        };
        const { diagnostics = [] } = await chrome.storage.local.get('diagnostics');
        const rest = diagnostics.filter((d) => d.path !== snap.path);
        await chrome.storage.local.set({ diagnostics: [...rest, snap].slice(-15) });
    }

    async function exportDiagnostic() {
        const { diagnostics = [], run } = await chrome.storage.local.get(['diagnostics', 'run']);
        const blob = new Blob([JSON.stringify({ version: chrome.runtime.getManifest().version, run, diagnostics }, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'diagnostic-actualisation.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }

    // ---------- Panneau ----------

    let host;
    let shadow;
    let lastRender = '';

    function h(tag, attrs = {}, ...children) {
        const el = document.createElement(tag);
        for (const [k, v] of Object.entries(attrs)) {
            if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
            else el.setAttribute(k, v);
        }
        el.append(...children.filter(Boolean));
        return el;
    }

    function ensureHost() {
        if (host?.isConnected) return;
        host = h('div', { id: 'ft-auto-actu' });
        shadow = host.attachShadow({ mode: 'open' });
        shadow.append(h('link', { rel: 'stylesheet', href: chrome.runtime.getURL('assets/style/panel.css') }));
        document.body.append(host);
    }

    function card(tone, title, onClose, ...body) {
        return h('section', { class: `card ${tone}`, role: 'status', 'aria-live': 'polite' },
            h('header', {},
                h('span', { class: 'title' }, title),
                onClose && h('button', { class: 'close', 'aria-label': 'Fermer', onclick: onClose }, '×')),
            ...body);
    }

    function button(label, onclick, primary = false) {
        return h('button', { class: primary ? 'btn primary' : 'btn', onclick }, label);
    }

    function stepList(run) {
        const current = STEPS.findIndex((s) => s.id === run.step);
        const done = run.status === 'done' ? STEPS.length : Math.max(current, 0);
        return h('div', {},
            h('ol', { class: 'steps' }, ...STEPS.map((s, i) => {
                const state = i < done ? 'ok' : i === current && run.status !== 'done' ? 'now' : 'todo';
                return h('li', { class: state }, h('span', { class: 'dot', 'aria-hidden': 'true' }), s.label);
            })),
            h('div', { class: 'bar' }, h('div', { style: `width:${Math.round((done / STEPS.length) * 100)}%` })));
    }

    async function startRun() {
        await chrome.storage.local.set({ run: { status: 'running', startedAt: Date.now(), submitted: {} } });
    }

    function renderPanel(run, step, lastDone, answers) {
        const period = currentPeriod();
        let view = null;

        if (run.status === 'running') {
            view = card('', 'Actualisation en cours', () => setRun({ status: 'idle' }),
                stepList(run),
                h('p', { class: 'hint' }, run.step ? "Ne fermez pas l'onglet." : "Connectez-vous et ouvrez l'actualisation : l'extension prendra le relais."));
        } else if (run.status === 'manual') {
            const names = (run.manual || []).map((k) => `« ${questionLabel(k).replace(/\s*\?$/, '')} »`).join(', ');
            view = card('warn', 'À compléter par vous', () => setRun({ status: 'idle' }),
                h('p', {}, `Vous avez répondu « Oui » à ${names}. Remplissez les précisions demandées puis passez à l'étape suivante. L'extension reprendra ensuite.`));
        } else if (run.status === 'error') {
            const idx = STEPS.findIndex((s) => s.id === run.step);
            view = card('danger', idx >= 0 ? `Étape ${idx + 1} bloquée` : 'Actualisation bloquée', () => setRun({ status: 'idle' }),
                h('p', {}, run.message || 'Une erreur est survenue.'),
                h('div', { class: 'actions' },
                    button('Réessayer', () => setRun({ status: 'running', startedAt: Date.now(), submitted: {} }), true),
                    button('Exporter le diagnostic', exportDiagnostic)));
        } else if (run.status === 'done') {
            view = card('success', 'Actualisation enregistrée', () => setRun({ status: 'idle' }),
                h('p', {}, `Votre actualisation de ${run.period || 'ce mois'} est faite. Rien d'autre à faire.`));
        } else if (step && period.open && lastDone?.period !== period.key && !dismissedInvite) {
            // Sur une page d'actualisation sans run en cours : on propose de lancer.
            const yes = QUESTIONS.filter((q) => answers[q.key] === 'oui');
            view = card('', 'Actualisation automatique', () => { dismissedInvite = true; render(); },
                h('p', {}, yes.length ? `Réponses « Oui » : ${yes.map((q) => q.label).join(', ')}` : 'Réponses : rien à déclarer ce mois-ci.'),
                h('p', { class: 'hint' }, "Modifiez vos réponses depuis l'icône de l'extension."),
                h('div', { class: 'actions' }, button("Lancer l'actualisation", startRun, true)));
        }

        const key = JSON.stringify([run, step?.id, dismissedInvite, answers]);
        if (key === lastRender) return;
        lastRender = key;

        if (!view) {
            host?.remove();
            return;
        }
        ensureHost();
        shadow.querySelector('section')?.remove();
        shadow.append(view);
    }

    // ---------- Démarrage ----------

    // Le panneau se met à jour à chaque changement d'état, même pendant qu'une étape s'exécute.
    chrome.storage.onChanged.addListener(() => {
        render();
        tick();
    });

    tick();
    setInterval(tick, 700);
})();
