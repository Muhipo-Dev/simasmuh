import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// Permission types untuk granular access
export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) => 
  SetMetadata(PERMISSIONS_KEY, permissions);

// Payment specific permissions
export enum PaymentPermission {
  // Student permissions
  VIEW_OWN_BILLS = 'payment:view_own_bills',
  UPLOAD_PAYMENT_PROOF = 'payment:upload_proof',
  VIEW_OWN_PAYMENT_HISTORY = 'payment:view_own_history',

  // Finance (Keuangan) permissions
  VIEW_ALL_BILLS = 'payment:view_all_bills',
  CREATE_BILLS = 'payment:create_bills',
  UPDATE_BILLS = 'payment:update_bills',
  DELETE_BILLS = 'payment:delete_bills',
  VERIFY_PAYMENTS = 'payment:verify_payments',
  VIEW_FINANCIAL_REPORTS = 'payment:view_reports',
  GENERATE_MASS_BILLS = 'payment:generate_mass_bills',
  BULK_OPERATIONS = 'payment:bulk_operations',

  // Admin IT permissions
  MANAGE_PAYMENT_SETTINGS = 'payment:manage_settings',
  VIEW_AUDIT_LOGS = 'payment:view_audit_logs',
  SYSTEM_CONFIGURATION = 'payment:system_config',
}

// User roles
export enum UserRole {
  ADMIN_IT = 'ADMIN_IT',
  GURU = 'GURU',
  SISWA = 'SISWA',
  KARYAWAN = 'KARYAWAN',
  KEUANGAN = 'KEUANGAN',
  ADMIN_WEB = 'ADMIN_WEB',
}

// Sub roles
export enum SubRole {
  ADMIN_WEB = 'ADMIN_WEB',
  PEMBINA_EKSTRA = 'PEMBINA_EKSTRA',
  KETERTIBAN = 'KETERTIBAN',
  KEBERSIHAN = 'KEBERSIHAN',
  KEAMANAN = 'KEAMANAN',
  KEPEGAWAIAN = 'KEPEGAWAIAN',
  BK_BP = 'BK_BP',
  PUSTAKAWAN = 'PUSTAKAWAN',
  GURU_TAHFIDZ = 'GURU_TAHFIDZ',
  PERSURATAN = 'PERSURATAN',
  WALI_KELAS = 'WALI_KELAS',
  GURU_PIKET = 'GURU_PIKET',
  PETUGAS_SPMB = 'PETUGAS_SPMB',
  KEUANGAN = 'KEUANGAN',
  PEGAWAI = 'PEGAWAI',
  KURIKULUM = 'KURIKULUM',
}