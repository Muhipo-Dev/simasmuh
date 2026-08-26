import { IsString, IsOptional } from 'class-validator';

export class UpdateSuratMasukDto {
  @IsString()
  @IsOptional()
  nomorAgenda?: string;

  @IsString()
  @IsOptional()
  nomorSurat?: string;

  @IsString()
  @IsOptional()
  pengirim?: string;

  @IsString()
  @IsOptional()
  instansi?: string;

  @IsString()
  @IsOptional()
  perihal?: string;

  @IsString()
  @IsOptional()
  tanggalSurat?: string;

  @IsString()
  @IsOptional()
  tanggalDiterima?: string;

  @IsString()
  @IsOptional()
  sifat?: string;

  @IsString()
  @IsOptional()
  kategori?: string;

  @IsString()
  @IsOptional()
  fileUrl?: string;

  @IsString()
  @IsOptional()
  ringkasan?: string;

  @IsString()
  @IsOptional()
  statusTahapan?: string;
}
