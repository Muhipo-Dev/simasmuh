const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // If no fetch is used, skip
  if (!content.includes('fetch(') || content.includes('const res = await fetch(') === false && !content.includes('fetch(`/api')) {
    if (!content.includes('fetch(')) return;
  }
  
  // If already uses authenticatedFetch heavily instead of fetch, skip (mostly)
  // Let's just safely replace all `fetch(`/api` and `fetch('/api`
  
  let modified = false;

  // 1. Add Import
  if (!content.includes("import { useAuthenticatedFetch }")) {
    // Find last import
    const lastImportIndex = content.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
      const endOfLastImport = content.indexOf('\n', lastImportIndex);
      content = content.slice(0, endOfLastImport) + "\nimport { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'" + content.slice(endOfLastImport);
      modified = true;
    } else {
      content = "import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'\n" + content;
      modified = true;
    }
  }

  // 2. Add Hook inside component
  if (!content.includes("const authenticatedFetch = useAuthenticatedFetch()")) {
    // Find the default export function
    const componentRegex = /export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{/;
    const match = componentRegex.exec(content);
    
    if (match) {
      const insertPos = match.index + match[0].length;
      content = content.slice(0, insertPos) + "\n  const authenticatedFetch = useAuthenticatedFetch();" + content.slice(insertPos);
      modified = true;
    } else {
      // Maybe it's an arrow function component?
      const arrowRegex = /const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{/;
      const arrowMatch = arrowRegex.exec(content);
      if (arrowMatch) {
         const insertPos = arrowMatch.index + arrowMatch[0].length;
         content = content.slice(0, insertPos) + "\n  const authenticatedFetch = useAuthenticatedFetch();" + content.slice(insertPos);
         modified = true;
      }
    }
  }

  // 3. Replace fetch( with authenticatedFetch(
  // We only replace if it's hitting our API (to be safe, or just any fetch since Next.js proxy is used)
  const newContent = content.replace(/\bfetch\(/g, 'authenticatedFetch(');
  if (newContent !== content) {
    content = newContent;
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed:', filePath);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      processFile(fullPath);
    }
  }
}

const targetDir = path.join(__dirname, 'src', 'app');
console.log('Scanning:', targetDir);
walkDir(targetDir);
console.log('Done.');
