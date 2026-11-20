import fs from 'fs';
import path from 'path';

const roots = [
  'src/Components/Distrbutor',
  'src/Components/OpeningInventory',
].map((p) => path.join(process.cwd(), p));

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.jsx')) files.push(full);
  }
  return files;
}

let fixed = 0;

for (const root of roots) {
  for (const file of walk(root)) {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;

    content = content.replace(/text-xl md:pd-page-title/g, 'pd-page-title');
    content = content.replace(
      'className="h-[70vh] w-full"',
      'className="pd-page"><div className="pd-card pd-list-grid p-2 h-[70vh] w-full overflow-x-auto"',
    );

    if (content.includes('pd-card pd-list-grid')) {
      const exportIdx = content.lastIndexOf('\nexport default');
      const returnIdx = content.lastIndexOf('return (', exportIdx);
      if (returnIdx !== -1 && exportIdx !== -1) {
        const tail = content.slice(returnIdx, exportIdx);
        const opens = (tail.match(/className="pd-page"><div/g) || []).length;
        const closes = (tail.match(/<\/div>/g) || []).length;
        if (opens > 0 && closes === opens) {
          const insertAt = content.lastIndexOf('</div>', exportIdx);
          content = `${content.slice(0, insertAt)}</div>${content.slice(insertAt)}`;
        }
      }
    }

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      fixed++;
    }
  }
}

console.log(`Fixed ${fixed} files`);