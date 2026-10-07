# CHANGELOG - SIMASMUH

Semua catatan perubahan dan pembaruan sistem SIMASMUH didokumentasikan di berkas ini.

## 1.0.0 (2026-10-07)

### 🚀 Fitur Baru

* **academic:** enforce strict role isolation and supervisory journal monitoring for kepala sekolah ([ab913bc](https://github.com/Muhipo-Dev/simasmuh/commit/ab913bcb5f6f435922e1c9e85abfb3eec50d584e))
* **academic:** implement 5-day school schedule, aSc timetables parser optimization, and conflict analysis ([e6e05b2](https://github.com/Muhipo-Dev/simasmuh/commit/e6e05b2d574b6fe9be8196821e97da0f870e36a4))
* **academic:** implement master data buku induk and precision f4 landscape print sheet ([ef76fbb](https://github.com/Muhipo-Dev/simasmuh/commit/ef76fbb0c6a04288216c834bde01e3b9b839c28b))
* **academic:** implementasi modul supervisi akademik, perangkat ajar, ekstrakurikuler kesiswaan & prestasi siswa ([84758f3](https://github.com/Muhipo-Dev/simasmuh/commit/84758f31cb3d3df61605041decc3cf998732ac0b))
* add backup-restore snapshot and confidential multi-factor system reset in File Explorer ([ce31614](https://github.com/Muhipo-Dev/simasmuh/commit/ce316141f34efbf9ff84cf07710812f433c0e84e))
* add Select All, individual selection, bulk edit serentak, and bulk delete to Guru, Siswa, Kelas, and Mapel tables ([830b294](https://github.com/Muhipo-Dev/simasmuh/commit/830b294eec51004ce80865339094f2edb9249f0e))
* add single active global academic year setting as reference for all app features ([540c6a9](https://github.com/Muhipo-Dev/simasmuh/commit/540c6a92c700fe9fc2bc2076b273a7b754cbcc41))
* add SPMB Online (d/h PPDB Online) and e-Rapor Coming Soon pages with nav links ([9aeca4b](https://github.com/Muhipo-Dev/simasmuh/commit/9aeca4b9585e3fcb4737662db8eed86c6ba6ffc8))
* add SPMB Online link to public navigation header, pra-pendaftaran coming soon form, and digital brochure download ([61d8703](https://github.com/Muhipo-Dev/simasmuh/commit/61d8703f55ff4f78d5e5c03acdbab344ecc39a6e))
* **akademik:** integrasi penilaian adab etika ibadah siswa tatib bk dan dashboard statistika ([17ec063](https://github.com/Muhipo-Dev/simasmuh/commit/17ec063b3d9ef720d75c2d774b89aba19ec2147b))
* **akademik:** sinkronisasi kelas wali kelas, sidebar peran, dan presensi harian perwalian ([63ec1ee](https://github.com/Muhipo-Dev/simasmuh/commit/63ec1ee45bd31e62bdcc08bd2fa7ae6c31d48e85))
* **api:** terapkan resolusi backend URL dinamis dan hilangkan tumpuk elemen mobile banner ([7b7d365](https://github.com/Muhipo-Dev/simasmuh/commit/7b7d365ecdd920d4b57431c0d57d806d94197c58))
* **assets:** compress and include full database backup zip and update gitignore ([9216c27](https://github.com/Muhipo-Dev/simasmuh/commit/9216c27f414d9d9a66fb7910e87191983465a6c5))
* **attendance:** implementasi modul Presensi Camera AI (YOLOv11), integrasi dataset foto profil, dan halaman konfigurasi superadmin ([8e499b7](https://github.com/Muhipo-Dev/simasmuh/commit/8e499b76ff8120cdd64557952245c35138b10147))
* **attendance:** tambah area live monitoring stream RTSP kamera YOLOv11 dan split-screen live scanner log presensi ([5fc4124](https://github.com/Muhipo-Dev/simasmuh/commit/5fc41240f08d2b3898438d761dee97b07373025e))
* **attendance:** tambah kontrol start-stop microservice port 8005, preset stream camera (webcam, http, video), status port 8005 dan auto-install python dependensi di launcher SIMASMUH ([124818e](https://github.com/Muhipo-Dev/simasmuh/commit/124818e49869146680177a53d6a4a85fa82f1bd8))
* **auth:** implement active inactive user student parent status and access control ([6f60584](https://github.com/Muhipo-Dev/simasmuh/commit/6f60584d1feeb9e3916a5ebbc9725fe21da1e5cc))
* auto-populate default fee amount on new bill creation with editable input ([2c8f4b3](https://github.com/Muhipo-Dev/simasmuh/commit/2c8f4b36433d1f9abe0e520b7173040faee5c520))
* backend-calculated SPP, DPP kader discount, in-app delete modal dialog, select feature & bulk delete in users management ([2bb59ea](https://github.com/Muhipo-Dev/simasmuh/commit/2bb59eafc65aa4a36ebb39fde8c18283c7544431))
* **backend:** optimize academic, attendance, finance, TU services and standardize WhatsApp communications ([9224714](https://github.com/Muhipo-Dev/simasmuh/commit/92247143bdcbe97777bb3884bfe2921c8665b084))
* **bau:** berikan akses CRUD penuh untuk BAU/Admin TU & sembunyikan e-Rapor sementara ([ade97bb](https://github.com/Muhipo-Dev/simasmuh/commit/ade97bb6683e4e0be400e4d09daa763580aa06af))
* **bau:** tambahkan role Admin Tata Usaha / BAU dan fitur Buku Tamu, Persuratan, Inventaris, Kepegawaian HRD, & Keuangan ([34477a4](https://github.com/Muhipo-Dev/simasmuh/commit/34477a4e834b25b3b6374a42540ac10b7f272345))
* **branding:** synchronize navbar logo and favicon with admin panel logo configuration ([2f99b0b](https://github.com/Muhipo-Dev/simasmuh/commit/2f99b0b2423806eedccbb0e0c419c56edf537393))
* **calendar:** add maximize full dialog modal button to activity calendar widget across all dashboards ([4d7f208](https://github.com/Muhipo-Dev/simasmuh/commit/4d7f2084deab20529442baa2dce29039ca658fee))
* **calendar:** update fullscreen calendar redirect, clean filters, and glassmorphism styling ([e3a1437](https://github.com/Muhipo-Dev/simasmuh/commit/e3a1437f1ecb307afd54781bf47fa58ae1142117))
* **changelog:** push changes for 24 & 25 august 2026 including finance, roles, attendance & UI updates ([1e0c53f](https://github.com/Muhipo-Dev/simasmuh/commit/1e0c53fadde70e1c996580d06128940e86c7ed05))
* chunked import progress popup & monorepo structure sync ([e168e5e](https://github.com/Muhipo-Dev/simasmuh/commit/e168e5ef98a662662838bdaf37b5b30ef8e49bc5))
* **config:** sync GTK Masuk-Pulang cooldown dynamically with slider and quick preset buttons ([a9faa07](https://github.com/Muhipo-Dev/simasmuh/commit/a9faa077e3ce5430330b326a952b698c09c77731))
* **core:** enhance whatsapp gateway session 30d, character assessments and update changelog v1.9.2 ([36cf786](https://github.com/Muhipo-Dev/simasmuh/commit/36cf7865a2dd57748254a12646417067eb695553))
* **core:** sinkronisasi algoritma tanggal dan waktu sistem UTC+7 (Asia/Jakarta) & live clock sync ([063477e](https://github.com/Muhipo-Dev/simasmuh/commit/063477e05524f0441455342c7c6e4c9abca83632))
* **dashboard:** hapus widget berita dari dasbor kepala sekolah dan arahkan ke menu pengumuman ([1acbab8](https://github.com/Muhipo-Dev/simasmuh/commit/1acbab8e676c2da8e5fc732cb60348cf11ea44d8))
* **dashboard:** implementasi panel multi-kurva analitik komprehensif per sektor eksekutif ([a656595](https://github.com/Muhipo-Dev/simasmuh/commit/a656595178eb0dfbb9e781096921a36ae84d017c))
* **dashboard:** kurva multi-sektor interaktif (presensi, keuangan, prestasi & demografi) dengan proporsi tinggi optimal ([117cdff](https://github.com/Muhipo-Dev/simasmuh/commit/117cdff39d5c9bb3c6da1323334724801768c3b0))
* **dashboard:** kurva tren mingguan presensi dan menu akses cepat fitur pegawai untuk kepala sekolah ([2fe5f13](https://github.com/Muhipo-Dev/simasmuh/commit/2fe5f13bd642e015b95596104dd1c4b4916eeae9))
* **dashboard:** mengaktifkan seluruh tombol pusat pengawasan data sekolah untuk supervisi eksekutif kepala sekolah (read-only monitoring) ([462f237](https://github.com/Muhipo-Dev/simasmuh/commit/462f237f41c3fdff07befbd6e45e59916440427a))
* **dashboard:** modularize superadmin dashboard, enhance user session management and update changelog v1.9.0 ([366d9c2](https://github.com/Muhipo-Dev/simasmuh/commit/366d9c2054af30f7046210e283581bdd480aa5d6))
* **dashboard:** pindahkan tombol pusat pengawasan dan akses data sekolah ke area atas ([0f37909](https://github.com/Muhipo-Dev/simasmuh/commit/0f37909e4036ee547c5ac3a4cac084273dafba8e))
* **db:** add siakad-coba database dump backup ([740dde7](https://github.com/Muhipo-Dev/simasmuh/commit/740dde771c70d744740bf7877b8720453c8dd3a0))
* **db:** tambahkan auto SSL detection untuk Supabase & Local Postgres di PrismaService ([95b8b44](https://github.com/Muhipo-Dev/simasmuh/commit/95b8b44ddc95f08a9dc2774d94a772f813e384eb))
* display detailed student scholarship in student table & restrict scholarship editing exclusively to finance role ([b054ec6](https://github.com/Muhipo-Dev/simasmuh/commit/b054ec62eb26ecc4b8671e3933795c58949fb34b))
* enable direct Beasiswa button on every student row in Keuangan Pemasukan table ([03d8db9](https://github.com/Muhipo-Dev/simasmuh/commit/03d8db9642b2156797a833a8fa56b3dce1a56ebf))
* enable RLS and add VirtualAccountTransaction schema ([67be094](https://github.com/Muhipo-Dev/simasmuh/commit/67be09465f395542fdb152ee3005b08a900c39a4))
* **face-attendance:** customize arrival greeting for students to 'selamat belajar di SMA MUHIPO' ([d413df0](https://github.com/Muhipo-Dev/simasmuh/commit/d413df0b03f30e84ac968f723dffd7ba374c0f04))
* **face-attendance:** implement multi-camera streaming and superadmin access control ([197585f](https://github.com/Muhipo-Dev/simasmuh/commit/197585f02a205f7c5d98a20c750c891c646dd14b))
* **face-attendance:** optimize facenet attendance flow for GTK & students with female voice greeting ([604ef17](https://github.com/Muhipo-Dev/simasmuh/commit/604ef17099f6e1c30920ca942075e871865e2032))
* **face-attendance:** separate independent camera 1 and camera 2 configuration cards with 3-mode switchers ([1be4c4e](https://github.com/Muhipo-Dev/simasmuh/commit/1be4c4ec2bcea592796410f373b52069c4d34b65))
* **face-attendance:** standardize arrival greeting for all users to SMA MUHIPO welcome message ([f8c0601](https://github.com/Muhipo-Dev/simasmuh/commit/f8c06018d7c1c6b8abec8a3becb0bd6f2dd1b5b0))
* **face-attendance:** update FaceNet AI service, frontend camera, and backend attendance integration ([dbd3add](https://github.com/Muhipo-Dev/simasmuh/commit/dbd3add004ec022ce75b6444e647864e55902d11))
* **face-attendance:** update greeting message for completed/early attendance ([8e452d4](https://github.com/Muhipo-Dev/simasmuh/commit/8e452d42c812b6a6cb52b4824a4e8fee06a1cf95))
* **face-attendance:** update greeting to 'presensi belum waktunya atau sudah lengkap, silakan coba lagi nanti' ([35d19d4](https://github.com/Muhipo-Dev/simasmuh/commit/35d19d40abd5090237071202c4f70977ed026dab))
* **face-attendance:** upgrade FaceNet MTCNN alignment, realtime DB sync, zero-flicker camera, and clean UI ([17f372e](https://github.com/Muhipo-Dev/simasmuh/commit/17f372ef847b4b48ed52b61031473bcdb632b80d))
* **facenetai:** integrasi Bio-Fusion AI, optimasi presensi wajah, penamaan presensi biometrik AI, dan 1-click device setup launcher ([98e0412](https://github.com/Muhipo-Dev/simasmuh/commit/98e0412d48ed44a295a276c6b6fb8992eb757c92))
* **facenetai:** optimize manual/auto scan switcher, 16:9 widescreen ratio, full screen kiosk dashboard, and cooldown logic ([ba1cafb](https://github.com/Muhipo-Dev/simasmuh/commit/ba1cafbbe207c1a01c0b80e0b6ee1eb032fe5362))
* **facenetai:** relocate digital clock and date panel above attendance logs and compact log area ([4571d77](https://github.com/Muhipo-Dev/simasmuh/commit/4571d7786d998f1169352e1479f318a0cc249e1d))
* **facenetai:** tata ulang layout presisi 1080p 16:9 satu layar tanpa scroll ([2610328](https://github.com/Muhipo-Dev/simasmuh/commit/261032808242b90e638d1347dc112af1acc9c1f3))
* **finance-dashboard:** sinkronisasi algoritma perhitungan keuangan, audit database dan penyelarasan kurva analitik dashboard ([507ac3e](https://github.com/Muhipo-Dev/simasmuh/commit/507ac3e3e183ba50972cd41f77efe5dc721b079a))
* **finance:** add dedicated Area Tagihan Sedang Diangsur section and filter tabs in admin TagihanModal and student PaymentBillingPopup ([e1a3682](https://github.com/Muhipo-Dev/simasmuh/commit/e1a3682ce15b998032356d6d66303d048a49d7b3))
* **finance:** add default student discount configuration in student master data menu and auto-apply logic ([3e9a633](https://github.com/Muhipo-Dev/simasmuh/commit/3e9a63308dfb6573f06bc91f42822c9bf5697ffc))
* **finance:** add discount selection and partial installment support for manual cash payments ([a88f851](https://github.com/Muhipo-Dev/simasmuh/commit/a88f851de6bcb3a128773a239e84d8153d26fd72))
* **finance:** add installment system, sync prisma-supabase, revise layout ([727e757](https://github.com/Muhipo-Dev/simasmuh/commit/727e757e1020ab481050bc795726ab1dc2d58715))
* **finance:** add password-authenticated restricted student bill reset with bulk and individual selection ([6771c42](https://github.com/Muhipo-Dev/simasmuh/commit/6771c42f7107fee2c40ecb39f56af0090da0a50b))
* **finance:** add student installment input on proof upload & manual cash payment system ([d9d15be](https://github.com/Muhipo-Dev/simasmuh/commit/d9d15bebcc3f4c45a69aa95b8cb8e4b586caee09))
* **finance:** consolidate UKA & UKS billing types and enhance modal dialog layout responsiveness and symmetry ([2b7843c](https://github.com/Muhipo-Dev/simasmuh/commit/2b7843c5afdcc10fd47e3b47c9aeb174c5575ad0))
* **finance:** implement automatic angsuran kurang bayar calculation for partial bill payments ([75976b4](https://github.com/Muhipo-Dev/simasmuh/commit/75976b45e43c1426d44d85f06a9de0f1339e6595))
* **finance:** move default fee and program discount settings to finance menu ([a191946](https://github.com/Muhipo-Dev/simasmuh/commit/a1919464a20a349fa1c9246446b43f2bc0f3a7c6))
* **finance:** redesign ManualCashPaymentModal with rich student info cards, interactive billing selection, and live receipt breakdown preview ([34e823a](https://github.com/Muhipo-Dev/simasmuh/commit/34e823a252a2703eb62807d6c6377779cc7c6d6f))
* **finance:** replace dropdown with interactive live text search for manual cash payment modal ([28fe3ea](https://github.com/Muhipo-Dev/simasmuh/commit/28fe3ea9abad987a0a98884bc93e776e8d86aff7))
* **finance:** wire up reset button in student detail tagihan modal header to trigger password auth flow ([3909bc1](https://github.com/Muhipo-Dev/simasmuh/commit/3909bc11e8504d2bcfd5e2888caf6d666acba5ea))
* **frontend:** add real-time superadmin dashboard, session manager, guest book UI and permission adjustments ([fb62431](https://github.com/Muhipo-Dev/simasmuh/commit/fb624316b8295cbfe1d74e3925e38d1ad4f8c1ef))
* **home:** fungsikan tombol pelajari lebih lanjut di program unggulan dengan modal dialog interaktif ([4e83488](https://github.com/Muhipo-Dev/simasmuh/commit/4e834881d9e35f22d2b144e57053f7ca8cb2902e))
* implement document auto-compression, storage categories, and extracurricular documentation updates ([ebd2dc6](https://github.com/Muhipo-Dev/simasmuh/commit/ebd2dc6dc2b0dc36c78837de6c96c9414b625a5a))
* implement facenetai permissions, threshold separation and full sync ([5d2c22d](https://github.com/Muhipo-Dev/simasmuh/commit/5d2c22d63bd6367fc1876c4aa70da1ed9289109c))
* implement teacher-subject many-to-many relationship and subject management in admin master data ([bba6578](https://github.com/Muhipo-Dev/simasmuh/commit/bba6578aa6283bf7dccb7b1a35cc07f6a91ac714))
* implement Windows 11 style File Explorer, payment proof linking, FaceNet on-demand startup, and role standardization to ADMIN_TU ([e3e217a](https://github.com/Muhipo-Dev/simasmuh/commit/e3e217ab594cb2fcf5f70475f2c4ab1b6e38757a))
* implementasi labeling siswa, template import excel, kalkulasi keuangan server-side, & refactor layout ([63bdb33](https://github.com/Muhipo-Dev/simasmuh/commit/63bdb33784aed9921bf0f6e568e53c9535b56711))
* integrasi kalender terpadu khgt, tag peringatan nasional, jadwal sholat, pengumuman sistem, dan perbaikan modul ([8b1af8b](https://github.com/Muhipo-Dev/simasmuh/commit/8b1af8b462487bc6530194d65fdb49cdfb91e2c1))
* integrasi modul tata usaha, persuratan e-sign, buku tamu digital, sistem poin disiplin & update changelog ([a1c9c43](https://github.com/Muhipo-Dev/simasmuh/commit/a1c9c433e7bb1dc104cfcfaf57dc22fb29ca2ab4))
* integrasi notifikasi multi-kanal (email & whatsapp), manajemen notifikasi pengguna dan pembaruan changelog v1.9.3 ([c8027bf](https://github.com/Muhipo-Dev/simasmuh/commit/c8027bf5eafa079b8ad21af22f830fe456bf85df))
* **jurnal-presensi:** perbaiki routing jurnal mengajar, jurnal pegawai, dan pisahkan log presensi pegawai & siswa ([395da9f](https://github.com/Muhipo-Dev/simasmuh/commit/395da9fea4ce898824cbb9a15eb0d53c28241baa))
* **kepala-sekolah:** akses supervisi read-only ke data master (guru, siswa, kelas, jadwal, keuangan, presensi) ([8347d4c](https://github.com/Muhipo-Dev/simasmuh/commit/8347d4c600d5df0f9fa15ab99fb9f1e1761cd773))
* **kepala-sekolah:** akses supervisi read-only ke semua halaman keuangan (pemasukan, pengeluaran, laporan, lpj, penggajian, verifikasi) ([6674378](https://github.com/Muhipo-Dev/simasmuh/commit/66743781f40f629bbd7b4100552704bbaa9a9f81))
* **keuangan:** fungsikan sub role kebersihan otomatis sebagai CS untuk kalkulasi tunjangan absen dan transport ([be3d035](https://github.com/Muhipo-Dev/simasmuh/commit/be3d035a3f314736ae3d857f2b01627b43f487a2))
* **keuangan:** hapus menu LPJ dan tambahkan fitur pendataan Dana Bantuan sinkron Keuangan Keluar & Penggajian ([0dfa930](https://github.com/Muhipo-Dev/simasmuh/commit/0dfa930b8c5ba777855b57df3b114e9903d8267d))
* **keuangan:** izinkan akses penuh CRUD modul penggajian untuk pengguna role/sub-role Keuangan Keluar ([347570c](https://github.com/Muhipo-Dev/simasmuh/commit/347570c345647e3fa1c3666881e6a80be1af5b69))
* **keuangan:** izinkan akses penuh CRUD penggajian pegawai untuk pengguna role/sub-role Keuangan Masuk ([ff7336b](https://github.com/Muhipo-Dev/simasmuh/commit/ff7336b15d3873524580236ed7353016fc62c2d6))
* **keuangan:** optimasi rekap presensi uang makan transport, format cetak PDF A4, dan penambahan status CS ([0a75389](https://github.com/Muhipo-Dev/simasmuh/commit/0a75389a7b7e62c99d2420b958581e1a6089de8b))
* **keuangan:** otomatisasi status jabatan CS by system untuk semua pegawai dengan role/subrole kebersihan ([ccaf7c3](https://github.com/Muhipo-Dev/simasmuh/commit/ccaf7c37eaa2daff3c2aa1f6ef91f388448a722b))
* **launcher:** implementasikan smart environment analyzer dan auto-fallback native cmd pada JALANKAN_SIMASMUH.bat ([dc8d143](https://github.com/Muhipo-Dev/simasmuh/commit/dc8d143b16d11b0e81872c515f5b524bc0fda0a5))
* manage active session devices with unlink and logout capability ([6fe3688](https://github.com/Muhipo-Dev/simasmuh/commit/6fe3688113f2446c7c1db60ac89f407f8c4c6e70))
* opsional nominal & diskon default, selector periode bulan/tahun serentak, serta hapus input jatuh tempo ([b8ebf7b](https://github.com/Muhipo-Dev/simasmuh/commit/b8ebf7b8927291af954512e788a2aac41d7b6743))
* optimasi waiting room cerdas beban server 80 persen, kontrol kuota login manual, dan standarisasi tabel responsif ([5c9e913](https://github.com/Muhipo-Dev/simasmuh/commit/5c9e91333ed58e1d287d16e7f48fb83e5851a3b9))
* optimize disposisi & e-sign notification workflow (in-app dashboard & smtp email) ([80cf885](https://github.com/Muhipo-Dev/simasmuh/commit/80cf885f17612c79f0d877ed212c555a77cbdef2))
* **pages:** fungsikan rute navbar publik untuk beranda, profil, tentang, dan portal berita ([457921e](https://github.com/Muhipo-Dev/simasmuh/commit/457921eb459d52cfa7472875d80ad9d4205150e9))
* **parent-portal:** implement multi-student parent role, whatsapp notification system, modern authentication UI, launcher enhancements, and changelog ([42a54ce](https://github.com/Muhipo-Dev/simasmuh/commit/42a54ce1f543c0436fb259ee80db1bafd99440ba))
* penyelarasan filter terpadu di samping search bar dan optimasi tabel mobile/desktop ([e984bc6](https://github.com/Muhipo-Dev/simasmuh/commit/e984bc671088c9c7b9d158b0722e8ae7daccf897))
* **presensi-pegawai:** add live realtime camera preview and scan logs to public presensi guru & karyawan page ([07959f5](https://github.com/Muhipo-Dev/simasmuh/commit/07959f5e6bac6555f71136175215848bd3accbe5))
* **presensi:** add live realtime camera preview and scan logs to kehadiran pegawai page ([a244494](https://github.com/Muhipo-Dev/simasmuh/commit/a244494e9bb57b4e472723d5c6107e873e5b4738))
* **presensi:** implement single-scan for siswa and cooldown slider 2-scan masuk-pulang for gtk ([447b732](https://github.com/Muhipo-Dev/simasmuh/commit/447b7324afd4c36287cb19032eb9b3647564e805))
* **presensi:** optimize voice greeting speed 1.35x and faster auto-clear for high throughput scanning ([6eaf903](https://github.com/Muhipo-Dev/simasmuh/commit/6eaf9038c30e9dc56fb708955dc7684f46b41122))
* **profile:** sinkronisasi nama & avatar profil di navbar secara real-time tanpa perlu logout ([befb69f](https://github.com/Muhipo-Dev/simasmuh/commit/befb69fc57c38785ed30b380d53fdc1ee3e7735d))
* redesign aligned glassmorphic login layout and separate helpdesk vs notification phone settings ([82dffb0](https://github.com/Muhipo-Dev/simasmuh/commit/82dffb0fd09f71d71b979b2db6fb6c57ec4be059))
* redesign login page and unify layout components (AppNavbar, AppFooter, AppSidebar) ([68cf2df](https://github.com/Muhipo-Dev/simasmuh/commit/68cf2df9a9031e21b1832328f37a61787c4fdc87))
* release v1.9.4 - extracurricular management, student user auto-sync, persistent waiting room, finance income UI & user notifications ([2d27204](https://github.com/Muhipo-Dev/simasmuh/commit/2d2720480ed78c2aee721e7e87087725c6fa8056))
* restore agenda, news, and announcement data with event dates ([1659ab3](https://github.com/Muhipo-Dev/simasmuh/commit/1659ab3709cd9ef7e9691abe512e114c08685536))
* restore announcements, news, & information data ([04cf5ce](https://github.com/Muhipo-Dev/simasmuh/commit/04cf5ceaa67ed8175dc047c74a85b4c20ecb8357))
* restore superadmin nailar, manchu, guru, agung accounts and sync complete 33 classes, labeling, finance data ([1a9f2f3](https://github.com/Muhipo-Dev/simasmuh/commit/1a9f2f312d0193730f18b4663a3ef949bccbc718))
* **sdm:** integrasi sinkronisasi kepegawaian sdm dengan manajemen akun, fitur status aktif nonaktif dan penyimpanan berkas dokumen 20mb ([451eb3a](https://github.com/Muhipo-Dev/simasmuh/commit/451eb3af1e1bf7fface566e7ad62414f21e2c086))
* **security & attendance:** implement full RLS protection, leave/permission workflow, TU admin navigation, and update changelog ([e8d7a92](https://github.com/Muhipo-Dev/simasmuh/commit/e8d7a92c4e667f5e181a2e83c693d94ab67cc8cd))
* **security-scalability:** implement waiting room virtual queue, enhanced security, and test fixes ([f065ecd](https://github.com/Muhipo-Dev/simasmuh/commit/f065ecde83e8fa79a8471299a4756d9f092bfed9))
* **security:** enhance core security guards, SQL injection sanitization, and adaptive rate limiting ([7dfc7a5](https://github.com/Muhipo-Dev/simasmuh/commit/7dfc7a5e8ba6674dd676c41874601b1927117c80))
* **settings:** add Master Background Wallpaper upload and sync across login, home and dashboard ([0307e7c](https://github.com/Muhipo-Dev/simasmuh/commit/0307e7c31bfb6ec5929fb85866ad8fa890fe1d40))
* **settings:** enable editing timezone and server location with real-time web endpoint latency monitoring ([9244280](https://github.com/Muhipo-Dev/simasmuh/commit/92442801a80484dba0505cdefb6d3f30c4f4fa17))
* sinkronisasi otomatis diskon default siswa ke tagihan keuangan ([8b8f02d](https://github.com/Muhipo-Dev/simasmuh/commit/8b8f02db4cbb1c7145368fd58d902f698267ba11))
* **siswa:** tambah fitur naik kelas massal per kelas asal atau pilihan siswa untuk superadmin dan admin IT ([c1a6553](https://github.com/Muhipo-Dev/simasmuh/commit/c1a6553cf69f522f2adf56e804d073d770683e23))
* **status:** standardisasi status aktif/nonaktif dan sinkronisasi indikator dashboard user ([74aa2b2](https://github.com/Muhipo-Dev/simasmuh/commit/74aa2b29fb3f907798a9997349021eee126f9511))
* **storage:** add all user profile photos, banners, and upload assets ([8a4c79e](https://github.com/Muhipo-Dev/simasmuh/commit/8a4c79efc129739e90378f11484add55ec64b638))
* **student-card:** optimize template layout, crop boundaries, and print calibration ([3d75c38](https://github.com/Muhipo-Dev/simasmuh/commit/3d75c380241d533a9ec3c737f7d397ac24f2996e))
* superadmin permissions, schedule management, image compression, and footer updates ([b101b17](https://github.com/Muhipo-Dev/simasmuh/commit/b101b1723fd139b3f9bc8ddc3aeb7f9a00fe6b5b))
* sync 500 student records and admin accounts with Supabase PostgreSQL database ([5d06d8c](https://github.com/Muhipo-Dev/simasmuh/commit/5d06d8c56c8fdf3bd4d23b9153790c795de0966e))
* synchronize Program & Jalur Pendaftaran, enhance parent-friendly UI, updated Excel class export, and scholarship settings ([fcddaf2](https://github.com/Muhipo-Dev/simasmuh/commit/fcddaf2791cc8c6b73211825d9582ac6454aa703))
* tambah & perbarui pilihan sub-role dan role utama beserta halaman fitur Coming Soon ([9b0efc2](https://github.com/Muhipo-Dev/simasmuh/commit/9b0efc285f9f9de4b85f5748b494e464b589e906))
* tambah fitur buku induk siswa Seksi 1-5, import excel serentak, dan sinkronisasi filter tabel ([a0dae6d](https://github.com/Muhipo-Dev/simasmuh/commit/a0dae6d0c2291e51a645a6872a668a83fe3717d5))
* tambah pengaturan program sekolah, default SPP/DPP/UKA/UKS, dan auto-fill nominal tagihan ([4016c5d](https://github.com/Muhipo-Dev/simasmuh/commit/4016c5d2cb1554c33560c4493e56ca60296cbd6b))
* tambahkan halaman error kustom, fitur QR Layar Admin TU, update dashboard & changelog ([d645d25](https://github.com/Muhipo-Dev/simasmuh/commit/d645d2568d9c5dbdb001102f1aa11eefe8e2a1a6))
* tambahkan informasi program di dashboard dan informasi diskon di keuangan, serta update README log ([447e26a](https://github.com/Muhipo-Dev/simasmuh/commit/447e26ab05b57db8dd3a408fc6bcc234010fde31))
* tambahkan relasi wali kelas di master data kelas ([d386859](https://github.com/Muhipo-Dev/simasmuh/commit/d38685933b37b15a4364acfc29dfc05dc04ae60f))
* tampilkan badge tahun ajaran tepat di bawah tulisan portal manajemen informasi di login ([75bf1fa](https://github.com/Muhipo-Dev/simasmuh/commit/75bf1fa0093c2f5f1d57620544d63be879dbf2e4))
* tampilkan informasi tahun ajaran aktif pada login dan seluruh navbar ([d817d7a](https://github.com/Muhipo-Dev/simasmuh/commit/d817d7a9874805e825c89d8293097266b08cd56e))
* tetapkan akun dev mutlak (nailar, ervina, safri, manchu, 123) dan amankan inkremental seeding ([3376d45](https://github.com/Muhipo-Dev/simasmuh/commit/3376d4528202e842dbd2373b66593d63bb2ecf8c))
* transfer scholarship allocation controls to Keuangan section and sync table display ([e2176df](https://github.com/Muhipo-Dev/simasmuh/commit/e2176dfaf4d1868267db40982254ec4b74fda080))
* **tu:** bersihkan istilah BAU dan optimasi display cetak QR buku tamu A6 meja pimpinan ([43eb89d](https://github.com/Muhipo-Dev/simasmuh/commit/43eb89d35868de27f6502d214a5ef3416302c2c5))
* ubah informasi program siswa menjadi wali kelas pada dashboard ([6d3a0a3](https://github.com/Muhipo-Dev/simasmuh/commit/6d3a0a308f8d5b2b2f02ae55800f9aa5f9f10180))
* **ui:** add smooth stagger and interactive hover animations to Program Unggulan section ([4a9a9f3](https://github.com/Muhipo-Dev/simasmuh/commit/4a9a9f34ecfa0153ccc99e0690680684f87cfe12))
* **ui:** optimize compact layout, responsive design, and touch support across system ([c53dbe0](https://github.com/Muhipo-Dev/simasmuh/commit/c53dbe0a8e2257f7fec03a61fe290b7531a334f2))
* **ui:** tampilkan badge tahun ajaran aktif di navbar dashboard & halaman login utama, serta hapus kolom tahun ajaran dari tabel kelas ([ed59588](https://github.com/Muhipo-Dev/simasmuh/commit/ed59588142e96af1c62e0a62df159462292e095d))
* unify global layout to dark translucent glassmorphism and style dashboard feature buttons ([0306d77](https://github.com/Muhipo-Dev/simasmuh/commit/0306d778d82d28b770957db61fa3e03c97567697))
* update akademik, keuangan, presensi, dashboard & pengaturan (2026-10-06) ([3f57db7](https://github.com/Muhipo-Dev/simasmuh/commit/3f57db70452c8c93815602c54bdce6c149662870))
* update logout redirect to login page & add workspace agent rules ([4b44f46](https://github.com/Muhipo-Dev/simasmuh/commit/4b44f46a04a7e880af47f92838e4cc030b19f52c))
* user session cache persistence, login history tracking, and high-contrast layout components ([7171c9f](https://github.com/Muhipo-Dev/simasmuh/commit/7171c9fe9ac7d3f65b05eebc31df3820a49c255c))
* **user:** tambahkan kolom username bebas bukan generate dari email pada manajemen akun ([cf331aa](https://github.com/Muhipo-Dev/simasmuh/commit/cf331aaeb23b20c5ba7143f62c16b00718051f6d))
* **waiting-room:** add interactive simulation trigger in profile settings and demo page ([6f62f2c](https://github.com/Muhipo-Dev/simasmuh/commit/6f62f2c853dcd8155a2b596aea4c1ce3b3889f76))

### 🐛 Perbaikan Bug

* adjust attendance log terminology for student log (school attendance only) and employee log (work hours and daily earnings) ([e9c3641](https://github.com/Muhipo-Dev/simasmuh/commit/e9c3641675e07bd6c927b0e1eb82eefa177b47d2))
* allow DMZ IP 182.253.144.111 origins and ensure reverse proxy API rewrites work seamlessly ([87a4d62](https://github.com/Muhipo-Dev/simasmuh/commit/87a4d625cb61c82a2a04e53060560f6a9a5500b1))
* **attendance:** ensure getRecentLogs automatically reconstructs historical logs from database DailyAttendance ([e056a97](https://github.com/Muhipo-Dev/simasmuh/commit/e056a97698a789b602a885cb9a852f944ed75792))
* **attendance:** perbaiki dependensi python fastapi, ultralytics yolo11, dan auth header backend ([f4e3881](https://github.com/Muhipo-Dev/simasmuh/commit/f4e3881a9c3d51fb763894466e2c04af5117b8cc))
* **attendance:** perbaiki tombol start AI microservice agar dapat auto-spawn proses python port 8005 dan perbaiki script launcher ([fa7fb25](https://github.com/Muhipo-Dev/simasmuh/commit/fa7fb252a044822d47cf2f8e2c1dbbf5a29fe9de))
* **attendance:** restore 77 historical face attendance logs and enhance multi-path logs persistence ([5b3e9c0](https://github.com/Muhipo-Dev/simasmuh/commit/5b3e9c093bf2b8075a536016bd7835101aaab3b9))
* **auth-session:** enforce session active validation in JwtStrategy, instant 401 signOut on unlinked session, and prevent duplicate session creation on login page ([cbb572c](https://github.com/Muhipo-Dev/simasmuh/commit/cbb572c537156d5c6fdd6ed9393dcc884d80070e))
* **auth:** enhance login/logout dynamic redirects, unlink session audit logs, and accurate tunnel/proxy client IP detection ([f18ba61](https://github.com/Muhipo-Dev/simasmuh/commit/f18ba61ac87c3bf93d6aaaa36ace867c390148e8))
* **auth:** invalidate NextAuth session callback on unlinked token and auto-purge browser cookie on login redirection ([00ef00b](https://github.com/Muhipo-Dev/simasmuh/commit/00ef00b0d1b879014befabeefb893f4d20fa6130))
* **backend:** resolve duplicate enum member values in UserRole and SubRole, standardize TU to ADMIN_TU ([80e88ae](https://github.com/Muhipo-Dev/simasmuh/commit/80e88ae26aea574ab22c969ab00c89d4bf642c15))
* **banner:** hubungkan carousel utama dengan data upload banner dari Manajemen Banner Admin Web ([7176c36](https://github.com/Muhipo-Dev/simasmuh/commit/7176c36387ec56eb8012ee1c174a5cd5593bf966))
* **branding:** replace favicon with official school logo and set title to System by. Muhipo Dev ([853fdcc](https://github.com/Muhipo-Dev/simasmuh/commit/853fdccba9054f98dda5129a9c204ea603de7855))
* **branding:** update title bar to SIMASMUH and set favicon to official school/app logo ([42ac1e0](https://github.com/Muhipo-Dev/simasmuh/commit/42ac1e06ad9cd5e2f4111ddc32d2a8c326eb72b4))
* **camera-ui:** remove duplicate Nyalakan AI button in purple stat card ([36c229a](https://github.com/Muhipo-Dev/simasmuh/commit/36c229af47349e9d54eee9ca2c55205aa37ae576))
* **camera:** optimize bounding box stabilizer, eliminate webcam flicker and ghost detection ([ec167d3](https://github.com/Muhipo-Dev/simasmuh/commit/ec167d3d7373ec130743163f454f7f0dc30f7ee5))
* **camera:** sinkronisasi konfigurasi webcam browser, webcam usb server dan sensitivitas threshold presensi ([dd90e3e](https://github.com/Muhipo-Dev/simasmuh/commit/dd90e3e3d2fb177a283f247309017e58cb9220a0))
* **camera:** stabilize face bounding box tracking, eliminate opacity blinking and flicker ([c7ab3ce](https://github.com/Muhipo-Dev/simasmuh/commit/c7ab3ceac6cf8b5b9b746989c88417e3a03aefd1))
* **camera:** tambahkan definisi fungsi maskStreamUrl pada dashboard presensi camera ([4d67c5f](https://github.com/Muhipo-Dev/simasmuh/commit/4d67c5fea58d164411793ef613940a2b75d8a104))
* **carousel:** ubah indikator slider menjadi bintik bulat presisi dan kecualikan dari min-height mobile ([30fdb86](https://github.com/Muhipo-Dev/simasmuh/commit/30fdb86fcac415c808a183383f8a1c71eee2e3ad))
* cegah TypeError trim() pada data email/username pengguna yang bernilai null ([64c58b8](https://github.com/Muhipo-Dev/simasmuh/commit/64c58b8ac101782dbd5f49399eb4064d51dbc179))
* change staleTime to 0 to show latest data on dashboard ([32ddc1b](https://github.com/Muhipo-Dev/simasmuh/commit/32ddc1bc8213c2df785a96522a207be7a993bb38))
* **copywriting:** standarisasi penamaan istilah madrasah menjadi sekolah di seluruh antarmuka dan modul ([fec74bf](https://github.com/Muhipo-Dev/simasmuh/commit/fec74bfb47a6a8e156d8a77e9dc1204b8ba16f98))
* **dashboard:** perbaiki type annotations pada generator kurva analitik komprehensif ([7bdf174](https://github.com/Muhipo-Dev/simasmuh/commit/7bdf174885fc98ad5afea0df3a414ecc666162c1))
* deteksi dinamis IP lokal dan publik pada next.config.ts serta update README log ([39f788e](https://github.com/Muhipo-Dev/simasmuh/commit/39f788e3c50cf2840c9734e33e295e8e111a2c96))
* **face-attendance:** fix check-in and check-out (MASUK & PULANG) cooldown logic with exact seconds precision and dynamic config sync ([c031463](https://github.com/Muhipo-Dev/simasmuh/commit/c031463fb945a6c315e32226cd7e47e1954e0098))
* **face-attendance:** fix engine errors and implement realtime bounding box overlay ([57fce30](https://github.com/Muhipo-Dev/simasmuh/commit/57fce30f2f3dfbe33f714f4eda71e89aa55ef2b6))
* **face-attendance:** improve multi-source camera switching, ultra-lightweight YOLO inference, and responsive multi-device layout ([a92e625](https://github.com/Muhipo-Dev/simasmuh/commit/a92e625e350662d1b4a2e8a6e944e1728d60be70))
* **face-attendance:** optimize CPU eco mode, bounding box accuracy, guest detection, camera FPS/resolution, and modern UI ([41f94df](https://github.com/Muhipo-Dev/simasmuh/commit/41f94dfb4b4be5d2e36b58d6945f8844118270b4))
* **face-attendance:** optimize FaceNet MTCNN detection, camera resolution & bounding box HUD ([b39ed27](https://github.com/Muhipo-Dev/simasmuh/commit/b39ed27ba29aa81fca391502bbaae9e286059c6e))
* **face-attendance:** restore real-time bounding box in all modes, restore historical logs, and scope log clearing to today only ([a40981e](https://github.com/Muhipo-Dev/simasmuh/commit/a40981e718f45744c168a48b5704c1609956b884))
* **facenetai:** direct clean link to /login without callback param ([c96cc2b](https://github.com/Muhipo-Dev/simasmuh/commit/c96cc2bc746d787508e0b6ac1a082677960fd9a7))
* **facenetai:** replace navbar left icon with official school logo and remove excessive blinking animations ([5cae2fd](https://github.com/Muhipo-Dev/simasmuh/commit/5cae2fdb31b16c954d6314a4844bad4b22058a73))
* **facenet:** penyempurnaan diksi tata letak dan voice greeting presensi ai ([e237721](https://github.com/Muhipo-Dev/simasmuh/commit/e23772158ade89ab5cd6bdb28034ba84632ed6f4))
* **finance:** add explicit type assertions for Prisma relations in payment proofs service ([31d3571](https://github.com/Muhipo-Dev/simasmuh/commit/31d35714bc1169c02914d22c6133ee66dfa1da2b))
* **finance:** ensure full type compatibility and zero IDE linter warnings in finance service ([fb2f3a9](https://github.com/Muhipo-Dev/simasmuh/commit/fb2f3a9f62428dd9ae9396b416c45c289f08934d))
* **finance:** fix middle summary card text wrapping/stacking and refine angsuran badge logic for partial payments ([712ff52](https://github.com/Muhipo-Dev/simasmuh/commit/712ff52a6f0ad5cbfaba05200e43cd0dd29552ac))
* **finance:** fix popup dialog vertical layout with shrink-0 fixed header, flex-1 body scroll, and sticky footer for perfect responsiveness on all devices ([ee3fb2b](https://github.com/Muhipo-Dev/simasmuh/commit/ee3fb2b93da3c150510471785ca6bad7a9a5efbb))
* **finance:** synchronize student tagihan queries to include ANGSURAN status and invalidate cache on proof verification ([934fc77](https://github.com/Muhipo-Dev/simasmuh/commit/934fc77ec5f12c76ff2c53ebb5464cda8db5a532))
* force class name display instead of raw UUID across all class filter placeholders ([3648426](https://github.com/Muhipo-Dev/simasmuh/commit/3648426ce3d74129e6851f01d033586d1d45add5))
* **frontend:** add missing Database and Lock icon imports in FileExplorerManagement ([9ea3150](https://github.com/Muhipo-Dev/simasmuh/commit/9ea31508c5ed3ad9bca75d7d29b60ef7ec8a3781))
* **frontend:** resolve currentConfig scope error in camera & facenetai and update AGENTS rule ([6255470](https://github.com/Muhipo-Dev/simasmuh/commit/62554708f3aa2c455f75e44fbe12386216f93381))
* gunakan student.discountPercentage dari DB dan cegah override 100% hardcode program kader ([8250750](https://github.com/Muhipo-Dev/simasmuh/commit/8250750d7840d4b41b23bd63c2c0a576c57d1029))
* hapus modifier export dari konstanta internal agar mematuhi aturan Next.js App Router entry export ([8868359](https://github.com/Muhipo-Dev/simasmuh/commit/8868359ab3dcf820f83fa19c4774f4e4a02c0beb))
* hapus role utama dan sub-role BAU, pertahankan ADMIN_TU ([54a8aa2](https://github.com/Muhipo-Dev/simasmuh/commit/54a8aa2e16526f719a011f3059d945b8403653bc))
* **kelas:** kunci input tahun ajaran agar selalu mengambil dari pengaturan sistem global ([0a99419](https://github.com/Muhipo-Dev/simasmuh/commit/0a99419397f113a5a03f15cbcd1f2e868977e27f))
* **kepala-sekolah:** sembunyikan semua tombol aksi modifikasi CRUD di seluruh halaman mode supervisi (pengumuman, jadwal, guru, siswa, kelas) ([18efb87](https://github.com/Muhipo-Dev/simasmuh/commit/18efb878feed0dd382052e33a166fb6e5d5472ff))
* **kesiswaan:** fix role access for supervisi, separate kesiswaan supervisi izin dispensasi module ([62d58e8](https://github.com/Muhipo-Dev/simasmuh/commit/62d58e8e516c5b7d70d66613943e44e2158eaac6))
* **launcher:** rapikan rendering status layanan di simasmuh.ps1 ([446bfdb](https://github.com/Muhipo-Dev/simasmuh/commit/446bfdb01511ab84478c4b25c6b02fb5540af25d))
* **login:** gunakan getPublicApiUrl dan matikan cache agar badge Tahun Ajaran di halaman login selalu 100% real-time dari database ([a0d1dd3](https://github.com/Muhipo-Dev/simasmuh/commit/a0d1dd35aec1209aa2a3d34773e0832a73025e9d))
* **mobile:** perbaiki kontras kartu statistik dan posisi dots carousel pada tampilan mobile ([6d1ed0f](https://github.com/Muhipo-Dev/simasmuh/commit/6d1ed0f61ace5799400500a13002b4cd3905ac31))
* **mobile:** pisahkan posisi dots carousel dan kartu statistik agar 100% tidak bertabrakan ([cabb41d](https://github.com/Muhipo-Dev/simasmuh/commit/cabb41d9938984b070a2e0f461f136e1ee9ed3f9))
* mount Beasiswa Dialog inside Keuangan Pemasukan page to handle open-beasiswa-dialog event ([41eb859](https://github.com/Muhipo-Dev/simasmuh/commit/41eb8598c753c1157ca374388ed7261a5d2f2f54))
* nextauth handler compatibility and enhance login session info with device, datetime and location ([1180e87](https://github.com/Muhipo-Dev/simasmuh/commit/1180e87319c11ca9da15eb8ed53619ec2862323c))
* overhaul dark mode card headers, descriptions, and table contrast for high legibility ([64ce629](https://github.com/Muhipo-Dev/simasmuh/commit/64ce629ab461fa69cea2b0b935cfab7a92fe5e37))
* **presensi:** exclude BELUM_BISA_PULANG from scanner logs and system logs, keeping only valid MASUK and PULANG for finance allowances ([24dbc50](https://github.com/Muhipo-Dev/simasmuh/commit/24dbc50ab51b6ef0c5a2dd041313a50d74816f41))
* **presensi:** fix gtk pulang attendance logic, backend scanType propagation, and manual scan force bypass ([a3c1acd](https://github.com/Muhipo-Dev/simasmuh/commit/a3c1acda4725f52f964cd4f2de6f9b832ce5265d))
* **presensi:** samakan alur absen masuk dan pulang siswa dengan guru/karyawan serta matikan kamera pasca scan ([56bf91a](https://github.com/Muhipo-Dev/simasmuh/commit/56bf91a54ca7bbb926d297617428835f29c1cf29))
* query dynamic active academic year setting when auto-creating classes during schedule import ([593fd72](https://github.com/Muhipo-Dev/simasmuh/commit/593fd722150f5aed2f960e27d6119f482009b86e))
* remove checkOut (jam pulang) column from student attendance log to strictly show entry checkIn only ([0f1e97d](https://github.com/Muhipo-Dev/simasmuh/commit/0f1e97d065b2bab40da1916ef7b9bc525303ab40))
* resolve all frontend IDE errors in Keuangan Pemasukan page ([ffa7195](https://github.com/Muhipo-Dev/simasmuh/commit/ffa719570c25eedf6440ae421cafc836c674e7ef))
* resolve homeroomTeacher user property NestJS backend compilation error ([c16041e](https://github.com/Muhipo-Dev/simasmuh/commit/c16041e1e26a41a19d7b0eb8c4871250fb979ff9))
* resolve HTML button DOM nesting console error by using render props on triggers ([f1336b4](https://github.com/Muhipo-Dev/simasmuh/commit/f1336b4d275e67a30748f497933c9d6be6a8b353))
* resolve item.beasiswaSeragamPct undefined type error and confirm strict finance role access for scholarships ([26ec81c](https://github.com/Muhipo-Dev/simasmuh/commit/26ec81c6aba74cfd8589cc36331c60133fb01b6a))
* resolve parallel route conflict by removing (dashboard)/spmb, separate public /spmb and superadmin /master-data/spmb ([0b67539](https://github.com/Muhipo-Dev/simasmuh/commit/0b675398b1c444519b52589443ec169ca114c7f0))
* resolve raw UUID display in Penempatan Kelas dropdown ([ac54dfc](https://github.com/Muhipo-Dev/simasmuh/commit/ac54dfcc5d5ff2305927006cd80735c8164d7875))
* resolve s.beasiswaSeragamPct undefined type error ([91fb463](https://github.com/Muhipo-Dev/simasmuh/commit/91fb463ef8e480f374623bf6f3f57ea2c360d1b2))
* resolve UUID fallback display in class dropdown components ([3344979](https://github.com/Muhipo-Dev/simasmuh/commit/33449799f25d8a212b277120dfc4a04782b72044))
* **responsive:** atur kerapian nominal rupiah dan ringkasan keuangan siswa di tampilan mobile ([019e51a](https://github.com/Muhipo-Dev/simasmuh/commit/019e51ac38145f383179d3db6865ea3be086dd7f))
* **responsive:** eliminate navbar collisions and optimize mobile tablet layout ergonomics ([f93659d](https://github.com/Muhipo-Dev/simasmuh/commit/f93659db12d181211851cbafd332341a7dc4e488))
* **responsive:** refine navbar ergonomics and prevent element collision on zoom and tablet viewports ([dea7c58](https://github.com/Muhipo-Dev/simasmuh/commit/dea7c58ba3956f3e2041a1298040df873743363f))
* **schedule:** isolate print to pdf for schedule across all user modules ([8400546](https://github.com/Muhipo-Dev/simasmuh/commit/8400546178d1d55db25e7ab701f6627be9feb775))
* **schedules:** resolve regex unnecessary escape character in normalization ([cc9bf43](https://github.com/Muhipo-Dev/simasmuh/commit/cc9bf43aed290cb2e10b94dd3ef7c8b1238b340f))
* selaraskan tipe defaultDpp, defaultUka, defaultUks pada seed-supabase.ts ([540583c](https://github.com/Muhipo-Dev/simasmuh/commit/540583c4d79ac09056ca8ce3ce165d87312d0060))
* sinkronisasi data default sekolah, bank, dan biaya tagihan di Supabase ([86367e2](https://github.com/Muhipo-Dev/simasmuh/commit/86367e2009a651d78fdc7b73d7828f4af0fb6874))
* sinkronkan diskon default superadmin pada getStudentTagihan dan rapikan tampilan badge diskon di keuangan ([48c1a42](https://github.com/Muhipo-Dev/simasmuh/commit/48c1a423e08f9674a2891f50d10b3895cf9ccce7))
* **student-card:** ensure live SVG QR code is injected directly into print frame ([769707b](https://github.com/Muhipo-Dev/simasmuh/commit/769707b4000f8a24c509de265be3e8cd5407037d))
* **student-card:** precisely lock NISN horizontal alignment next to NISN label ([eed86cc](https://github.com/Muhipo-Dev/simasmuh/commit/eed86ccfa17c7b58c0019208e59f708c5d12192a))
* **student-card:** refine photo corner radius to seamlessly align with template frame ([2ede77b](https://github.com/Muhipo-Dev/simasmuh/commit/2ede77b8536f06ad482e233814c4b489f0e8d754))
* **student-card:** separate student name and NISN coordinates to prevent text overlap ([7a88cb7](https://github.com/Muhipo-Dev/simasmuh/commit/7a88cb743c63fc89370bd3f9c7869355398df454))
* synchronize news, information, and agenda target filter for public pages and user dashboard ([3f55eac](https://github.com/Muhipo-Dev/simasmuh/commit/3f55eac874f10c542d3df13944f5ef2bb8aabace))
* **sync:** pastikan cache system-settings di-invalidate & di-refetch secara instan saat superadmin memperbarui tahun ajaran ([7dba163](https://github.com/Muhipo-Dev/simasmuh/commit/7dba1636a6c04ccf7bb8a4328c4e79df2ede2141))
* tambahkan type assertion pada objek default Setting di settings.service.ts ([d6becc4](https://github.com/Muhipo-Dev/simasmuh/commit/d6becc4bc902f61bbd904f9736b73519b119885e))
* **tts:** normalisasi pelafalan voice greeting kata kapital menjadi kata utuh ([950cef6](https://github.com/Muhipo-Dev/simasmuh/commit/950cef632beafb2780f970360e0cead54a6177e1))
* **tts:** perpendek diksi wajah tak dikenal dan normalkan tempo pembacaan suara ([723bc1c](https://github.com/Muhipo-Dev/simasmuh/commit/723bc1cf1cecaf5d016dd609bfe84cd1bceba206))
* **tts:** revisi greeting NO_FACE menjadi Wajah tidak terdeteksi. ([c96615e](https://github.com/Muhipo-Dev/simasmuh/commit/c96615e9a72492d581e5b6858d754d6743912451))
* **tts:** update kata unregistered dan percepat rate suara ke 1.2x ([085acb2](https://github.com/Muhipo-Dev/simasmuh/commit/085acb276066788b25b4d608d0cfdd5a843ff6e5))
* **types:** declare spring transition as const in ProgramUnggulanSection ([ebb6d87](https://github.com/Muhipo-Dev/simasmuh/commit/ebb6d870328976e21ad6551100f1c7415cf6cced))
* **types:** resolve backgroundUrl type check and clarify Superadmin & Admin role access on settings page ([921e326](https://github.com/Muhipo-Dev/simasmuh/commit/921e326a3e28ef7ec3dadb967c21186a4a95e5bf))
* **types:** resolve DropdownMenuItem asChild type error in PublicNavbar ([f24cf00](https://github.com/Muhipo-Dev/simasmuh/commit/f24cf00dd414750ee01e59763b3992840488a228))
* **types:** resolve systemSettings type definition, add Metadata type to page.tsx, and format README ([8587f3a](https://github.com/Muhipo-Dev/simasmuh/commit/8587f3a6d4e90b9ecd6924a2e61c9449bfb47769))
* **types:** selesaikan seluruh implicit any type annotations pada svg map and trailing newline di readme ([3cd9f68](https://github.com/Muhipo-Dev/simasmuh/commit/3cd9f682fe9c709957b0bae9485a5d80b67a5635))
* **ui:** harmonize greeting voice and feedback banner for PULANG, MASUK, and SUDAH_LENGKAP states ([ac2eab4](https://github.com/Muhipo-Dev/simasmuh/commit/ac2eab4ee341852d3076a5da178e69b1801d05be))
* **users:** sesuaikan tipe nested teacherProfile create pada users service dan verifikasi build ([f708dfb](https://github.com/Muhipo-Dev/simasmuh/commit/f708dfb9052655cf1749a93afc3b2e174da4b9d1))
* **webcam:** eliminate video decoder restart and ref detach flickering ([8726c61](https://github.com/Muhipo-Dev/simasmuh/commit/8726c619603707188f0bb53a4ad710bdaf015294))
* **websocket:** izinkan origin dinamis untuk koneksi websocket presensi & notifikasi ([81c2be3](https://github.com/Muhipo-Dev/simasmuh/commit/81c2be320951911e381a92524a294fa962e0b773))

### ⚡ Peningkatan Performa

* optimize database connection pooling, backend memory cache, and client query caching ([62b560a](https://github.com/Muhipo-Dev/simasmuh/commit/62b560acf159520939ccf2ca88239316b2cd6fdb))

### ♻️ Refaktorisasi Kode

* **auth:** refine user credentials copywriting and remove unlink term ([614d0ac](https://github.com/Muhipo-Dev/simasmuh/commit/614d0acbc267acd00884bfcb85f1534da94bc391))
* **bau:** sinkronisasi role BAU (Badan Administrasi Umum) & batasi akses manajemen akun dan keuangan ([f434bca](https://github.com/Muhipo-Dev/simasmuh/commit/f434bcaf8e596d8eb3de64bfb85646c39f7ac171))
* **copywriting:** penyesuaian judul dan narasi dasbor eksekutif kepala sekolah serta informasi periode data 2026 ([fca2115](https://github.com/Muhipo-Dev/simasmuh/commit/fca211516fd6767da660a4c9e61d01a200602813))
* **dashboard:** adjust quick access cards to squarish box format in 4-column grid ([fa88a90](https://github.com/Muhipo-Dev/simasmuh/commit/fa88a909a9061f325577ee0f855cef10d16e746a))
* **dashboard:** balance 3-area layout columns symmetrically (left 3, center 6, right 3) ([ea77fe6](https://github.com/Muhipo-Dev/simasmuh/commit/ea77fe6882b9e92c73c3ab153c6b01b1df6cb144))
* **dashboard:** pemindahan menu akses cepat kepala sekolah ke bagian paling bawah khusus supervisi log-view ([658cfad](https://github.com/Muhipo-Dev/simasmuh/commit/658cfad35801c7f084bf4815dd225e3d47ec1342))
* **dashboard:** penataan layout dashboard kepala sekolah (kurva tren di baris 2 dan demografis di bawah aktivitas pembelajaran) ([d808936](https://github.com/Muhipo-Dev/simasmuh/commit/d8089364cd5583d893e33cc9d4c0fbc633f2f6c4))
* **dashboard:** simplify quick access category titles to Layanan and Aktivitas ([57299f4](https://github.com/Muhipo-Dev/simasmuh/commit/57299f4b70960ae93989e174387637dc956f7f8c))
* **facenetai:** ringkas informasi algoritma AI dan pindahkan ke bagian bawah halaman ([67fc333](https://github.com/Muhipo-Dev/simasmuh/commit/67fc333dddabe92a097df1632d035a79d7ab74bc))
* **finance:** align UKS (Uang Kegiatan Siswa), UKA (Uang Kegiatan Akademik), and DPP (Dana Pengembangan Akademik) ([ca5162a](https://github.com/Muhipo-Dev/simasmuh/commit/ca5162a6b5bd169e709aca7da2c22f1afbc50c71))
* **frontend:** clean up error routes, optimize executive dashboard & academic journals ([e731a14](https://github.com/Muhipo-Dev/simasmuh/commit/e731a1451815c2bba6d7c1275e8814c1e8e9a972))
* implementasi kredensial default untuk user (username NIS/NIP) sesuai panduan SIMASMUH_GUIDELINES.md ([f9487d0](https://github.com/Muhipo-Dev/simasmuh/commit/f9487d0ee2c5650d609b49732dc6b4e0180b404f))
* **nav:** eliminate duplicate izin modules and clarify Ketertiban vs Wali Kelas navigation ([919db3e](https://github.com/Muhipo-Dev/simasmuh/commit/919db3e56f138e7ab825bc11dfccc798e75a3069))
* penyesuaian layout dashboard siswa, navbar desktop/mobile, alert tagihan, dan sinkronisasi jatuh tempo ([359cb17](https://github.com/Muhipo-Dev/simasmuh/commit/359cb17857f916dd447a46ef2821451fb5254234))
* **presensi:** rename presensi-pegawai route to presensi-view ([1089cab](https://github.com/Muhipo-Dev/simasmuh/commit/1089cab6db3fcf0ad890f4823e08a649fc31910d))
* remove profile & logout buttons from sidebar so sidebar contains only role feature links ([0c9c776](https://github.com/Muhipo-Dev/simasmuh/commit/0c9c7769a191285a81003086ba356d213a3eef83))
* remove SPMB and PPDB modules, update SIMASMUH guidelines & README ([8b8763f](https://github.com/Muhipo-Dev/simasmuh/commit/8b8763f6f10e03c68b0373c3e9ee1d9c7eb83d2f))
* restrict scholarship allocation strictly to finance module inside Kelola modal ([b941714](https://github.com/Muhipo-Dev/simasmuh/commit/b941714ebd02cd07107ed469ff4c8b5a753f2f65))
* restrukturisasi arsitektur folder frontend dan backend ke modul domain ([1b698e3](https://github.com/Muhipo-Dev/simasmuh/commit/1b698e3e4c44b2234e7e98ad8c77ef0005b2890e))
* simplify wording in disposisi alert banner ([2b6c29b](https://github.com/Muhipo-Dev/simasmuh/commit/2b6c29b7603a1f3101a30ae1e36e01d41d75f11d))
* **ui:** optimize dashboard calendar, quick access grouping, and compact finance table ([e672d28](https://github.com/Muhipo-Dev/simasmuh/commit/e672d280472d2b3d1f735ff9e3b5a4b31ec1fffc))

### 📚 Dokumentasi

* **changelog:** add Tata Usaha (Persuratan, Kepegawaian, Inventaris) and E-Sign features to 24 august 2026 release notes ([340fdec](https://github.com/Muhipo-Dev/simasmuh/commit/340fdec5af662a71deef3a288cf291449a0267fb))
* **changelog:** update README.md changelog for 2026-08-27 release ([ec6771c](https://github.com/Muhipo-Dev/simasmuh/commit/ec6771c436f77b79f65128fccfe6c6fa9cc41062))
* perbarui panduan SIMASMUH mengenai single login dan fitur UI coming soon ([f676d64](https://github.com/Muhipo-Dev/simasmuh/commit/f676d64f39f32d40240f7e91155529a2baa52e0c))
* perbarui SIMASMUH_GUIDELINES.md & README.md dengan ketentuan akun dev mutlak & aturan proteksi basis data non-destruktif ([254f219](https://github.com/Muhipo-Dev/simasmuh/commit/254f219efe66b43abad7ffa7a4fd4313449abff8))
* **readme:** polish and finalize v1.3.2 changelog updates ([ec7f878](https://github.com/Muhipo-Dev/simasmuh/commit/ec7f8789a546d357ebc141effccb1a82aa458ceb))
* **readme:** update changelog for 2026-08-20 v1.5.0 release ([d8a594e](https://github.com/Muhipo-Dev/simasmuh/commit/d8a594e96eac65e1c1dff0aa475eefa35c668140))
* **readme:** update tech stack and comprehensive application description ([6e84b03](https://github.com/Muhipo-Dev/simasmuh/commit/6e84b03553258df1d1ed8e312e25ed102067b971))
* streamline README.md focusing on overview, detailed tech stack architecture, and changelog ([3b2c4ad](https://github.com/Muhipo-Dev/simasmuh/commit/3b2c4adac862285b9342b0d94b9bf3617b082d90))
* tambahkan aturan mutlak mengenai konsistensi autentikasi frontend, backend, dan supabase ([3903c57](https://github.com/Muhipo-Dev/simasmuh/commit/3903c5755c5a104a5562fac76b8783e437f25d70))
* tambahkan pedoman default username dan password untuk siswa dan pegawai ([b5b3eb5](https://github.com/Muhipo-Dev/simasmuh/commit/b5b3eb5ed4cc7c094753a10c0aaa8a866bed18e4))
* update all YOLO references to FaceNet and update changelog ([e608a2f](https://github.com/Muhipo-Dev/simasmuh/commit/e608a2fd82d68fcd652e9fb649e82b2237400280))
* update Change Log di README.md dan hapus CHANGELOG.md ([93a40e1](https://github.com/Muhipo-Dev/simasmuh/commit/93a40e1948a2178ed537036eba4a4a9af1b9874d))
* update README.md with v1.3.2 changelog ([5a5b184](https://github.com/Muhipo-Dev/simasmuh/commit/5a5b1846e1ae645d86e97c1d754af9ca33ddc2af))

### 💄 Penyesuaian Gaya & Tampilan

* add muhipo-log.jpg background image to all dashboard pages centrally in layout ([95411bc](https://github.com/Muhipo-Dev/simasmuh/commit/95411bcae1b3197d18efe17476aa06c28da612d7))
* add muhipo-log.jpg background image to berita page ([2da3a30](https://github.com/Muhipo-Dev/simasmuh/commit/2da3a30b22758be50125ce390df56c46b96a7541))
* add muhipo-log.jpg background image to presensi-pegawai page ([944e1b1](https://github.com/Muhipo-Dev/simasmuh/commit/944e1b14210fb5e3772a2ec361b2ac8b173a09cf))
* **camera:** polish layout, symmetrical presets bar, and stats hierarchy ([ea0ab5f](https://github.com/Muhipo-Dev/simasmuh/commit/ea0ab5f9e4d8ed2e75ceb58a782d76d150edf89b))
* center login card downward with colored translucent icons and refined glassmorphic accents ([ad29229](https://github.com/Muhipo-Dev/simasmuh/commit/ad29229c8810f798b5e6f6daf73a41e57649dcb1))
* consolidate label and program management into Kelola action in Master Data Siswa ([13f7d7b](https://github.com/Muhipo-Dev/simasmuh/commit/13f7d7bb70ce00f534035e03919913a8f3dfa4ed))
* **dashboard:** optimasi proporsi tinggi kurva analitik SVG (tidak gepeng) dan standarisasi istilah 'keuangan keseluruhan' ([e1feeb1](https://github.com/Muhipo-Dev/simasmuh/commit/e1feeb1e3b292e8e25108668485d97b337f2e041))
* **dashboard:** perbarui teks integrasi data periode TA 2026/2027 di banner kepala sekolah ([cf43dd7](https://github.com/Muhipo-Dev/simasmuh/commit/cf43dd78079c19f5f594c5485320df5d69918a62))
* **dashboard:** sederhanakan teks badge periode tahun ajaran pada header dasbor eksekutif ([e088d7b](https://github.com/Muhipo-Dev/simasmuh/commit/e088d7b35fe25c30368e0c36b832ca1efb0dc7c4))
* enhance Berita & Agenda UI layout with modern glassmorphism cards and unique images ([6acd4dc](https://github.com/Muhipo-Dev/simasmuh/commit/6acd4dc26542ef5533576885abd27e117136ef23))
* **facenetai:** streamline capture button to camera icon only ([4863463](https://github.com/Muhipo-Dev/simasmuh/commit/486346348db379a1e9f80e4b3193b871f0ea34b4))
* **finance:** enhance Finance Settings layout with modern UI, glassmorphism header, card hover effects, custom input styling, and responsive layout ([179e501](https://github.com/Muhipo-Dev/simasmuh/commit/179e5012725704f07573e9780e2c17f95eb9114d))
* **finance:** polish Tagihan modal dialog layouts with modern dark/light gradients, rounded-3xl corners, and robust mobile/desktop flex responsiveness ([8893249](https://github.com/Muhipo-Dev/simasmuh/commit/889324944dc41229f0626d8e28f5bdb28b1aa1a4))
* harmonize all dialog popups into cohesive Shadcn SIMASMUH theme ([40d6c1f](https://github.com/Muhipo-Dev/simasmuh/commit/40d6c1fdb5e39988013f5f6dc7665a63fc3dcd0c))
* **hero:** hilangkan bintik slider di desktop & mobile untuk tampilan hero yang ultra clean ([6464937](https://github.com/Muhipo-Dev/simasmuh/commit/6464937ba1f5a0fe0b85d4f360ae49e276f30f67))
* **home:** perbaiki indikator bintik carousel dan optimasi tata letak responsive mobile ([fc648e7](https://github.com/Muhipo-Dev/simasmuh/commit/fc648e7dc20265732138528342f6efe814d225c7))
* **home:** perbaiki tata letak floating card data count stats di halaman depan ([e4b74df](https://github.com/Muhipo-Dev/simasmuh/commit/e4b74dfd3721eb095257841073209f6ed72c537e))
* **home:** sempurnakan tata letak UI/UX profesional pada halaman utama ([47c5b7c](https://github.com/Muhipo-Dev/simasmuh/commit/47c5b7c61d272eeabc0cafc9b74ae71f7e587531))
* kembalikan animasi alert tagihan siswa yang menonjol dan menarik perhatian ([cb4f6aa](https://github.com/Muhipo-Dev/simasmuh/commit/cb4f6aa82e7abe11353e5cd9404c6b2ef4ccf95a))
* **landing:** make Program Unggulan and Berita/Agenda sections fully transparent with glassmorphic cards ([132f43e](https://github.com/Muhipo-Dev/simasmuh/commit/132f43e34eecf979a9a8e568bf89af2e960ee48c))
* **layout:** rapikan responsivitas header navbar & tata letak elemen pada layar mobile, tablet, dan desktop ([e698e4f](https://github.com/Muhipo-Dev/simasmuh/commit/e698e4ffd9e57038dedfb7c29946197330b3b971))
* make footer solid and non-transparent across dashboard layout and pages ([20ff05e](https://github.com/Muhipo-Dev/simasmuh/commit/20ff05e7eeb1a5966715a6b6caa86588d3c5c326))
* **navbar:** simplify login button text to Login ([dfd7294](https://github.com/Muhipo-Dev/simasmuh/commit/dfd72946acaf186e9e4d7e46909aff7c8329267e))
* optimize parent-friendly responsive UI layout for mobile and desktop screens ([390a8ab](https://github.com/Muhipo-Dev/simasmuh/commit/390a8ab338928278ea90af7484b6271e9843c7d2))
* perapihan tata letak responsif, simetri, dan penyederhanaan alert tagihan siswa ([2db5c45](https://github.com/Muhipo-Dev/simasmuh/commit/2db5c45a6d6e52c6f8396ec70d7f6bb159e61c67))
* perfect dark mode readability, text contrast, and form option legibility ([00b46b1](https://github.com/Muhipo-Dev/simasmuh/commit/00b46b17b5dd134103f95c32477d9c0a27c5d15f))
* persingkat tampilan badge diskon menjadi 'Diskon nominal%' ([9531b0b](https://github.com/Muhipo-Dev/simasmuh/commit/9531b0baf9161533956c8e05b56a4c94bb7f8c54))
* refine UI/UX design system with modern Shadcn UI aesthetics and responsive touch optimization ([0917c43](https://github.com/Muhipo-Dev/simasmuh/commit/0917c43864c64faaa84fcda8782e416b07f579a0))
* set muhipo-log.jpg as full background image for login page ([8f58988](https://github.com/Muhipo-Dev/simasmuh/commit/8f589885ddd98bba7e87b123a936661d39d2238b))
* **settings:** remove redundant finance info banner from system settings page ([c2e86db](https://github.com/Muhipo-Dev/simasmuh/commit/c2e86dbc6f12007c56ed992b4709eeb2120481ea))
* **settings:** simplify background master labels and descriptions ([5acf394](https://github.com/Muhipo-Dev/simasmuh/commit/5acf394445f786cdd9ffca90d44de070abfdb40b))
* simplify Master Data Siswa table columns per user request ([8307e85](https://github.com/Muhipo-Dev/simasmuh/commit/8307e85e28046d018758a42c32ea67b76e9ec5f6))
* simplify student tagihan table layout and move beasiswa button inside Kelola modal ([c756fb0](https://github.com/Muhipo-Dev/simasmuh/commit/c756fb04c3dae4e90377eab4d19185480a37421b))
* sisakan hanya animasi titik ping pada badge alert tagihan siswa ([00ed618](https://github.com/Muhipo-Dev/simasmuh/commit/00ed6187d29b3d6d2cb29da6fc4f441d3a854636))
* **slogan:** perbarui slogan menjadi Cerdas, Mandiri, Berprestasi, Mendunia ([6a1a473](https://github.com/Muhipo-Dev/simasmuh/commit/6a1a473db27c1a1ff6802f78c6d055b98cae17be))
* **ui:** align mobile responsive layouts, floating toolbars, and touch padding with desktop view ([f7bcf37](https://github.com/Muhipo-Dev/simasmuh/commit/f7bcf37632e37289c3048d40a2a0d748983b83a2))
* **ui:** consolidate table columns to fit 100% width cleanly with zero horizontal scrollbar ([64ae68a](https://github.com/Muhipo-Dev/simasmuh/commit/64ae68a1e8beaeac30e742149cb4d7b1a0301c3c))
* **ui:** ensure strict vertical scroll-only layout and unify card and table containers across dashboard ([75d0968](https://github.com/Muhipo-Dev/simasmuh/commit/75d096857a934f6f8fba44e0db696fd8b22b88cc))
* **ui:** modernize popup dialog designs with rich color gradients, rounded cards, and sleek typography ([17b5ba6](https://github.com/Muhipo-Dev/simasmuh/commit/17b5ba62132a50004ddab2169aa4c40488b5993d))
* **ui:** reduce global background blur intensity for sharper and clearer wallpaper visibility ([a44ec44](https://github.com/Muhipo-Dev/simasmuh/commit/a44ec44d825f6d9dbe65a7bc3fb020cb6b591e1b))
* **ui:** unify all application popup dialogs under a premium modern design system ([60d0e75](https://github.com/Muhipo-Dev/simasmuh/commit/60d0e758119d7a22361f76dde840f7fbe4975e58))
* **ui:** unify all pages with blurred school wallpaper background and smooth glassmorphism ([16ec793](https://github.com/Muhipo-Dev/simasmuh/commit/16ec79324c9a2efb95ea6b8edb67c36aa36eb6ff))

### 🔧 Pemeliharaan Sistem

* ensure .env.local and all env patterns are strictly ignored ([21915ac](https://github.com/Muhipo-Dev/simasmuh/commit/21915ac7c4f5959887e4badbc950b9ef44d8d3ed))
* ignore semua file log & untrack face-attendance-logs.json ([167d8c5](https://github.com/Muhipo-Dev/simasmuh/commit/167d8c51ef923863bffc383907c96cada8c875e1))
* include environment configs, utility scripts, docs and model weights to repository ([f5e56b7](https://github.com/Muhipo-Dev/simasmuh/commit/f5e56b7fd7e8396a412d86cc221f2d804786500a))
* remove frontend .env.local from git tracking ([c79c215](https://github.com/Muhipo-Dev/simasmuh/commit/c79c215abafe4277e836cf79650308fc2e72f4a8))
* setup project and update roles ([2898189](https://github.com/Muhipo-Dev/simasmuh/commit/2898189a6a3516c2a5174f004e4048d6f8241992))
* setup semantic-release for versioning and changelog automation ([0941c2c](https://github.com/Muhipo-Dev/simasmuh/commit/0941c2ca6cfeef208e322f01577e54cae1434f08))
* sinkronisasi dan penyelarasan path direktori simasmuh ([ce01233](https://github.com/Muhipo-Dev/simasmuh/commit/ce01233396dc143787bc53372c66d26a94cd5726))
* update workspace rules with absolute database preservation standard ([cb45c89](https://github.com/Muhipo-Dev/simasmuh/commit/cb45c89bbb8f0423b5ca2fae6db92fc1abef978f))

---

## [2026-08-21] - v1.5.3: Modul Penilaian Adab, Etika, Ibadah, Tata Tertib & Bimbingan Konseling (BK) Terintegrasi

### 🚀 Fitur Baru & Peningkatan Utama

#### 1. Sistem Penilaian Karakter, Adab & Buku Saku Digital Terintegrasi
- **Model Basis Data `CharacterAssessment`**:
  - Pencatatan terstruktur: Kategori (`ADAB_ETIKA`, `IBADAH`, `KEDISIPLINAN`, `PRESTASI_PENGHARGAAN`, `PELANGGARAN`), Tipe (`POSITIF`, `NEGATIF`, `RUTIN`, `CATATAN_KONSELING`), Delta Poin, Evaluator, Tindak Lanjut, dan Status Pembinaan.
  - Terintegrasi penuh dengan akun siswa (`Student`), akun guru penilai (`User`: Wali Kelas, Tim Tatib, Guru BK, Kesiswaan), dan relasi orang tua (`ParentStudent`).
- **Layanan Backend & Endpoint REST API (`CharacterAssessmentsModule`)**:
  - `GET /character-assessments`: Pencarian & filter multi-parameter (kategori, kelas, rentang tanggal).
  - `GET /character-assessments/dashboard-stats`: Statistik agregat harian & mingguan untuk dashboard Tatib & BK.
  - `GET /character-assessments/student/:studentId/summary`: Akumulasi skor kedisiplinan (100 Poin), predikat ibadah sholat, dan riwayat bimbingan individual siswa.
  - `POST /character-assessments`, `PUT /character-assessments/:id`, `DELETE /character-assessments/:id`.

#### 2. Standar Notifikasi Ganda (In-App Notification & WhatsApp Otomatis)
- Setiap pencatatan evaluasi karakter, pelanggaran tata tertib, atau apresiasi prestasi otomatis mengirimkan notifikasi ganda:
  - Notifikasi langsung ke akun siswa dan wali murid di aplikasi (In-App Notification).
  - Pesan resmi otomatis melalui WhatsApp Gateway ke nomor orang tua/wali murid dan siswa dengan format detail nama, NIS, kelas, kategori, poin, dan tindak lanjut pembinaan.

#### 3. Panel Interaktif Pengelolaan Tatib & BK (`InteractiveCharacterAssessmentManagement`)
- Antarmuka manajemen terintegrasi di halaman sub-role **Ketertiban** (`/fitur/ketertiban`) dan **BK/BP** (`/fitur/bk-bp`):
  - Kartu ringkasan total pelanggaran, prestasi teladan, amalan ibadah sholat, dan sesi konseling BK.
  - Filter pencarian cepat, seleksi kelas, dialog input evaluasi dengan preset poin otomatis, serta fitur ekspor laporan ke format Excel (`.xlsx`).

#### 4. Integrasi Dashboard Siswa, Wali Murid & Eksekutif Kepala Sekolah
- **Dashboard Siswa & Wali Murid**: Kartu Buku Saku Adab & Tatib di Dashboard Utama dan Halaman Rinci (`/akademik/etika-tatib`) menampilkan skor kedisiplinan live, predikat ibadah, catatan wali kelas, dan daftar riwayat pembinaan secara realtime.
- **Dashboard Eksekutif Kepala Sekolah**: Penambahan tab filter **Adab & Tata Tertib** serta metrik monitoring pelanggaran, prestasi teladan, ibadah sholat, dan total evaluasi karakter terintegrasi pada overview eksekutif.

---

## [2026-08-21] - v1.5.2: Server Time Synchronization (UTC+7 / Asia/Jakarta) & Supabase Log Decommissioning

### 🚀 Fitur Baru & Peningkatan Utama

#### 1. Algoritma Sinkronisasi Tanggal & Waktu Terpusat (UTC+7 / Asia/Jakarta / Bangkok)
- **NodeJS Global TZ Init**: Inisialisasi zona waktu proses backend ke `Asia/Jakarta` (`process.env.TZ = 'Asia/Jakarta'`) di `main.ts` sebelum bootstrap aplikasi.
- **Backend Timezone Utility (`timezone.util.ts`)**:
  - `getNowUtc7()`, `getTimeStringUtc7()`, `getDateStringUtc7()`, `getStartOfDayUtc7()`, `getEndOfDayUtc7()`.
  - Format terstandarisasi Bahasa Indonesia (`formatDateIndonesia`, `formatDateTimeIndonesia`).
  - Metadata waktu server lengkap (`getServerTimeInfo`) mencakup host server, lokasi instalasi sekolah, offset menit, dan uptime.
- **API Endpoints**:
  - `GET /api-backend/settings/server-time`: Mengembalikan metadata waktu dan konfigurasi server.
  - `GET /api-backend/settings/time-sync`: Endpoint estimasi latensi round-trip (NTP-style clock sync).

#### 2. Kalibrasi Realtime Server Clock di Frontend (Next.js)
- **Modul `frontend/src/lib/time-sync.ts`**:
  - Penghitungan kompensasi time drift browser terhadap waktu server (`t0`, `t1`, `t2`, `t3`).
  - Hook React `useRealtimeServerClock` dengan tick real-time per detik dan sinkronisasi berkala.
  - Format helper `formatDateWib`, `formatTimeWib`, `formatDateTimeWib`.
- **UI & Panel Interaktif**:
  - **Live Clock Panel di Pengaturan Sistem** (`/pengaturan/sistem`): Menampilkan jam digital live WIB, hari/tanggal, zona waktu, lokasi server, latensi jaringan, dan tombol kalibrasi instan.
  - **Navbar Header Live Clock**: Badge Live Server Time UTC+7 (WIB) pada navbar atas dashboard (`layout.tsx`).

#### 3. Decommissioning & Pembersihan Modul Log Sistem Supabase
- Penghapusan modul pencatatan log sistem Supabase (`SystemLogService`, `SupabaseStorageService`, cron arsip, dan interceptor HTTP) untuk optimasi efisiensi sistem dan menyederhanakan arsitektur pemeliharaan.

---

## [2026-08-19] - FaceNet Biometric AI, Realtime Database Sync & Camera Engine Optimization

### 🚀 Fitur Baru & Peningkatan Utama

#### 1. Ekstraktor Biometrik FaceNet & MTCNN Landmark Alignment
- **MTCNN Landmark Alignment**: Mengintegrasikan ekstraksi landmark wajah (mata, hidung, mulut) otomatis ke kanvas terstandarisasi 160x160 piksel untuk menghasilkan vektor 512-D berakurasi tinggi.
- **Horizontal Mirroring Augmentation**: Augmentasi refleksi horizontal pada foto profil saat registrasi agar kamera mirror/webcam HP langsung cocok 100%.
- **Kalibrasi Cosine Similarity**: Standar ambang batas (*threshold*) dikalibrasi ke presisi optimal `0.48` (48% - 55%) untuk mengeliminasi *false negative* ("Wajah Tidak Terdaftar").

#### 2. Sinkronisasi Otomatis Foto Profil ke Dataset FaceNet
- **Instant Vector Sync**: Saat pengguna (Siswa, Guru, Karyawan, Admin) mengunggah foto profil di dashboard, sistem langsung menyinkronkan foto dari penyimpanan lokal/Supabase ke basis data vektor FaceNet secara instan tanpa perlu restart mikroservis.
- Endpoint baru `POST /face-attendance/sync-user` dan `POST /face-attendance/sync-dataset`.

#### 3. Sinkronisasi Realtime Scanner Log & Supabase PostgreSQL
- **Two-Way Database Sync**: Hasil deteksi wajah otomatis tercatat ke tabel `DailyAttendance` (dan data absensi siswa) di Supabase secara *realtime*.
- **Area Penghapusan & Reset Data**:
  - Penghapusan log satuan kini langsung menghapus catatan presensi hari ini di database dan mereset timer *cooldown* kamera untuk user tersebut.
  - Reset seluruh log mengosongkan antrean log dan menghapus catatan presensi hari ini di database secara sinkron dengan konfirmasi SweetAlert2.
- Endpoint `DELETE /face-attendance/logs/:id` dan `POST /face-attendance/logs/clear` dengan dukungan parameter `resetDb`.
- Endpoint `POST /reset-cooldown` pada mikroservis FaceNet AI.

#### 4. Perbaikan Startup Kamera & Anti-Flickering
- **Zero-Flicker Stream**: Menghapus transisi kartu placeholder instan pada frame drop sesaat saat kamera menyesuaikan *auto-exposure*.
- **Multi-Backend Low-Latency Capture**:
  - Webcam USB: DirectShow (`CAP_DSHOW`) & Media Foundation (`CAP_MSMF`) dengan buffer size 1.
  - CCTV / IP Camera: Parameter FFmpeg TCP low-latency (`rtsp_transport;tcp|buffer_size;1048576|stimeout;3000000`).
- **Proxy Stream Next.js**: Menambahkan rewrite proxy `/api/face-stream` ke microservice AI port 8089.
- **Debounced Error Handling**: Loading spinner halus saat inisialisasi dan pencegahan unmount komponen kamera.

#### 5. Pembaruan Antarmuka (UI/UX)
- **Kontrol Tunggal**: Tombol "Nyalakan / Matikan AI" disederhanakan menjadi satu tombol utama di atas informasi CPU pada header.
- **Clean Preview Screen**: Menghapus tombol-tombol overlay yang menutupi layar pemutar video kamera.
- **Penyederhanaan Preset Kamera**: Menghapus pilihan RTMP dan file video lokal, memusatkan konfigurasi pada 3 standar utama: Webcam Browser, IP Camera RTSP (CCTV), dan Webcam USB Server.

#### 6. Persistensi Penuh Siklus Hidup Microservice di Sisi Server
- **Server-Wide Persistence**: Pengaturan ON/OFF AI Microservice oleh Superadmin kini tersimpan permanen di disk server (`isActive` pada `face-attendance-config.json`).
- **Independen dari Sesi Pengguna**: Ketika Superadmin menyalakan AI Microservice dan melakukan logout / menutup browser, Microservice AI Python tetap terus berjalan aktif di server melayani presensi dan kamera.
- **Siklus Standby Saat Dimatikan**: Jika Superadmin mematikan AI Microservice, sistem menyimpan status non-aktif dan melepaskan resource CPU/RAM ke mode Standby.
- **Autonomous Booting via OnModuleInit**: Backend NestJS secara otomatis memeriksa dan menghidupkan proses Python AI worker saat startup server jika konfigurasi `isActive: true`.

#### 7. Integrasi Publik Real-Time Stream & Log Presensi (`/presensi-view`)
- **Saklar Publikasi di Panel Superadmin**: Penambahan opsi `showPublicStream` dan `showPublicLogs` pada halaman kamera dashboard untuk mengontrol tayangan live stream dan feed log presensi.
- **Tampilan Real-Time Responsif**: Halaman `/presensi-view` otomatis menampilkan feed stream kamera live dan scanner log wajah secara realtime dengan interval polling 2000-2500ms.
- **Layout Adaptif**: Grid menyesuaikan secara otomatis (Split 7:5, Full Width, atau disembunyikan rapi) mengikuti preferensi server yang dikonfigurasi Superadmin.

#### 8. Optimasi Aliran Kamera Ultra Rendah Latensi (*Zero Delay*)
- **Pembersihan Antrean Buffer Kamera**: Menghapus jeda *artificial sleep* pada loop penangkapan frame OpenCV (`cap.read()`) sehingga buffer frame hardware selalu kosong (`buffer_size=1`) dan tidak terjadi penumpukan *delay* akumulatif.
- **Konfigurasi FFMPEG RTSP Low-Latency**: Mengaktifkan flag `fflags;nobuffer|flags;low_delay|max_delay;0|probesize;32768|analyzeduration;0` pada koneksi IP Camera / CCTV RTSP.
- **Fast MJPEG Encoding & Streaming Headers**: Kompresi frame JPEG cepat (Quality: 74) dengan penyisipan header `X-Accel-Buffering: no` dan `Content-Length` untuk mencegah *buffering* pada perantara proxy / Next.js.

#### 9. Indikator Status & Banner Notifikasi AI Nonaktif di `/presensi-view`
- **Banner Peringatan Khusus**: Menampilkan kartu notifikasi adaptif (*Amber Banner*) di halaman publik `/presensi-view` saat AI Microservice FaceNet dimatikan oleh Superadmin.
- **Visual Placeholder & Scanner Status**: Mengubah kanvas kamera dan kartu scanner log secara terpadu dengan ikon `PowerOff` dan status `STANDBY / OFF (Diatur Admin)` agar pengguna memahami bahwa layanan sedang diistirahatkan oleh administrator.

#### 10. Integrasi Notifikasi Ganda WhatsApp Otomatis untuk Presensi Kamera AI
- **WhatsApp Notification Integration**: Setiap kali sistem kamera AI FaceNet berhasil memindai dan mencatat presensi (Masuk atau Pulang), sistem secara otomatis mengirimkan notifikasi resmi WhatsApp ke nomor pengguna dan/atau nomor orang tua/wali siswa secara *real-time*.
- **Informasi Lengkap**: Pesan mencakup status presensi, nama, peran/kelas, jam akurat WIB, tanggal, dan metode presensi (*Face Recognition AI Camera*).
- **Nomor Pengirim Resmi**: Menggunakan nomor resmi sistem `088293733330` dan terintegrasi dengan tabel log `WhatsAppLog`.
