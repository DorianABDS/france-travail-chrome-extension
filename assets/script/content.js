// Injecte le CSS de l'extension dans la page active
function injectCssIfNeeded() {
    if (!document.getElementById('auto-update-style')) {
        const style = document.createElement('link');
        style.id = 'auto-update-style';
        style.rel = 'stylesheet';
        style.type = 'text/css';
        style.href = chrome.runtime.getURL('/assets/style/styles.css');
        document.head.appendChild(style);
    }
}
injectCssIfNeeded();

// Fonction qui vérifie si la date est entre le 28 et le 15 du mois
function isWithinUpdatePeriod() {
    const today = new Date();
    const day = today.getDate();

    return (day >= 28 || day <= 15);
}

// Ajout du bouton flottant si non déjà présent dans la page
if (isWithinUpdatePeriod() && !document.getElementById('btn-automatic-update')) {
    const button = document.createElement('button');
    button.id = 'btn-automatic-update';
    button.className = 'btn-auto-update';

    // Texte du bouton
    const text = document.createTextNode("S'actualiser automatiquement");
    button.appendChild(text);

    // Clic = active l'auto-actualisation et recharge la page
    button.addEventListener('click', () => {
        localStorage.setItem('autoActuActive', 'true');
        showToast("Actualisation automatique en cours...");
        location.reload();
    });

    // Insertion dans la page
    document.body.appendChild(button);
}

// Si mode auto activé → on déclenche l'étape correspondante selon l'URL
if (localStorage.getItem('autoActuActive') === 'true') {
    const url = window.location.pathname;

    if (/\/declaration\/activites/.test(url)) {
        pageActivities();
    } else if (/\/declaration\/situations-particulieres/.test(url)) {
        pageSpecialSituations();
    } else if (/\/declaration\/validation/.test(url)) {
        pageValidation();
    }
}

// Affiche un petit toast (notification visuelle)
function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message
    toast.className = "toast-auto-update"

    document.body.appendChild(toast);

    // Disparition automatique après 3s
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Étape 1 : coche "pas d'activité" et soumet
function pageActivities() {
    const checkbox = document.querySelector('#action-activite-non');
    const button = document.querySelector('#submit-activites');

    if (checkbox) checkbox.checked = true;
    
    if (button) {
        setTimeout(() => button.click(), 300);
    }
    setTimeout(() => {
        window.location.href = window.location.href.replace('/activites', '/situations-particulieres');
    }, 1200);
}

// Étape 2 : coche "non" aux 3 questions et soumet
function pageSpecialSituations() {
    document.querySelector('#question-formation-non')?.click();
    document.querySelector('#question-pam-non')?.click();
    document.querySelector('#question-pension-non')?.click();
    
    const button = document.querySelector('#submit-situation-particuliere');
    if (button) {
        setTimeout(() => button.click(), 300);
    }

    // Redirection vers la validation
    setTimeout(() => {
        window.location.href = window.location.href.replace('/situations-particulieres', '/validation');
    }, 1200);
}

// Étape 3 : coche "oui" et finalise l'actualisation
function pageValidation() {
    const interval = setInterval(() => {
        const checkbox = document.querySelector('#question-maintienInscription-oui');
        const button = document.querySelector('#btn-valider-actu');

        if (checkbox && button) {
            checkbox.checked = true;
            button.click();
            clearInterval(interval);

            localStorage.removeItem('autoActuActive');

            const autoBtn = document.getElementById('btn-automatic-update');
            if (autoBtn) autoBtn.remove();

            setTimeout(() => {
                alert("Votre actualisation a bien été effectuée avec succès !");
            }, 1000);
        }
    }, 200);
}
