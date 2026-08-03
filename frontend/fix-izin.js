const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', '(dashboard)', 'izin-keluar', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add import
if (!content.includes('useAuthenticatedFetch')) {
  content = "import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'\n" + content;
}

// 2. Add hook
const hookString = "  const authenticatedFetch = useAuthenticatedFetch();";
if (!content.includes(hookString)) {
  const componentRegex = /export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{/;
  const match = componentRegex.exec(content);
  if (match) {
    const insertPos = match.index + match[0].length;
    content = content.slice(0, insertPos) + "\n" + hookString + content.slice(insertPos);
  }
}

// 3. Replace fetch with authenticatedFetch
content = content.replace(/\bfetch\(/g, 'authenticatedFetch(');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed izin-keluar/page.tsx');
