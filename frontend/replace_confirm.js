const fs = require('fs');
const path = require('path');

const files = [
  'src/app/(dashboard)/users/page.tsx',
  'src/app/(dashboard)/teaching-journals/page.tsx',
  'src/app/(dashboard)/jurnal-mengajar/page.tsx',
  'src/app/(dashboard)/jurnal-karyawan/page.tsx',
  'src/app/(dashboard)/homeroom-journals/page.tsx',
  'src/app/(dashboard)/grades/page.tsx',
  'src/app/(dashboard)/attendances/page.tsx'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add Swal import if not exists
  if (!content.includes("import Swal from 'sweetalert2'")) {
    content = content.replace(/(import .* from '.*'\r?\n)/, "$1import Swal from 'sweetalert2'\n");
  }

  // Replace confirm(...) with Swal
  content = content.replace(/if\s*\(\s*confirm\s*\(\s*(['"`])(.*?)\1\s*\)\s*\)\s*\{\s*deleteMutation\.mutate\(id\)\s*\}/g, 
    `Swal.fire({
      title: 'Konfirmasi',
      text: '$2',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, hapus!',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        deleteMutation.mutate(id)
      }
    })`);
    
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Updated ' + file);
});
