import fs from 'fs';

const edits = JSON.parse(fs.readFileSync('f:/new-websites/laube-rebuild/Rebuild-Laube-Voyage-app-last/scratch/dea-edits.json', 'utf8'));

for (const e of edits) {
  console.log(`Step ${e.step} | ${e.tool} | ${e.file}`);
  console.log(`  Desc: ${e.desc || e.instruction}`);
}
