import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ScanPresensiKegiatanDto {
  @IsNotEmpty({ message: 'Token QR Kegiatan wajib disertakan' })
  @IsString()
  qrCodeToken: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  keterangan?: string;
}

export class ManualPresensiKegiatanDto {
  @IsNotEmpty({ message: 'User ID peserta wajib diisi' })
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  keterangan?: string;
}
