import { IsString, IsOptional } from 'class-validator';

export class UpdateDisposisiDto {
  @IsString()
  @IsOptional()
  suratMasukId?: string;

  @IsString()
  @IsOptional()
  nomorAgenda?: string;

  @IsString()
  @IsOptional()
  sifat?: string;

  @IsString()
  @IsOptional()
  statusTahapan?: string;

  @IsString()
  @IsOptional()
  tanggalDiterima?: string;

  @IsOptional()
  instruksi?: any;

  @IsOptional()
  diteruskanKepada?: any;

  @IsString()
  @IsOptional()
  catatan?: string;

  @IsString()
  @IsOptional()
  statusEsign?: string;

  @IsString()
  @IsOptional()
  action?: 'APPROVE' | 'REJECT';

  @IsString()
  @IsOptional()
  signerName?: string;

  @IsString()
  @IsOptional()
  signerNbm?: string;

  @IsString()
  @IsOptional()
  catatanPenolak?: string;

  @IsString()
  @IsOptional()
  signatureImage?: string;

  @IsString()
  @IsOptional()
  signatureDataUrl?: string;
}
