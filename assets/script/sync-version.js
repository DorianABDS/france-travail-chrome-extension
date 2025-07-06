import fs from 'fs';

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = packageJson.version;

const manifestPath = 'manifest.json';
const manifestJson = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

manifestJson.version = version;

fs.writeFileSync(manifestPath, JSON.stringify(manifestJson, null, 2) + '\n');

console.log(`Manifest version updated to ${version}`);
