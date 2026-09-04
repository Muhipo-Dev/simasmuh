import { IsOptional, IsString } from 'class-validator';

export class UpdateKegiatanDto {
  @IsOptional()
  @IsString()
  namaKegiatan?: string;

  @IsOptional()
  @IsString()
  kategori?: string;

  @IsOptional()
  @IsString()
  tanggal?: string;

  @IsOptional()
  @IsString()
  waktuMulai?: string;

  @IsOptional()
  @IsString()
  waktuSelesai?: string;

  @IsOptional()
  @IsString()
  tempat?: string;

  @IsOptional()
  @IsString()
  pemateri?: string;

  @IsOptional()
  @IsString()
  penanggungJawab?: string;

  @IsOptional()
  @IsString()
  ringkasanMateri?: string;

  @IsOptional()
  @IsString()
  dokumentasiUrl?: string;

  @IsOptional()
  @IsString()
  qrCodeToken?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
