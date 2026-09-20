import fs from 'fs';
import readline from 'readline';

async function main() {
  const filePath = 'C:/Users/TUF A15/.gemini/antigravity-ide/brain/7711fd03-edb1-495b-b436-fdbbad3c339d/.system_generated/logs/transcript.jsonl';
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let step = 0;
  for await (const line of rl) {
    step++;
    try {
      const obj = JSON.parse(line);
      if (obj.tool_calls) {
        for (const tc of obj.tool_calls) {
          if (tc.name === 'replace_file_content' || tc.name === 'write_to_file' || tc.name === 'multi_replace_file_content') {
            const tf = tc.args?.TargetFile;
            if (tf && step < 165) {
              console.log(`\n=== Step ${step} | ${tc.name} | ${tf} ===`);
              console.log(JSON.stringify(tc.args, null, 2));
            }
          }
        }
      }
    } catch {}
  }
}

main();
