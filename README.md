# Auto-actualisation France Travail

![GitHub Release (latest by semver)](https://img.shields.io/github/v/release/DorianABDS/france-travail-chrome-extension)
![License](https://img.shields.io/github/license/DorianABDS/france-travail-chrome-extension)
[![Extension Chrome](https://img.shields.io/badge/Chrome%20Web%20Store-Visiter%20l'extension-blue?logo=google-chrome)](https://chrome.google.com/webstore/detail/nheggicfofogaeahlempbhgfefbpokbh)

Extension Chrome qui remplit et valide l'actualisation mensuelle sur [France Travail](https://www.francetravail.fr) en un clic, avec **vos** réponses.

---

## Fonctionnalités

- **Bouton rond sur le site France Travail** (en bas à droite) : pastille rouge et halo pulsé tant que l'actualisation du mois reste à faire, coche verte une fois faite. Un clic ouvre le panneau : statut du mois, réglage de vos réponses, bouton « Lancer l'actualisation ». Sur une page d'actualisation, le panneau s'ouvre de lui-même si c'est à faire.
- **Popup** (clic sur l'icône de l'extension) : le même panneau, accessible depuis n'importe quel site.
- **Badge sur l'icône** quand l'actualisation du mois reste à faire, ou en cas d'erreur.
- **Panneau de progression** sur le site : étape en cours, succès, ou erreur expliquée.
- **Jamais de fausse déclaration** : si vous répondez « Oui » à une question (travail, formation, arrêt maladie, pension), l'extension coche « Oui » puis vous laisse remplir les précisions. Elle reprend à l'étape suivante.
- **Détection robuste** : chaque question est cherchée par son ancien identifiant, puis par son intitulé. Si rien ne correspond, l'extension s'arrête au lieu de répondre au hasard.
- **Diagnostic exportable** : la structure des pages d'actualisation (intitulés, identifiants, boutons, sans vos saisies) est gardée localement. Exportez-la depuis la popup si le site a changé.

## Installation

### Depuis le Chrome Web Store

[Page de l'extension](https://chrome.google.com/webstore/detail/nheggicfofogaeahlempbhgfefbpokbh)

### Depuis le code source

1. Clonez le dépôt :
   ```bash
   git clone https://github.com/DorianABDS/france-travail-chrome-extension.git
   ```
2. Ouvrez `chrome://extensions` et activez le **mode développeur**.
3. Cliquez sur **Charger l'extension non empaquetée** et choisissez le dossier du dépôt.

## Utilisation

1. Entre le 28 et le 15 du mois suivant, cliquez sur l'icône de l'extension.
2. Vérifiez vos réponses, puis cliquez sur **Lancer l'actualisation**.
3. Connectez-vous à votre espace si besoin : l'extension ouvre l'actualisation et enchaîne les étapes.

## Structure

| Fichier | Rôle |
| --- | --- |
| `assets/script/shared.js` | Questions, étapes du formulaire (sélecteurs et intitulés), calcul de la période |
| `assets/script/content.js` | Moteur d'actualisation et panneau affiché sur le site |
| `assets/script/background.js` | Badge sur l'icône |
| `popup/` | Popup de l'extension |
| `test/` | Banc de test hors extension (fausse actualisation) |

Si le site change, c'est en général `STEPS` dans `shared.js` qu'il faut adapter, à partir d'un fichier de diagnostic.

## Développement

Banc de test local (fausse actualisation en 3 pages, faux `chrome.*`) :

```bash
powershell -ExecutionPolicy Bypass -File test/serve.ps1
```

Puis ouvrez `http://localhost:8765/` (moteur) ou `http://localhost:8765/test/popup-preview.html` (popup). L'URL `/declaration/activites?casse` simule un site dont un intitulé a changé.

```bash
npm ci
npm run lint
```

## Confidentialité

Aucune donnée ne quitte votre navigateur. Voir [index.html](index.html).
