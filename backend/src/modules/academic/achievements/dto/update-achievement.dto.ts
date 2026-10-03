import { IsOptional, IsString, IsInt, IsDateString } from 'class-validator';

export class UpdateAchievementDto {
  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  judul?: string;

  @IsOptional()
  @IsString()
  kategoriBidang?: string;

  @IsOptional()
  @IsString()
  tingkat?: string;

  @IsOptional()
  @IsString()
  peringkat?: string;

  @IsOptional()
  @IsString()
  penyelenggara?: string;

  @IsOptional()
  @IsInt()
  tahun?: number;

  @IsOptional()
  @IsDateString()
  tanggal?: string;

  @IsOptional()
  @IsString()
  tempat?: string;

  @IsOptional()
  @IsString()
  deskripsi?: string;

  @IsOptional()
  @IsString()
  sertifikatUrl?: string;

  @IsOptional()
  @IsString()
  pembimbing?: string;

  @IsOptional()
  @IsInt()
  poinApresiasi?: number;

  @IsOptional()
  @IsString()
  statusVerifikasi?: string;
}
