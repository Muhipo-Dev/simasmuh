import { IsString, IsNotEmpty, IsOptional, IsInt, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePerangkatKurikulumDto {
  @IsString()
  @IsNotEmpty()
  classId: string;

  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @IsString()
  @IsOptional()
  academicYear?: string;

  @IsString()
  @IsOptional()
  semester?: string;

  @IsString()
  @IsOptional()
  fase?: string;

  @IsInt()
  @IsOptional()
  totalJpSemester?: number;

  @IsInt()
  @IsOptional()
  jpPerMinggu?: number;

  @IsInt()
  @IsOptional()
  mingguEfektifCount?: number;

  @IsOptional()
  applyToGradeLevel?: boolean;

  @IsArray()
  @IsOptional()
  targetClassIds?: string[];
}

export class CloneParallelDto {
  @IsString()
  @IsNotEmpty()
  sourcePerangkatId: string;

  @IsArray()
  @IsNotEmpty()
  targetClassIds: string[];
}

export class ReuseArchivePerangkatDto {
  @IsString()
  @IsNotEmpty()
  archivePerangkatId: string;

  @IsString()
  @IsNotEmpty()
  targetClassId: string;

  @IsString()
  @IsOptional()
  targetAcademicYear?: string;

  @IsString()
  @IsOptional()
  targetSemester?: string;
}

export class CreateTujuanPembelajaranDto {
  @IsString()
  @IsNotEmpty()
  perangkatKurikulumId: string;

  @IsString()
  @IsOptional()
  cpId?: string;

  @IsString()
  @IsNotEmpty()
  kodeTp: string;

  @IsInt()
  @IsOptional()
  orderIndex?: number;

  @IsString()
  @IsNotEmpty()
  lingkupMateri: string;

  @IsString()
  @IsNotEmpty()
  materiPokok: string;

  @IsString()
  @IsNotEmpty()
  deskripsiTp: string;

  @IsInt()
  @IsOptional()
  alokasiJp?: number;

  @IsString()
  @IsOptional()
  dimensiProfilPancasila?: string;
}

export class UpdateTujuanPembelajaranDto {
  @IsString()
  @IsOptional()
  kodeTp?: string;

  @IsInt()
  @IsOptional()
  orderIndex?: number;

  @IsString()
  @IsOptional()
  lingkupMateri?: string;

  @IsString()
  @IsOptional()
  materiPokok?: string;

  @IsString()
  @IsOptional()
  deskripsiTp?: string;

  @IsInt()
  @IsOptional()
  alokasiJp?: number;

  @IsString()
  @IsOptional()
  dimensiProfilPancasila?: string;
}

export class PromesAllocationItemDto {
  @IsString()
  @IsNotEmpty()
  tpId: string;

  @IsInt()
  bulanIndex: number;

  @IsString()
  namaBulan: string;

  @IsInt()
  mingguKe: number;

  @IsInt()
  mingguAbsolut: number;

  @IsInt()
  alokasiJp: number;

  @IsString()
  @IsOptional()
  keterangan?: string;
}

export class SavePromesMatrixDto {
  @IsString()
  @IsNotEmpty()
  perangkatKurikulumId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PromesAllocationItemDto)
  allocations: PromesAllocationItemDto[];
}

export class GeneratePerangkatDocDto {
  @IsString()
  @IsNotEmpty()
  perangkatKurikulumId: string;

  @IsString()
  @IsOptional()
  tpId?: string;

  @IsString()
  @IsNotEmpty()
  kategori: string; // MODUL_AJAR, LKPD, SOAL_HARIAN, ASESMEN_SUMATIF, KISI_KISI, SOAL_STS, SOAL_SAS, SILABUS, PROTA, PROMES

  @IsString()
  @IsNotEmpty()
  judul: string;

  @IsOptional()
  kontenJson?: any;
}

export class BatchInputNilaiTPDto {
  @IsString()
  @IsNotEmpty()
  perangkatKurikulumId: string;

  @IsString()
  @IsNotEmpty()
  tpId: string;

  @IsArray()
  items: {
    studentId: string;
    nilaiFormatif?: number;
    nilaiSumatif?: number;
    catatanProgres?: string;
  }[];
}

export class WizardTpItemDto {
  @IsString()
  @IsNotEmpty()
  kodeTp: string;

  @IsString()
  @IsNotEmpty()
  lingkupMateri: string;

  @IsString()
  @IsOptional()
  materiPokok?: string;

  @IsString()
  @IsNotEmpty()
  deskripsiTp: string;

  @IsInt()
  @IsOptional()
  alokasiJp?: number;

  @IsString()
  @IsOptional()
  cpId?: string;

  @IsString()
  @IsOptional()
  dimensiProfilPancasila?: string;
}

export class WizardAutoFillJenjangDto {
  @IsInt()
  gradeLevel: number; // 10, 11, atau 12

  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @IsString()
  @IsOptional()
  fase?: string; // FASE_E atau FASE_F

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WizardTpItemDto)
  tujuanPembelajarans: WizardTpItemDto[];

  @IsArray()
  @IsOptional()
  targetClassIds?: string[]; // Jika diisi, terapkan hanya pada kelas tertentu, jika kosong terapkan ke seluruh kelas di jenjang tersebut
}

