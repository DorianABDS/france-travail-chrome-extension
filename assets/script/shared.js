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

    const START_URL = 'https://www.francetravail.fr/accueil/';

    // Un run plus vieux que ça est considéré comme abandonné.
    const RUN_TTL_MS = 30 * 60 * 1000;

    function defaultAnswers() {
        return Object.fromEntries(QUESTIONS.map((q) => [q.key, q.default]));
    }

    // Période d'actualisation : du 28 du mois M au 15 du mois M+1, pour le mois M.
    // Renvoie { open, key: 'AAAA-MM', label, deadline } ou { open: false, nextOpen }.
    function currentPeriod(now = new Date()) {
        const day = now.getDate();
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
            };
        }
        return { open: false, nextOpen: `28 ${MONTHS[now.getMonth()]}` };
    }

    function formatDate(iso) {
        const d = new Date(iso);
        return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
    }

    async function getState() {
        const data = await chrome.storage.local.get(['answers', 'run', 'lastDone']);
        return {
            answers: { ...defaultAnswers(), ...(data.answers || {}) },
            run: data.run || { status: 'idle' },
            lastDone: data.lastDone || null,
        };
    }

    globalThis.FT = { MONTHS, QUESTIONS, STEPS, START_URL, RUN_TTL_MS, defaultAnswers, currentPeriod, formatDate, getState };
})();
