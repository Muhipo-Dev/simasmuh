const fs = require('fs');
const path = require('path');

const files = [
  'src/app/(dashboard)/jurnal-karyawan/edit/[id]/page.tsx',
  'src/app/(dashboard)/jurnal-karyawan/tambah/page.tsx',
  'src/app/(dashboard)/jurnal-mengajar/tambah/page.tsx',
  'src/app/(dashboard)/settings/page.tsx'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add Swal import if not exists
  if (!content.includes("import Swal from 'sweetalert2'")) {
    content = content.replace(/(import .* from '.*'\r?\n)/, "$1import Swal from 'sweetalert2'\n");
  }

  // Replace alert(...) with Swal
  content = content.replace(/alert\((['"`])(.*?)\1\)/g, "Swal.fire('Informasi', '$2', 'info')");
    
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Updated ' + file);
});
