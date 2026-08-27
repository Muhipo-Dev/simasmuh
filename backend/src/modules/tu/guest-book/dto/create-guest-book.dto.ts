import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class CreateGuestBookDto {
  @IsString()
  @IsNotEmpty()
  namaTamu: string;

  @IsString()
  @IsNotEmpty()
  instansi: string;

  @IsString()
  @IsOptional()
  @IsIn([
    'STUDI_TIRU',
    'PEJABAT',
    'ALUMNI_IJAZAH',
    'VENDOR_UMUM',
    'ORANG_TUA',
    'LAINNYA',
  ])
  kategori?: string;

  @IsString()
  @IsNotEmpty()
  tujuan: string;

  @IsString()
  @IsOptional()
  dituju?: string;

  @IsString()
  @IsOptional()
  kontak?: string;

  @IsString()
  @IsOptional()
  waktu?: string;

  @IsString()
  @IsOptional()
  catatan?: string;
}
