# Changelog - SIMASMUH

All notable changes to the SIMASMUH project will be documented in this file.

## [1.2.0] - 2026-08-09

### Added
- **Custom HTTP Error Pages (400, 401, 402, 403, 404, 408, 500, 502, 503, 504)**:
  - Custom responsive layout component `ErrorPageContainer` following SIMASMUH UI guidelines.
  - School logo (`/pic_logo.png`) and SIMASMUH title in the header navbar left side.
  - Centered copyright footer: `Copyright © 2026 - Muhipo Dev`.
  - Next.js standard handlers (`not-found.tsx`, `error.tsx`) and dynamic status route `/error/[code]`.
- **QR Layar (Publik) Feature Access**:
  - Enabled `QR Layar (Publik)` navigation menu for Admin TU / BAU / Tata Usaha roles (`bauLinks`).
  - Updated backend endpoint `POST /settings/qr-token/regenerate` permissions to support `ADMIN_TU`, `BAU`, and `TATA_USAHA`.

### Changed
- **Login Navbar Branding**:
  - Updated login page header to display brand logo and SIMASMUH identity text on the left side matching error page layout.
- **Dashboard Header Greetings**:
  - Removed `"• Akses cepat semua menu:"` text from general user dashboard welcome header.
  - Added student greeting `"Semoga Harimu Menyenangkan! 😊✨"` on student dashboard banner.
- **Sidebar Navigation Clean Up**:
  - Removed `Profil` link from sidebar navigation for all user roles (accessible directly via top right navbar user avatar).
