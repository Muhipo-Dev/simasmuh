import { IsString, IsNotEmpty, IsOptional, IsInt, IsDateString } from 'class-validator';

export class CreateAchievementDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  judul: string;

  @IsString()
  @IsNotEmpty()
  kategoriBidang: string; // SAINS_TECH, OLAHRAGA, AGAMA, BAHASA, SENI, PENGEMBANGAN_DIRI

  @IsString()
  @IsNotEmpty()
  tingkat: string; // KELAS, SEKOLAH, KECAMATAN, KABUPATEN, PROVINSI, NASIONAL, INTERNASIONAL

  @IsString()
  @IsOptional()
  peringkat?: string;

  @IsString()
  @IsOptional()
  penyelenggara?: string;

  @IsInt()
  tahun: number;

  @IsDateString()
  @IsOptional()
  tanggal?: string;

  @IsString()
  @IsOptional()
  tempat?: string;

  @IsString()
  @IsOptional()
  deskripsi?: string;

  @IsString()
  @IsOptional()
  sertifikatUrl?: string;

  @IsString()
  @IsOptional()
  pembimbing?: string;

  @IsInt()
  @IsOptional()
  poinApresiasi?: number;

  @IsString()
  @IsOptional()
  statusVerifikasi?: string;
}
