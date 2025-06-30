if (!document.getElementById('btn-automatic-update')) {
    const button = document.createElement('button');
    button.id = 'btn-automatic-update';
    button.className = 'btn bg-primary-custom bg-primary-custom-hover text-light fw-medium rounded-4 py-2';
    button.style.position = 'fixed';
    button.style.bottom = '20px';
    button.style.right = '20px';
    button.style.zIndex = '10000';

    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('icons/actu-auto.svg');
    img.className = 'me-2';
    img.alt = "Actualisation automatique";
    img.style.width = '16px';
    button.appendChild(img);

    const text = document.createTextNode("S'actualiser automatiquement");
    button.appendChild(text);

    button.addEventListener('click', () => {
        localStorage.setItem('autoActuActive', 'true');
        window.location.href = '/candidat/actualisation/declaration';
    });

    document.body.appendChild(button);
}

const autoActu = localStorage.getItem('autoActuActive') === 'true';
const url = window.location.pathname + window.location.search;
console.log("Path détecté :", url);

if (autoActu) {
    if (url === '/candidat/actualisation/declaration') {
        startActualisation();
    } else if (/\/declaration\/activites/.test(url)) {
        pageActivities();
    } else if (/\/declaration\/situations-particulieres/.test(url)) {
        pageSpecialSituations();
    } else if (/\/declaration\/validation/.test(url)) {
        pageValidation();
    } else {
        console.log("Page non encore prise en charge :", url);
    }
}

function startActualisation() {
    console.log("Page de départ détectée, tentative de lancement de l’actualisation...");
    const startBtn = document.querySelector('a[href*="/declaration/activites"]');
    if (startBtn) {
        setTimeout(() => startBtn.click(), 500);
    } else {
        console.warn("Lien vers les activités non trouvé !");
    }
}

function pageActivities() {
    console.log('Page activités détectée');
    const checkbox = document.querySelector('#action-activite-non');
    if (checkbox) checkbox.checked = true;

    const button = document.querySelector('#submit-activites');
    if (button) {
        setTimeout(() => button.click(), 300);
    }

    setTimeout(() => {
        window.location.href = '/declaration/situations-particulieres';
    }, 1200);
}

function pageSpecialSituations() {
    console.log('Page situations particulières détectée');
    const formation = document.querySelector('#question-formation-non');
    const pam = document.querySelector('#question-pam-non');
    const pension = document.querySelector('#question-pension-non');

    if (formation) formation.checked = true;
    if (pam) pam.checked = true;
    if (pension) pension.checked = true;

    const button = document.querySelector('#submit-situation-particuliere');
    if (button) {
        setTimeout(() => button.click(), 300);
    }

    setTimeout(() => {
        window.location.href = '/declaration/validation';
    }, 1200);
}

function pageValidation() {
    console.log('Page validation détectée');
    const checkbox = document.querySelector('#question-maintienInscription-oui');
    if (checkbox) checkbox.checked = true;

    const button = document.querySelector('#btn-valider-actu');
    if (button) {
        setTimeout(() => {
            button.click();
            localStorage.removeItem('autoActuActive');
            alert("Actualisation automatique terminée avec succès !");
        }, 600);
    } else {
        console.warn("Bouton de validation non trouvé !");
    }
}
