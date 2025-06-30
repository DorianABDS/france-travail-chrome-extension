if (!document.getElementById('btn-automatic-update')) {
    // Création du bouton
    const button = document.createElement('button');
    button.id = 'btn-automatic-update';
    button.className = 'btn bg-primary-custom bg-primary-custom-hover text-light fw-medium rounded-4 py-2';
    button.style.position = 'fixed';
    button.style.bottom = '20px';
    button.style.right = '20px';
    button.style.zIndex = '10000';

    // Création de l'image
    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('/icons/actu-auto.svg');
    img.className = 'me-2';
    img.alt = "Actualisation automatique";
    img.style.width = '16px';
    button.appendChild(img);

    // Création du texte
    const text = document.createTextNode("S'actualiser automatiquement");
    button.appendChild(text);

    // Exécution de l'automatisation des informations
    button.addEventListener('click', () => {
        const url = window.location.href;

        if (url.includes('/declaration/activites')) {
            pageActivities();
        } else if (url.includes('/declaration/situations-particulieres')) {
            pageSpecialSituations();
        } else if (url.includes('/declaration/validation')) {
            pageValidation();
        } else {
            alert("Page non reconnue pour l'actualisation automatique.");
        }
    });

    document.body.appendChild(button);
}

// Fonction de la page Activités -> 1 checkbox false et 1 click boutton
function pageActivities() {
    console.log('Page activités détectée');

    const checkbox = document.querySelector('#action-activite-non');
    if (checkbox) checkbox.checked = true;

    const button = document.querySelector('#submit-activites');
    if (button) setTimeout(() => button.click(), 300);
}

// Fonction de la page situation particulieres -> 3 checkbox false et 1 click boutton
function pageSpecialSituations() {
    console.log('Page situations particulières détectée');

    const formation = document.querySelector('#question-formation-non');
    const pam = document.querySelector('#question-pam-non');
    const pension = document.querySelector('#question-pension-non');

    if (formation) formation.checked = true;
    if (pam) pam.checked = true;
    if (pension) pension.checked = true;

    const button = document.querySelector('#submit-situation-particuliere');
    if (button) setTimeout(() => button.click(), 300);
}

// Fonction de la page Validation -> 1 checkbox true et 1 click boutton
function pageValidation() {
    console.log('Page validation détectée');

    const checkbox = document.querySelector('#question-maintienInscription-oui');
    if (checkbox) checkbox.checked = true;

    console.log('test OK');

    // const button = document.querySelector('#btn-valider-actu');
    // if (button) setTimeout(() => {
    //     button.click();
    //     alert("Actualisation terminée !");
    // }, 500);
}
