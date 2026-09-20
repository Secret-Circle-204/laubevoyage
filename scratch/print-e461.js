import fs from 'fs';

const edits = JSON.parse(fs.readFileSync('f:/new-websites/laube-rebuild/Rebuild-Laube-Voyage-app-last/scratch/dea-edits.json', 'utf8'));

const e461 = edits.find(e => e.step === 461);
console.log('--- Step 461 TARGET ---');
console.log(e461.targetContent);
console.log('--- Step 461 REPLACEMENT ---');
console.log(e461.replacementContent);
