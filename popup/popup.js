// Popup : réglage des réponses, statut du mois et lancement de l'actualisation.
const { START_URL, formatDate, getState, statusInfo, buildQuestions, startRun, exportDiagnostic } = FT;

const $ = (id) => document.getElementById(id);

async function render() {
    const { answers, run, lastDone } = await getState();
    const info = statusInfo(run, lastDone);

    $('status').className = `status ${info.tone}`;
    $('status').textContent = info.text;
    $('start').textContent = info.action;
    $('start').disabled = !!info.disabled;
    $('last').textContent = lastDone ? `Dernière : ${formatDate(lastDone.date)}` : '';
    $('questions').replaceChildren(...buildQuestions(answers));
}

$('start').addEventListener('click', async () => {
    const { run } = await getState();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const onSite = /^https:\/\/[^/]*francetravail\.fr\//.test(tab?.url || '');

    if (run.status !== 'running') await startRun();
    if (!onSite) await chrome.tabs.create({ url: START_URL });
    window.close();
});

$('export').addEventListener('click', exportDiagnostic);

chrome.storage.onChanged.addListener(render);
render();
