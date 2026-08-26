import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CreateSuratKeluarDto {
  @IsString()
  @IsNotEmpty()
  nomorSurat: string;

  @IsString()
  @IsOptional()
  nomorAgenda?: string;

  @IsString()
  @IsNotEmpty()
  tujuanPenerima: string;

  @IsString()
  @IsOptional()
  instansiPenerima?: string;

  @IsString()
  @IsNotEmpty()
  perihal: string;

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

  @IsObject()
  @IsOptional()
  templateData?: any;
}
