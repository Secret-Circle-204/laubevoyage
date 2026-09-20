import fs from 'fs';

const edits = JSON.parse(fs.readFileSync('f:/new-websites/laube-rebuild/Rebuild-Laube-Voyage-app-last/scratch/dea-edits.json', 'utf8'));
const e461 = edits.find(e => e.step === 461);

const parsedTarget = JSON.parse(e461.targetContent);
console.log('parsedTarget starts with:');
console.log(parsedTarget.slice(0, 100));

const gitPolicy = fs.readFileSync('f:/new-websites/laube-rebuild/Rebuild-Laube-Voyage-app-last/scratch/reconstructed/src/domains/experience/accommodation-policy.ts', 'utf8');

const normPolicy = gitPolicy.replace(/\r\n/g, '\n');
const normTarget = parsedTarget.replace(/\r\n/g, '\n');

console.log('Matches?', normPolicy.includes(normTarget));
