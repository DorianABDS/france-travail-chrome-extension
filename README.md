# Auto-actualisation France Travail

![GitHub Release (latest by semver)](https://img.shields.io/github/v/release/DorianABDS/france-travail-chrome-extension)
![License](https://img.shields.io/github/license/DorianABDS/france-travail-chrome-extension)
[![Extension Chrome](https://img.shields.io/badge/Chrome%20Web%20Store-Visiter%20l'extension-blue?logo=google-chrome)](https://chrome.google.com/webstore/detail/nheggicfofogaeahlempbhgfefbpokbh)



Cette extension Chrome ajoute un **bouton d'auto-actualisation intelligente** sur le site [France Travail](https://www.francetravail.fr), permettant aux utilisateurs de lancer automatiquement le processus d’actualisation mensuelle sans intervention manuelle.

---

## Fonctionnalités

- **Ajout d’un bouton flottant "S’actualiser automatiquement"** sur le site.
- **Sauvegarde de l’état activé/désactivé** grâce au stockage local (`chrome.storage`).
- **Déclenchement automatique des étapes du formulaire** :
  - Page activités → coche "pas d’activité"
  - Situations particulières → coche "non" aux trois questions
  - Validation finale → coche "oui" et confirme l'actualisation
- **Notifications visuelles (toast)** pendant l’exécution.
- **Interface responsive et simple à utiliser**.

---

## Installation

### Depuis le code source

1. Clone ce dépôt ou télécharge le zip :
   ```bash
   git clone https://github.com/tonpseudo/auto-actualisation-france-travail.git