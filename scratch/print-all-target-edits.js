import fs from 'fs';
import readline from 'readline';

async function main() {
  const filePath = 'C:/Users/TUF A15/.gemini/antigravity-ide/brain/7711fd03-edb1-495b-b436-fdbbad3c339d/.system_generated/logs/transcript.jsonl';
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const targets = ['loaders-details.ts', 'dto-details.ts', 'experience-mapper.ts', 'accommodation-policy.ts', 'types.ts', 'Experiences.ts'];

  const out = [];
  let step = 0;
  for await (const line of rl) {
    step++;
    try {
      const obj = JSON.parse(line);
      if (obj.tool_calls) {
        for (const tc of obj.tool_calls) {
          const tf = tc.args?.TargetFile || '';
          if (targets.some(t => tf.includes(t))) {
            out.push(`\n################################################################`);
            out.push(`### Step ${step} | Tool: ${tc.name} | Target: ${tf}`);
            out.push(`### Description: ${tc.args?.Description || tc.args?.Instruction}`);
            if (tc.name === 'replace_file_content') {
              out.push('--- TARGET ---');
              out.push(tc.args.TargetContent);
              out.push('--- REPLACEMENT ---');
              out.push(tc.args.ReplacementContent);
            } else if (tc.name === 'write_to_file') {
              out.push('--- WRITE_TO_FILE (length: ' + (tc.args.CodeContent?.length || 0) + ') ---');
            } else if (tc.name === 'multi_replace_file_content') {
              out.push('--- MULTI_REPLACE ---');
              for (const chunk of tc.args.ReplacementChunks || []) {
                out.push('>>> TARGET:');
                out.push(chunk.TargetContent);
                out.push('>>> REPLACEMENT:');
                out.push(chunk.ReplacementContent);
              }
            }
          }
        }
      }
    } catch {}
  }
  fs.writeFileSync('f:/new-websites/laube-rebuild/Rebuild-Laube-Voyage-app-last/scratch/target-edits-output.txt', out.join('\n'), 'utf8');
  console.log('Done writing utf8 output, total entries:', out.length);
}

main();
