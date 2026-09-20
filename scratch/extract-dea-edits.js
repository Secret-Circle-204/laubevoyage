import fs from 'fs';
import readline from 'readline';

async function main() {
  const filePath = 'C:/Users/TUF A15/.gemini/antigravity-ide/brain/dea8b186-c560-4a44-a038-1987881cc9cd/.system_generated/logs/transcript.jsonl';
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const targets = ['loaders-details.ts', 'dto-details.ts', 'experience-mapper.ts', 'accommodation-policy.ts', 'src/domains/experience/types.ts', 'src/components/admin/accommodations/types.ts'];

  const edits = [];
  let step = 0;
  for await (const line of rl) {
    step++;
    try {
      const obj = JSON.parse(line);
      for (const tc of obj.tool_calls || []) {
        const tf = tc.args?.TargetFile || '';
        if (targets.some(t => tf.includes(t))) {
          edits.push({
            step,
            tool: tc.name,
            file: tf,
            instruction: tc.args?.Instruction,
            desc: tc.args?.Description,
            targetContent: tc.args?.TargetContent,
            replacementContent: tc.args?.ReplacementContent,
            codeContent: tc.args?.CodeContent,
            chunks: tc.args?.ReplacementChunks,
          });
        }
      }
    } catch {}
  }
  fs.writeFileSync('f:/new-websites/laube-rebuild/Rebuild-Laube-Voyage-app-last/scratch/dea-edits.json', JSON.stringify(edits, null, 2), 'utf8');
  console.log(`Extracted ${edits.length} edits from dea8b186`);
}

main();
