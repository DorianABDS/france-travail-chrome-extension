const fs = require('fs');

// Lire le fichier et extraire la version depuis package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = packageJson.version;

// Définir le chemin vers manifest.json, lire et le parser
const manifestPath = 'manifest.json';
const manifestJson = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Mettre à jour la propriété version dans manifest.json avec celle de package.json
manifestJson.version = version;

// Réécrire manifest.json avec la nouvelle version
fs.writeFileSync(manifestPath, JSON.stringify(manifestJson, null, 2) + '\n');

console.log(`Manifest version updated to ${version}`);
