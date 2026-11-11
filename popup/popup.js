// Popup : réglage des réponses, statut du mois et lancement de l'actualisation.
const { QUESTIONS, START_URL, currentPeriod, formatDate, getState } = FT;

const $ = (id) => document.getElementById(id);

function renderStatus(run, lastDone) {
    const status = $('status');
    const period = currentPeriod();
    const start = $('start');
    start.disabled = false;

    let tone;
    let text;
    if (run.status === 'running') {
        tone = 'info';
        text = 'Actualisation en cours dans un onglet France Travail.';
        start.textContent = 'Voir l\'onglet';
    } else if (run.status === 'error') {
        tone = 'danger';
        text = run.message || 'La dernière tentative a échoué.';
        start.textContent = 'Réessayer';
    } else if (!period.open) {
        tone = 'neutral';
        text = `Pas d'actualisation en ce moment. Prochaine ouverture le ${period.nextOpen}.`;
        start.textContent = "Lancer l'actualisation";
        start.disabled = true;
    } else if (lastDone?.period === period.key) {
        tone = 'success';
        text = `Actualisation de ${period.label} faite le ${formatDate(lastDone.date)}.`;
        start.textContent = 'Relancer quand même';
    } else {
        tone = 'warning';
        text = `Actualisation de ${period.label} à faire, avant le ${period.deadline}.`;
        start.textContent = "Lancer l'actualisation";
    }

    status.className = `status ${tone}`;
    status.textContent = text;
    $('last').textContent = lastDone ? `Dernière : ${formatDate(lastDone.date)}` : '';
}

function renderQuestions(answers) {
    const root = $('questions');
    root.replaceChildren(...QUESTIONS.map((q) => {
        const row = document.createElement('fieldset');
        row.className = 'row';
        const legend = document.createElement('legend');
        legend.textContent = q.label;
        const toggle = document.createElement('div');
        toggle.className = 'toggle';
        for (const value of ['non', 'oui']) {
            const id = `${q.key}-${value}`;
            const input = document.createElement('input');
            Object.assign(input, { type: 'radio', name: q.key, id, value, checked: answers[q.key] === value });
            input.addEventListener('change', async () => {
                const { answers: current } = await getState();
                await chrome.storage.local.set({ answers: { ...current, [q.key]: value } });
            });
            const label = document.createElement('label');
            label.htmlFor = id;
            label.textContent = value === 'oui' ? 'Oui' : 'Non';
            toggle.append(input, label);
        }
        row.append(legend, toggle);
        return row;
    }));
}

async function render() {
    const { answers, run, lastDone } = await getState();
    renderStatus(run, lastDone);
    renderQuestions(answers);
}

$('start').addEventListener('click', async () => {
    const { run } = await getState();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const onSite = /^https:\/\/[^/]*francetravail\.fr\//.test(tab?.url || '');

    if (run.status !== 'running') {
        await chrome.storage.local.set({ run: { status: 'running', startedAt: Date.now(), submitted: {} } });
    }
    if (!onSite) await chrome.tabs.create({ url: START_URL });
    window.close();
});

$('export').addEventListener('click', async () => {
    const { diagnostics = [], run } = await chrome.storage.local.get(['diagnostics', 'run']);
    const blob = new Blob([JSON.stringify({ version: chrome.runtime.getManifest().version, run, diagnostics }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'diagnostic-actualisation.json';
    a.click();
});

chrome.storage.onChanged.addListener(render);
render();
