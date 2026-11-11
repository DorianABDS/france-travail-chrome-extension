// Popup : réglage des réponses, statut du mois et lancement de l'actualisation.
const { START_URL, formatDate, getState, markDone, statusInfo, buildCountdown, buildUnregisterNotice, buildQuestions, startRun, exportDiagnostic } = FT;

const $ = (id) => document.getElementById(id);

async function render() {
    const { answers, run, lastDone, siteStatus } = await getState();
    const info = statusInfo(run, lastDone, siteStatus);

    $('status').className = `status ${info.tone}`;
    $('status').textContent = info.text;
    $('countdown').replaceChildren(...[buildUnregisterNotice(answers), buildCountdown(info)].filter(Boolean));
    $('answers-title').textContent = `Vos réponses pour ${info.answersFor}`;
    // Rien à lancer hors période ou une fois validée : le compte à rebours remplace le bouton.
    $('start').hidden = !info.action;
    $('start').textContent = info.action || '';
    $('mark-done').hidden = !info.canMarkDone;
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
$('mark-done').addEventListener('click', () => markDone('manual'));

chrome.storage.onChanged.addListener(render);
render();
