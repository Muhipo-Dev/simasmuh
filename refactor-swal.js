const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend/src/app/(dashboard)');

function walkSync(dir, callback) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filepath = path.join(dir, file);
    const stats = fs.statSync(filepath);
    if (stats.isDirectory()) {
      walkSync(filepath, callback);
    } else if (stats.isFile() && filepath.endsWith('.tsx')) {
      callback(filepath);
    }
  });
}

function refactorFile(filepath) {
  let content = fs.readFileSync(filepath, 'utf8');
  let changed = false;

  // Add import if needed
  if (content.includes('alert(') || content.includes('confirm(')) {
    if (!content.includes("import Swal from 'sweetalert2'")) {
      content = content.replace(/(import .*?\n)(?!import)/, "$1import Swal from 'sweetalert2'\n");
      changed = true;
    }
  }

  // Replace simple alert
  // alert('msg') -> Swal.fire('Informasi', 'msg', 'info')
  const alertRegex = /alert\((.*?)\)/g;
  content = content.replace(alertRegex, (match, msg) => {
    changed = true;
    return `Swal.fire({ title: 'Informasi', text: String(${msg}), icon: 'info' })`;
  });

  // Replace if (confirm(msg)) { body }
  
  let i = 0;
  while ((i = content.indexOf('if (confirm(', i)) !== -1) {
    const confirmStart = i + 12; // after 'if (confirm('
    const confirmEnd = content.indexOf(')) {', confirmStart);
    if (confirmEnd === -1) {
      i += 10;
      continue;
    }
    const msg = content.substring(confirmStart, confirmEnd);
    
    const braceStart = confirmEnd + 3; // at '{'
    
    // Find matching closing brace
    let braceCount = 1;
    let j = braceStart + 1;
    while (j < content.length && braceCount > 0) {
      if (content[j] === '{') braceCount++;
      if (content[j] === '}') braceCount--;
      j++;
    }
    const braceEnd = j - 1; // at '}'
    
    const body = content.substring(braceStart + 1, braceEnd);
    
    const replacement = `Swal.fire({
      title: 'Konfirmasi',
      text: String(${msg}),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, lanjutkan!',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {${body}}
    })`;
    
    content = content.substring(0, i) + replacement + content.substring(braceEnd + 1);
    changed = true;
    i += replacement.length; // move past the replacement
  }

  if (changed) {
    fs.writeFileSync(filepath, content, 'utf8');
    console.log('Refactored:', filepath);
  }
}

walkSync(srcDir, refactorFile);
console.log('Done refactoring!');
