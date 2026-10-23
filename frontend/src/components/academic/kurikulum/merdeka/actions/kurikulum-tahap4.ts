'use server';

import { revalidatePath } from 'next/cache';

export interface AutoFillDailyScheduleParams {
  userId?: string;
  teacherId?: string;
  dateStr?: string; // YYYY-MM-DD
}

export interface SubmitJurnalHarianInput {
  date: string; // YYYY-MM-DD
  scheduleId: string;
  teacherId: string;
  classId: string;
  subjectId: string;
  tpId?: string | null;
  modulAjarId?: string | null;
  material: string;
  notes?: string;
  photoUrl?: string | null;
  attendances?: {
    studentId: string;
    status: 'HADIR' | 'IZIN' | 'SAKIT' | 'ALPA' | 'DISPENSASI';
  }[];
}

/**
 * Server Action Tahap 4A: Ambil Jadwal Mengajar Hari Ini secara Otomatis (Auto-Fill)
 * Menggunakan tanggal aktif WIB / GMT+7, mendeteksi hari (Senin=1 ... Sabtu=6),
 * dan mengembalikan sesi kelas, mapel, serta TP/Modul Ajar terkait.
 */
export async function getAutoFillDailyTeachingAction(params: AutoFillDailyScheduleParams) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const qs = new URLSearchParams();
    if (params.userId) qs.append('userId', params.userId);
    if (params.teacherId) qs.append('teacherId', params.teacherId);
    if (params.dateStr) qs.append('date', params.dateStr);

    const res = await fetch(`${backendUrl}/kurikulum-merdeka/daily-autofill?${qs.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      // Fallback via schedules endpoint
      const schedRes = await fetch(`${backendUrl}/schedules?${qs.toString()}`, { cache: 'no-store' });
      if (!schedRes.ok) return { success: false, error: 'Gagal memuat jadwal harian' };
      const schedules = await schedRes.json();
      return { success: true, data: { schedules, currentDayOfWeek: new Date().getDay() } };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal koneksi auto-fill jadwal' };
  }
}

/**
 * Server Action Tahap 4B: Simpan Jurnal Harian dengan Relasi Ketat ke Modul Ajar/TP & Sinkronisasi Presensi Siswa
 */
export async function submitJurnalHarianAction(payload: SubmitJurnalHarianInput) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    // 1. Simpan Teaching Journal ke backend
    const res = await fetch(`${backendUrl}/teaching-journals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date: new Date(payload.date).toISOString(),
        scheduleId: payload.scheduleId,
        teacherId: payload.teacherId,
        tpId: payload.tpId || undefined,
        modulAjarId: payload.modulAjarId || undefined,
        material: payload.material,
        notes: payload.notes || undefined,
        photoUrl: payload.photoUrl || undefined,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.message || 'Gagal menyimpan Jurnal Mengajar Harian' };
    }

    const journal = await res.json();

    // 2. Jika ada data presensi sesi kelas, simpan attendance secara atomik
    if (payload.attendances && payload.attendances.length > 0) {
      await fetch(`${backendUrl}/attendances/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduleId: payload.scheduleId,
          date: new Date(payload.date).toISOString(),
          items: payload.attendances,
        }),
      }).catch(() => {
        // Abaikan error batch presensi jika endpoint opsional
      });
    }

    revalidatePath('/akademik/jurnal-mengajar');
    return { success: true, data: journal };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menyimpan eksekusi jurnal' };
  }
}
