import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExtracurricularDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  scheduleDay?: string;

  @IsString()
  @IsOptional()
  scheduleTime?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  pembinaId?: string;

  @IsString()
  @IsOptional()
  pembinaUserId?: string;

  @IsString()
  @IsNotEmpty()
  pembinaName: string;

  @IsString()
  @IsOptional()
  pembinaNip?: string;

  @IsString()
  @IsOptional()
  pembinaContact?: string;

  @IsString()
  @IsOptional()
  pembina2Name?: string;

  @IsString()
  @IsOptional()
  pembina2Contact?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  targetPeserta?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateExtracurricularDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  scheduleDay?: string;

  @IsString()
  @IsOptional()
  scheduleTime?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  pembinaId?: string;

  @IsString()
  @IsOptional()
  pembinaUserId?: string;

  @IsString()
  @IsOptional()
  pembinaName?: string;

  @IsString()
  @IsOptional()
  pembinaNip?: string;

  @IsString()
  @IsOptional()
  pembinaContact?: string;

  @IsString()
  @IsOptional()
  pembina2Name?: string;

  @IsString()
  @IsOptional()
  pembina2Contact?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  targetPeserta?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class AddMemberDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsOptional()
  role?: string; // KETUA, WAKIL_KETUA, SEKRETARIS, BENDAHARA, ANGGOTA

  @IsString()
  @IsOptional()
  catatan?: string;
}

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  sessionDate: string; // ISO String or YYYY-MM-DD

  @IsString()
  @IsOptional()
  startTime?: string;

  @IsString()
  @IsOptional()
  endTime?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  topic?: string;

  @IsString()
  @IsOptional()
  trainerName?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateSessionDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  sessionDate?: string;

  @IsString()
  @IsOptional()
  startTime?: string;

  @IsString()
  @IsOptional()
  endTime?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  topic?: string;

  @IsString()
  @IsOptional()
  trainerName?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class AttendanceRecordDto {
  @IsString()
  @IsNotEmpty()
  memberId: string;

  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  status: string; // HADIR, IZIN, SAKIT, ALFA

  @IsString()
  @IsOptional()
  notes?: string;
}

export class BulkSaveAttendanceDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  attendances: AttendanceRecordDto[];
}

export class GradeRecordDto {
  @IsString()
  @IsNotEmpty()
  memberId: string;

  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsOptional()
  academicYear?: string;

  @IsString()
  @IsOptional()
  semester?: string;

  @IsNumber()
  @IsOptional()
  score?: number;

  @IsString()
  @IsNotEmpty()
  predicate: string; // A, B, C, D atau Sangat Baik, Baik, Cukup, Kurang

  @IsString()
  @IsOptional()
  description?: string;
}

export class BulkSaveGradesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradeRecordDto)
  grades: GradeRecordDto[];
}
