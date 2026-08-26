import { IsString, IsOptional, IsObject } from 'class-validator';

export class UpdateSuratKeluarDto {
  @IsString()
  @IsOptional()
  nomorSurat?: string;

  @IsString()
  @IsOptional()
  nomorAgenda?: string;

  @IsString()
  @IsOptional()
  tujuanPenerima?: string;

  @IsString()
  @IsOptional()
  instansiPenerima?: string;

  @IsString()
  @IsOptional()
  perihal?: string;

  @IsString()
  @IsOptional()
  tanggalSurat?: string;

  @IsString()
  @IsOptional()
  jenisSurat?: string;

  @IsString()
  @IsOptional()
  penandatangan?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  catatan?: string;

  @IsString()
  @IsOptional()
  catatanRevisi?: string;

  @IsString()
  @IsOptional()
  eSignToken?: string;

  @IsString()
  @IsOptional()
  signerName?: string;

  @IsString()
  @IsOptional()
  signerNbm?: string;

  @IsString()
  @IsOptional()
  fileUrl?: string;

  @IsString()
  @IsOptional()
  signatureDataUrl?: string;

  @IsString()
  @IsOptional()
  signatureImage?: string;

  @IsString()
  @IsOptional()
  eSignSignedAt?: string;

  @IsObject()
  @IsOptional()
  templateData?: any;
}
