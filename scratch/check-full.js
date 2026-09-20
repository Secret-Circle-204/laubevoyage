import fs from 'fs';

const path1 = 'C:/Users/TUF A15/.gemini/antigravity-ide/brain/7711fd03-edb1-495b-b436-fdbbad3c339d/.system_generated/logs/transcript_full.jsonl';
const path2 = 'C:/Users/TUF A15/.gemini/antigravity-ide/brain/dea8b186-c560-4a44-a038-1987881cc9cd/.system_generated/logs/transcript_full.jsonl';

console.log('path1 exists:', fs.existsSync(path1), fs.existsSync(path1) ? fs.statSync(path1).size : 0);
console.log('path2 exists:', fs.existsSync(path2), fs.existsSync(path2) ? fs.statSync(path2).size : 0);
