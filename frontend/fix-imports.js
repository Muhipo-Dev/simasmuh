const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  const importLine = "import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'";
  
  // Count how many times it appears
  const count = content.split(importLine).length - 1;
  
  if (count > 0) {
    // Remove all occurrences
    content = content.replace(new RegExp(importLine + '\\n?', 'g'), '');
    content = content.replace(new RegExp(importLine, 'g'), '');
    
    // Add it exactly once at the top
    content = importLine + "\n" + content;
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Cleaned and fixed:', filePath);
  }
}

const filesToFix = [
  'src/app/(dashboard)/classes/page.tsx',
  'src/app/(dashboard)/students/page.tsx',
  'src/app/(dashboard)/subjects/page.tsx',
  'src/app/(dashboard)/teachers/page.tsx',
  'src/app/(dashboard)/keuangan-masuk/page.tsx'
];

for (const file of filesToFix) {
  fixFile(path.join(__dirname, file));
}
