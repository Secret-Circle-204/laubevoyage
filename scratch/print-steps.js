import fs from 'fs';
import readline from 'readline';

async function main() {
  const filePath = 'C:/Users/TUF A15/.gemini/antigravity-ide/brain/7711fd03-edb1-495b-b436-fdbbad3c339d/.system_generated/logs/transcript.jsonl';
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const out = [];
  let step = 0;
  for await (const line of rl) {
    step++;
    if (step === 159 || step === 163 || step === 133) {
      try {
        const obj = JSON.parse(line);
        for (const tc of obj.tool_calls || []) {
          out.push(`\n================== STEP ${step} ==================`);
          out.push(tc.args.ReplacementContent);
        }
      } catch {}
    }
  }
  fs.writeFileSync('f:/new-websites/laube-rebuild/Rebuild-Laube-Voyage-app-last/scratch/steps-output.txt', out.join('\n'), 'utf8');
  console.log('Wrote steps-output.txt');
}

main();
