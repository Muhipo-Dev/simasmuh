import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateSuratMasukDto {
  @IsString()
  @IsNotEmpty()
  nomorAgenda: string;

  @IsString()
  @IsNotEmpty()
  nomorSurat: string;

  @IsString()
  @IsOptional()
  pengirim?: string;

  @IsString()
  @IsNotEmpty()
  instansi: string;

  @IsString()
  @IsNotEmpty()
  perihal: string;

  @IsString()
  @IsOptional()
  tanggalSurat?: string;

  @IsString()
  @IsOptional()
  tanggalDiterima?: string;

  @IsString()
  @IsOptional()
  sifat?: string; // RAHASIA, PENTING, RUTIN

  @IsString()
  @IsOptional()
  kategori?: string; // DINAS_DIKNAS, MAJELIS_DIKDASMEN, KEMENAG, KERJASAMA, UNDANGAN, UMUM

  @IsString()
  @IsOptional()
  fileUrl?: string;

  @IsString()
  @IsOptional()
  ringkasan?: string;

  @IsString()
  @IsOptional()
  statusTahapan?: string; // DITERIMA, DISAMPAIKAN, PENGECEKAN, PENYELESAIAN
}
