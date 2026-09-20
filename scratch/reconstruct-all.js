import { execSync } from 'child_process';
import fs from 'fs';
import readline from 'readline';

function getGitContent(commit, filePath) {
  try {
    return execSync(`git show ${commit}:${filePath}`, {
      cwd: 'f:/new-websites/laube-rebuild/Rebuild-Laube-Voyage-app-last',
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
    });
  } catch (err) {
    return null;
  }
}

async function getEditsFromFullLog(logPath) {
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  const edits = [];
  let step = 0;

  for await (const line of rl) {
    step++;
    try {
      const obj = JSON.parse(line);
      for (const tc of obj.tool_calls || []) {
        if (['replace_file_content', 'write_to_file', 'multi_replace_file_content'].includes(tc.name)) {
          edits.push({
            step,
            tool: tc.name,
            args: tc.args,
          });
        }
      }
    } catch (e) {
      console.error(`Error parsing line at step ${step}:`, e.message);
    }
  }
  return edits;
}

function cleanPath(p) {
  if (!p) return '';
  return p.replace(/['"]/g, '').replace(/\\\\/g, '/').toLowerCase();
}

function applyReplace(content, target, replacement, allowMultiple = false) {
  const normContent = content.replace(/\r\n/g, '\n');
  const normTarget = target.replace(/\r\n/g, '\n');
  const normReplacement = replacement.replace(/\r\n/g, '\n');

  if (!normContent.includes(normTarget)) {
    throw new Error(`Target not found in content! Target: ${JSON.stringify(normTarget.slice(0, 100))}`);
  }

  if (allowMultiple) {
    return normContent.split(normTarget).join(normReplacement);
  }
  return normContent.replace(normTarget, normReplacement);
}

async function main() {
  console.log('Loading full edits from dea8b186...');
  const deaEdits = await getEditsFromFullLog('C:/Users/TUF A15/.gemini/antigravity-ide/brain/dea8b186-c560-4a44-a038-1987881cc9cd/.system_generated/logs/transcript_full.jsonl');
  console.log(`Loaded ${deaEdits.length} edits from dea8b186.`);

  console.log('Loading full edits from 7711fd03...');
  const p77Edits = await getEditsFromFullLog('C:/Users/TUF A15/.gemini/antigravity-ide/brain/7711fd03-edb1-495b-b436-fdbbad3c339d/.system_generated/logs/transcript_full.jsonl');
  console.log(`Loaded ${p77Edits.length} edits from 7711fd03.`);

  const allEdits = [...deaEdits, ...p77Edits];

  const targetFiles = [
    'src/domains/experience/types.ts',
    'src/domains/experience/accommodation-policy.ts',
    'src/domains/experience/repository/experience-mapper.ts',
    'src/application/experience/dto-details.ts',
    'src/application/experience/loaders-details.ts',
    'src/components/admin/accommodations/types.ts',
    'src/migrations/index.ts',
    'src/collections/Experiences.ts',
  ];

  for (const relPath of targetFiles) {
    console.log(`\n================ Processing: ${relPath} ================`);
    let content = getGitContent('9c72cfd', relPath);
    if (!content) {
      console.log(`File was newly created in dea8b186 or 7711fd03.`);
      content = '';
    } else {
      console.log(`Initial size from git commit 9c72cfd: ${content.length} chars`);
    }

    const fileEdits = allEdits.filter(e => {
      const tf = cleanPath(e.args?.TargetFile);
      return tf.endsWith(relPath.toLowerCase());
    });

    console.log(`Found ${fileEdits.length} edits targeting this file.`);

    let success = true;
    for (let i = 0; i < fileEdits.length; i++) {
      const edit = fileEdits[i];
      try {
        if (edit.tool === 'write_to_file') {
          content = edit.args.CodeContent;
          console.log(`  [${i + 1}/${fileEdits.length}] write_to_file (size: ${content.length})`);
        } else if (edit.tool === 'replace_file_content') {
          content = applyReplace(content, edit.args.TargetContent, edit.args.ReplacementContent, edit.args.AllowMultiple === true || edit.args.AllowMultiple === 'true');
          console.log(`  [${i + 1}/${fileEdits.length}] replace_file_content: ${edit.args.Description || edit.args.Instruction}`);
        } else if (edit.tool === 'multi_replace_file_content') {
          for (const chunk of edit.args.ReplacementChunks || []) {
            content = applyReplace(content, chunk.TargetContent, chunk.ReplacementContent, chunk.AllowMultiple === true || chunk.AllowMultiple === 'true');
          }
          console.log(`  [${i + 1}/${fileEdits.length}] multi_replace_file_content: ${edit.args.Description || edit.args.Instruction}`);
        }
      } catch (err) {
        console.error(`  ERROR applying edit [${i + 1}/${fileEdits.length}]:`, err.message);
        success = false;
        break;
      }
    }

    if (success && content) {
      const destPath = `f:/new-websites/laube-rebuild/Rebuild-Laube-Voyage-app-last/scratch/restored_exact/${relPath}`;
      fs.mkdirSync(destPath.substring(0, destPath.lastIndexOf('/')), { recursive: true });
      fs.writeFileSync(destPath, content, 'utf8');
      console.log(`✅ EXACT RECONSTRUCTION SUCCESS: saved to scratch/restored_exact/${relPath} (size: ${content.length} chars)`);
    } else {
      console.error(`❌ FAILED to reconstruct ${relPath}`);
    }
  }
}

main();
