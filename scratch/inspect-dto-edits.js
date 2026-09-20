import fs from 'fs';

const edits = JSON.parse(fs.readFileSync('f:/new-websites/laube-rebuild/Rebuild-Laube-Voyage-app-last/scratch/dea-edits.json', 'utf8'));

const dtoEdits = edits.filter(e => e.file.includes('dto-details'));
console.log('DTO edits in dea8b186:');
for (const e of dtoEdits) {
  console.log(`Step ${e.step} | ${e.tool} | ${e.desc || e.instruction}`);
  console.log('--- TARGET ---');
  console.log(e.targetContent);
  console.log('--- REPLACEMENT ---');
  console.log(e.replacementContent);
}
