import fs from 'fs';
import readline from 'readline';

async function main() {
  const fileStream = fs.createReadStream('C:/Users/TUF A15/.gemini/antigravity-ide/brain/dea8b186-c560-4a44-a038-1987881cc9cd/.system_generated/logs/transcript_full.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    try {
      const obj = JSON.parse(line);
      for (const tc of obj.tool_calls || []) {
        if (tc.name === 'replace_file_content' && tc.args?.Description?.includes('Stay hierarchy with options[]')) {
          console.log('Found e461 in transcript_full!');
          console.log('TargetContent length:', tc.args.TargetContent.length);
          console.log('ReplacementContent length:', tc.args.ReplacementContent.length);

          const gitPolicy = fs.readFileSync('f:/new-websites/laube-rebuild/Rebuild-Laube-Voyage-app-last/scratch/reconstructed/src/domains/experience/accommodation-policy.ts', 'utf8');
          console.log('Includes in gitPolicy?', gitPolicy.replace(/\r\n/g, '\n').includes(tc.args.TargetContent.replace(/\r\n/g, '\n')));
          return;
        }
      }
    } catch (e) {
      console.error('Parse error:', e);
    }
  }
}

main();
