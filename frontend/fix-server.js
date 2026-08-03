const fs = require('fs');
const path = require('path');

function revert(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/authenticatedFetch\(/g, 'fetch(');
  content = content.replace(/import \{ useAuthenticatedFetch \} from '@\/hooks\/useAuthenticatedFetch'\r?\n/g, '');
  fs.writeFileSync(filePath, content, 'utf8');
}

revert(path.join(__dirname, 'src/app/page.tsx'));
revert(path.join(__dirname, 'src/app/agenda/page.tsx'));
console.log('Reverted server components');
