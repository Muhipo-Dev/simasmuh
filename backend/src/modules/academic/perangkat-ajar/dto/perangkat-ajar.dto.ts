import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class CreatePerangkatAjarDto {
  @IsString()
  @IsOptional()
  teacherId?: string;

  @IsString()
  @IsOptional()
  academicYear?: string;

  @IsString()
  @IsOptional()
  semester?: string;

  @IsString()
  @IsNotEmpty({ message: 'Mata pelajaran wajib diisi' })
  subjectName: string;

  @IsString()
  @IsOptional()
  className?: string;

  @IsString()
  @IsOptional()
  fase?: string;

  @IsString()
  @IsNotEmpty({ message: 'Jenis perangkat wajib dipilih' })
  jenisPerangkat: string; // MODUL_AJAR, ATP, CP, PROTA_PROMES, ASESMEN, BUKU_AJAR, LAINNYA

  @IsString()
  @IsNotEmpty({ message: 'Judul dokumen wajib diisi' })
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty({ message: 'Berkas atau link dokumen wajib dilampirkan' })
  fileUrl: string;

  @IsString()
  @IsOptional()
  fileType?: string; // PDF, DOCX, LINK, GDRIVE

  @IsString()
  @IsOptional()
  fileSize?: string;

  @IsString()
  @IsOptional()
  status?: string; // DRAFT, DIAJUKAN
}

export class UpdatePerangkatAjarDto {
  @IsString()
  @IsOptional()
  academicYear?: string;

  @IsString()
  @IsOptional()
  semester?: string;

  @IsString()
  @IsOptional()
  subjectName?: string;

  @IsString()
  @IsOptional()
  className?: string;

  @IsString()
  @IsOptional()
  fase?: string;

  @IsString()
  @IsOptional()
  jenisPerangkat?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  fileUrl?: string;

  @IsString()
  @IsOptional()
  fileType?: string;

  @IsString()
  @IsOptional()
  fileSize?: string;

  @IsString()
  @IsOptional()
  status?: string;
}

export class VerifyPerangkatAjarDto {
  @IsString()
  @IsNotEmpty({ message: 'Status verifikasi wajib dipilih' })
  status: string; // TERVERIFIKASI, PERLU_REVISI, DITOLAK

  @IsString()
  @IsOptional()
  catatanVerifikasi?: string;
}
