const fs = require('fs');
const path = require('path');

function fixUseClient(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.startsWith("import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'\n'use client'")) {
    content = content.replace(
      "import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'\n'use client'",
      "'use client'\nimport { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'"
    );
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed use client:', filePath);
  }
}

function fixKeuanganMasuk(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  // Remove the newly added one if it was added twice or if `useAuthenticatedFetch` is already in `useAuthenticatedQuery` import
  if (content.includes("import { useAuthenticatedQuery, useAuthenticatedFetch }")) {
     content = content.replace("import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'\n", "");
     fs.writeFileSync(filePath, content, 'utf8');
     console.log('Fixed keuangan-masuk double import:', filePath);
  }
}

const files = [
  'src/app/(dashboard)/classes/page.tsx',
  'src/app/(dashboard)/students/page.tsx',
  'src/app/(dashboard)/subjects/page.tsx',
  'src/app/(dashboard)/teachers/page.tsx',
  'src/app/(dashboard)/keuangan-masuk/page.tsx'
];

for (const file of files) {
  fixUseClient(path.join(__dirname, file));
}

fixKeuanganMasuk(path.join(__dirname, 'src/app/(dashboard)/keuangan-masuk/page.tsx'));
