import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsObject,
} from 'class-validator';

export class CreateDisposisiDto {
  @IsString()
  @IsNotEmpty()
  suratMasukId: string;

  @IsString()
  @IsOptional()
  nomorAgenda?: string;

  @IsString()
  @IsOptional()
  sifat?: string; // RAHASIA, PENTING, RUTIN

  @IsString()
  @IsOptional()
  statusTahapan?: string; // DITERIMA, DISAMPAIKAN, PENGECEKAN, PENYELESAIAN

  @IsString()
  @IsOptional()
  tanggalDiterima?: string;

  @IsOptional()
  instruksi?: any; // Array of selected string checkboxes e.g. ["Arsip", "Ditindak Lanjuti"]

  @IsOptional()
  diteruskanKepada?: any; // Object/Array e.g. { targets: ["Wakasek Kurikulum"], guruNama: "M. Raza" }

  @IsString()
  @IsOptional()
  catatan?: string;

  @IsString()
  @IsOptional()
  statusEsign?: string; // MENUNGGU_VERIFIKASI, DISETUJUI, DITOLAK
}
