// Constantes et utilitaires partagés entre le content script, la popup et le service worker.
// Script classique (pas de module) : il expose un objet global `FT`.
(function () {
    const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
        'août', 'septembre', 'octobre', 'novembre', 'décembre'];

    // Questions configurables dans la popup. `default` = réponse pré-réglée.
    const QUESTIONS = [
        { key: 'travail', label: 'Avez-vous travaillé ?', default: 'non' },
        { key: 'formation', label: 'En stage ou formation ?', default: 'non' },
        { key: 'arret', label: 'Arrêt maladie, maternité ?', default: 'non' },
        { key: 'pension', label: "Pension d'invalidité ?", default: 'non' },
    ];

    // Étapes du formulaire d'actualisation. Chaque élément est cherché d'abord par ses
    // anciens IDs, puis par le texte affiché (plus stable que les IDs).
    const STEPS = [
        {
            id: 'activites',
            label: 'Activités déclarées',
            url: /\/activites/i,
            questions: [{
                key: 'travail',
                ids: { non: '#action-activite-non', oui: '#action-activite-oui' },
                text: /travaill|activit[ée]|exerc[ée]/i,
            }],
            submit: { ids: ['#submit-activites'], text: /^(suivant|continuer|valider)/i },
        },
        {
            id: 'situations',
            label: 'Situations particulières',
            url: /situations?-particuli/i,
            questions: [
                {
                    key: 'formation',
                    ids: { non: '#question-formation-non', oui: '#question-formation-oui' },
                    text: /formation|stage/i,
                },
                {
                    key: 'arret',
                    ids: { non: '#question-pam-non', oui: '#question-pam-oui' },
                    text: /maladie|maternit|paternit|accident/i,
                },
                {
                    key: 'pension',
                    ids: { non: '#question-pension-non', oui: '#question-pension-oui' },
                    text: /pension|retraite|invalidit/i,
                },
            ],
            submit: { ids: ['#submit-situation-particuliere'], text: /^(suivant|continuer|valider)/i },
        },
        {
            id: 'validation',
            label: "Confirmation de l'inscription",
            url: /\/validation/i,
            questions: [{
                key: 'maintien',
                fixed: 'oui',
                ids: { oui: '#question-maintienInscription-oui' },
                text: /rester inscrit|maintien|inscrit/i,
            }],
            submit: { ids: ['#btn-valider-actu'], text: /^(valider|confirmer|envoyer|je valide)/i },
            final: true,
        },
    ];

    // Espace personnel : il affiche le bloc « Mon actualisation » (statut du mois) et le lien pour s'actualiser.
    const START_URL = 'https://candidat.francetravail.fr/espacepersonnel/';

    // Un run plus vieux que ça est considéré comme abandonné.
    const RUN_TTL_MS = 30 * 60 * 1000;

    function defaultAnswers() {
        return Object.fromEntries(QUESTIONS.map((q) => [q.key, q.default]));
    }

    // Date du jour. Le banc de test peut la simuler via `__FT_NOW__` (sans effet dans l'extension,
    // dont les scripts tournent dans un monde isolé de la page).
    function today() {
        return globalThis.__FT_NOW__ ? new Date(globalThis.__FT_NOW__) : new Date();
    }

    // Nombre de jours calendaires de `a` à `b`.
    function daysBetween(a, b) {
        const day = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
        return Math.round((day(b) - day(a)) / 86400000);
    }

    // Période d'actualisation : du 28 du mois M au 15 du mois M+1, pour le mois M. Le 28 est la date
    // habituelle ; France Travail la décale parfois (jours fériés, février).
    // Renvoie { open, key: 'AAAA-MM', label, deadline, daysLeft, next } ou { open: false, next },
    // `next` décrivant la prochaine ouverture : { date: '28 novembre', month: 'novembre', days }.
    function currentPeriod(now = today()) {
        const day = now.getDate();
        const nextStart = day >= 28
            ? new Date(now.getFullYear(), now.getMonth() + 1, 28)
            : new Date(now.getFullYear(), now.getMonth(), 28);
        const next = { date: `28 ${MONTHS[nextStart.getMonth()]}`, month: MONTHS[nextStart.getMonth()], days: daysBetween(now, nextStart) };

        if (day >= 28 || day <= 15) {
            const ref = day >= 28
                ? new Date(now.getFullYear(), now.getMonth(), 1)
                : new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const deadline = new Date(ref.getFullYear(), ref.getMonth() + 1, 15);
            return {
                open: true,
                key: `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`,
                label: MONTHS[ref.getMonth()],
                deadline: `15 ${MONTHS[deadline.getMonth()]}`,
                daysLeft: daysBetween(now, deadline),
                next,
            };
        }
        return { open: false, next };
    }

    function plural(n, word) {
        return `${n} ${word}${n > 1 ? 's' : ''}`;
    }

    function formatDate(iso) {
        const d = new Date(iso);
        return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
    }

    // Minuscules sans accents (« Février » → « fevrier »).
    function normalize(s) {
        return (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
    }

    function sameMonth(a, b) {
        return normalize(a) === normalize(b);
    }

    // Mois cité après « mois de » / « mois d' » dans un texte. On cherche un des 12 noms connus plutôt
    // que « le mot suivant » : le site colle ses blocs sans espace (« …mois de OctobreCalendrier… »).
    function monthAfterMoisDe(text) {
        const flat = normalize(text);
        return MONTHS.find((m) => new RegExp(`mois d(e\\s*|'\\s*)${normalize(m)}`).test(flat)) || null;
    }

    // « de novembre », mais « d'octobre », « d'avril », « d'août ».
    function deMois(month) {
        return /^[aeiouéèêh]/i.test(month) ? `d'${month}` : `de ${month}`;
    }

    async function getState() {
        const data = await chrome.storage.local.get(['answers', 'run', 'lastDone', 'siteStatus']);
        return {
            answers: { ...defaultAnswers(), ...(data.answers || {}) },
            run: data.run || { status: 'idle' },
            lastDone: data.lastDone || null,
            // Dernier statut lu dans le bloc « Mon actualisation » de l'espace personnel.
            siteStatus: data.siteStatus || null,
        };
    }

    // Marque l'actualisation de la période comme faite. `source` : extension | site | manual.
    async function markDone(source, extra = {}) {
        const period = currentPeriod();
        await chrome.storage.local.set({ lastDone: { date: today().toISOString(), period: period.key || null, source, ...extra } });
    }

    // Statut affiché en tête de la popup et du panneau sur le site.
    // `state` : running | error | off | done | pending | todo.
    // `action` : libellé du bouton principal (absent quand il n'y a rien à lancer).
    // `next` : prochaine ouverture, pour le compte à rebours (hors période ou une fois validée).
    // `answersFor` : mois auquel s'appliquent les réponses affichées.
    function statusInfo(run, lastDone, siteStatus) {
        const period = currentPeriod();
        if (run.status === 'running') {
            return { state: 'running', tone: 'info', text: 'Actualisation en cours dans un onglet France Travail.', action: "Voir l'actualisation", answersFor: period.label };
        }
        if (run.status === 'error') {
            return { state: 'error', tone: 'danger', text: run.message || 'La dernière tentative a échoué.', action: 'Réessayer', answersFor: period.label };
        }
        if (!period.open) {
            return { state: 'off', tone: 'info', text: "Tout est bon : rien à faire pour l'instant.", next: period.next, answersFor: period.next.month };
        }
        if (lastDone?.period === period.key) {
            const text = lastDone.source === 'site'
                ? `Actualisation ${deMois(period.label)} validée${lastDone.siteDate ? ` le ${lastDone.siteDate}` : ''}, d'après votre espace France Travail. Tout est bon.`
                : lastDone.source === 'manual'
                    ? `Actualisation ${deMois(period.label)} indiquée comme faite. Tout est bon.`
                    : `Actualisation ${deMois(period.label)} faite le ${formatDate(lastDone.date)}. Tout est bon.`;
            return { state: 'done', tone: 'success', text, next: period.next, answersFor: period.next.month };
        }
        if (siteStatus?.period === period.key) {
            return { state: 'pending', tone: 'info', text: `Actualisation ${deMois(period.label)} : « ${siteStatus.label} » sur votre espace France Travail.`, action: "Lancer l'actualisation", answersFor: period.label };
        }
        // Dans les 3 derniers jours, le bandeau passe au rouge.
        const left = period.daysLeft === 0 ? "C'est le dernier jour." : `Il vous reste ${plural(period.daysLeft, 'jour')}.`;
        return {
            state: 'todo',
            tone: period.daysLeft <= 3 ? 'danger' : 'warning',
            text: `Actualisation ${deMois(period.label)} à faire avant le ${period.deadline}. ${left}`,
            action: "Lancer l'actualisation",
            canMarkDone: true,
            answersFor: period.label,
        };
    }

    // Bloc compte à rebours jusqu'à la prochaine ouverture (null s'il n'y a pas lieu d'en afficher).
    function buildCountdown(info) {
        if (!info.next) return null;
        const { days, date } = info.next;
        const box = document.createElement('div');
        box.className = 'countdown';
        const count = document.createElement('strong');
        count.textContent = days;
        const what = document.createElement('span');
        what.textContent = `${days > 1 ? 'jours' : 'jour'} avant la prochaine actualisation`;
        const when = document.createElement('span');
        when.className = 'when';
        when.textContent = `À partir du ${date} (date habituelle)`;
        box.append(count, what, when);
        return box;
    }

    // Lignes « question + Non/Oui » ; chaque changement est enregistré directement.
    function buildQuestions(answers) {
        return QUESTIONS.map((q) => {
            const row = document.createElement('fieldset');
            row.className = 'row';
            const legend = document.createElement('legend');
            legend.textContent = q.label;
            const toggle = document.createElement('div');
            toggle.className = 'toggle';
            for (const value of ['non', 'oui']) {
                const input = document.createElement('input');
                Object.assign(input, { type: 'radio', name: q.key, id: `ft-${q.key}-${value}`, value, checked: answers[q.key] === value });
                input.addEventListener('change', async () => {
                    const { answers: current } = await getState();
                    await chrome.storage.local.set({ answers: { ...current, [q.key]: value } });
                });
                const label = document.createElement('label');
                label.htmlFor = input.id;
                label.textContent = value === 'oui' ? 'Oui' : 'Non';
                toggle.append(input, label);
            }
            row.append(legend, toggle);
            return row;
        }).concat(stayRegisteredRow());
    }

    // « Rester inscrit » : toujours « Oui », c'est le but de l'actualisation. Affiché verrouillé
    // pour que l'utilisateur voie ce qui sera répondu.
    function stayRegisteredRow() {
        const row = document.createElement('div');
        row.className = 'row fixed';
        const label = document.createElement('span');
        label.textContent = 'Rester inscrit ?';
        const value = document.createElement('span');
        value.className = 'locked';
        value.title = "Toujours « Oui » : c'est ce qui maintient votre inscription à France Travail.";
        value.textContent = 'Oui, toujours';
        row.append(label, value);
        return row;
    }

    async function startRun() {
        await chrome.storage.local.set({ run: { status: 'running', startedAt: Date.now(), submitted: {} } });
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

    globalThis.FT = {
        MONTHS, QUESTIONS, STEPS, START_URL, RUN_TTL_MS,
        defaultAnswers, today, currentPeriod, formatDate, sameMonth, monthAfterMoisDe, deMois, getState, markDone, statusInfo,
        buildCountdown, buildQuestions, startRun, exportDiagnostic,
    };
})();
