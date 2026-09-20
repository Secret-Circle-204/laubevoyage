import fs from 'fs';
import readline from 'readline';

async function main() {
  const fileStream = fs.createReadStream('C:/Users/TUF A15/.gemini/antigravity-ide/brain/dea8b186-c560-4a44-a038-1987881cc9cd/.system_generated/logs/transcript_full.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let step = 0;
  for await (const line of rl) {
    step++;
    if (line.includes('dto-details.ts')) {
      try {
        const obj = JSON.parse(line);
        for (const tc of obj.tool_calls || []) {
          if (tc.args?.TargetFile?.includes('dto-details.ts')) {
            console.log(`Step ${step} | Tool: ${tc.name} | ${tc.args.Description || tc.args.Instruction}`);
          }
        }
      } catch {}
    }
  }
}

main();
