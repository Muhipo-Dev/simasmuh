const fs = require('fs');
const path = require('path');

function updateStudents() {
  const file = path.join(__dirname, 'src/app/(dashboard)/students/page.tsx');
  let content = fs.readFileSync(file, 'utf8');

  // Update parser
  content = content.replace(/name: row\['Nama Lengkap'\] \|\| '',/g, "name: row['Nama Siswa'] || '',");
  content = content.replace(/gender: row\['Jenis Kelamin'\] === 'Perempuan' \? 'P' : 'L',/g, "gender: row['L/P'] === 'P' || row['L/P'] === 'Perempuan' ? 'P' : 'L',");
  content = content.replace(/const className = row\['Nama Kelas'\] \|\| ''/g, "const className = row['Kelas'] || ''");
  
  // Update template
  content = content.replace(
    /\{ 'NISN': '0012345678', 'NIS': '1001', 'Nama Lengkap': 'Ahmad Dahlan', 'Jenis Kelamin': 'Laki-Laki', 'Nama Kelas': 'X IPA 1', 'ID Kelas': '\(Opsional jika Nama Kelas valid\)', 'Username': 'ahmad123', 'Password': 'password123' \}/g,
    "{ 'NISN': '0012345678', 'NIS': '1001', 'Nama Siswa': 'Ahmad Dahlan', 'L/P': 'L', 'Kelas': 'X IPA 1', 'Username': 'ahmad123', 'Password': 'password123' }"
  );
  
  fs.writeFileSync(file, content, 'utf8');
  console.log('Updated students');
}

function updateTeachers() {
  const file = path.join(__dirname, 'src/app/(dashboard)/teachers/page.tsx');
  let content = fs.readFileSync(file, 'utf8');

  // Update parser
  content = content.replace(/nip: String\(row\['NIP'\] \|\| ''\),/g, "nip: String(row['NIP / NBM'] || ''),");
  content = content.replace(/phone: String\(row\['Telepon'\] \|\| ''\),/g, "phone: String(row['No. HP'] || ''),");

  // Update template
  content = content.replace(
    /\{ 'NIP': '123456789', 'Nama Lengkap': 'Budi Santoso', 'Username': 'budis', 'Email': 'budi@sekolah\.com', 'Telepon': '0812345678', 'Password': 'password123' \}/g,
    "{ 'NIP / NBM': '123456789', 'Nama Lengkap': 'Budi Santoso', 'Username': 'budis', 'Email': 'budi@sekolah.com', 'No. HP': '0812345678', 'Password': 'password123' }"
  );
  
  fs.writeFileSync(file, content, 'utf8');
  console.log('Updated teachers');
}

function updateClasses() {
  const file = path.join(__dirname, 'src/app/(dashboard)/classes/page.tsx');
  let content = fs.readFileSync(file, 'utf8');

  // Update parser
  content = content.replace(/level: parseInt\(row\['Tingkat Kelas'\]\) \|\| 10,/g, "level: parseInt(row['Tingkat']) || 10,");

  // Update template
  content = content.replace(
    /\{ 'Nama Kelas': 'X IPA 1', 'Tingkat Kelas': 10, 'Tahun Ajaran': '2023\/2024' \}/g,
    "{ 'Nama Kelas': 'X IPA 1', 'Tingkat': 10, 'Tahun Ajaran': '2023/2024' }"
  );
  
  fs.writeFileSync(file, content, 'utf8');
  console.log('Updated classes');
}

updateStudents();
updateTeachers();
updateClasses();
