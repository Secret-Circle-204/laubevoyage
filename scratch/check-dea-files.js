import fs from 'fs';
import readline from 'readline';

async function main() {
  const filePath = 'C:/Users/TUF A15/.gemini/antigravity-ide/brain/dea8b186-c560-4a44-a038-1987881cc9cd/.system_generated/logs/transcript.jsonl';
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const files = new Set();
  for await (const line of rl) {
    try {
      const obj = JSON.parse(line);
      for (const tc of obj.tool_calls || []) {
        if (tc.args?.TargetFile) files.add(tc.args.TargetFile);
      }
    } catch {}
  }
  console.log('dea8b186 files:');
  for (const f of files) {
    if (!f.includes('scratch') && !f.includes('implementation_plan') && !f.includes('walkthrough')) {
      console.log(f);
    }
  }
}

main();
