// Ajout du bouton flottant si non déjà présent dans la page
if (!document.getElementById('btn-automatic-update')) {
    const button = document.createElement('button');
    button.id = 'btn-automatic-update';
    button.className = 'btn bg-primary-custom bg-primary-custom-hover text-light fw-medium rounded-4 py-2';
    button.style.position = 'fixed';
    button.style.bottom = '20px';
    button.style.right = '20px';
    button.style.zIndex = '10000';

    // Icône dans le bouton
    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('icons/actu-auto.svg');
    img.className = 'me-2';
    img.alt = "Actualisation automatique";
    img.style.width = '16px';
    button.appendChild(img);

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
        pageActivities(); // étape 1
    } else if (/\/declaration\/situations-particulieres/.test(url)) {
        pageSpecialSituations(); // étape 2
    } else if (/\/declaration\/validation/.test(url)) {
        pageValidation(); // étape 3
    }
}

// Affiche un petit toast (notification visuelle)
function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.padding = '12px 20px';
    toast.style.backgroundColor = '#007bff';
    toast.style.color = '#fff';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    toast.style.zIndex = '10000';
    toast.style.fontWeight = 'bold';

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

    // Redirection vers l'étape suivante
    setTimeout(() => {
        window.location.href = '/declaration/situations-particulieres';
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
        window.location.href = '/declaration/validation';
    }, 1200);
}

// Étape 3 : coche "oui" et finalise l'actualisation
function pageValidation() {
    const checkbox = document.querySelector('#question-maintienInscription-oui');
    const button = document.querySelector('#btn-valider-actu');

    if (checkbox) checkbox.checked = true;

    if (button) {
        setTimeout(() => {
            button.click();
            localStorage.removeItem('autoActuActive');

            setTimeout(() => {
                alert("Votre actualisation a bien été effectuée avec succès !");
            }, 1000);
        }, 600);
    } else {
        console.warn("Bouton de validation non trouvé !");
    }
}
