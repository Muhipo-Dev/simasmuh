const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/(dashboard)/keuangan-masuk/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const functions = ['TagihanModal', 'TagihanMassalModal', 'TabTagihan', 'TabRekap', 'TabYayasan'];

for (const fn of functions) {
  const searchStr = `function ${fn}(`;
  const idx = content.indexOf(searchStr);
  if (idx !== -1) {
    const endOfDecl = content.indexOf('{', idx) + 1;
    
    // Check if it already has it just in case
    const checkArea = content.substring(endOfDecl, endOfDecl + 100);
    if (!checkArea.includes('authenticatedFetch = useAuthenticatedFetch')) {
       content = content.substring(0, endOfDecl) + '\n  const authenticatedFetch = useAuthenticatedFetch();' + content.substring(endOfDecl);
    }
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed keuangan-masuk subcomponents');
