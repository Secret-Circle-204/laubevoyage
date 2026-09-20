import fs from 'fs';
import readline from 'readline';

async function main() {
  const fileStream = fs.createReadStream('C:/Users/TUF A15/.gemini/antigravity-ide/brain/dea8b186-c560-4a44-a038-1987881cc9cd/.system_generated/logs/transcript_full.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let step = 0;
  for await (const line of rl) {
    step++;
    if (step >= 60 && step <= 75) {
      try {
        const obj = JSON.parse(line);
        console.log(`Step ${step} | source: ${obj.source} | type: ${obj.type}`);
        if (obj.content && obj.content.includes('File Path:')) {
          const m = obj.content.match(/File Path: `file:\/\/\/([^`]+)`/);
          console.log(`  Content viewed file: ${m ? m[1] : 'unknown'}`);
        }
        if (obj.tool_calls) {
          for (const tc of obj.tool_calls) {
            console.log(`  Tool call: ${tc.name} -> ${tc.args.AbsolutePath || tc.args.TargetFile}`);
          }
        }
      } catch {}
    }
  }
}

main();
