'use server';

import { revalidatePath } from 'next/cache';

/**
 * Interface & DTO Tahap 2: Breakdown TP & Re-sequence ATP
 */
export interface TujuanPembelajaranInput {
  id?: string;
  perangkatKurikulumId: string;
  cpId?: string | null;
  kodeTp: string;
  lingkupMateri: string;
  materiPokok: string;
  deskripsiTp: string;
  alokasiJp: number;
  dimensiProfilPancasila?: string | null;
}

export interface AlurTujuanItemInput {
  tpId: string;
  sequence: number;
  alokasiJp: number;
  keterangan?: string;
}

export interface SaveAtpSequenceInput {
  teacherId: string;
  classId: string;
  subjectId: string;
  fase: string;
  academicYear?: string;
  semester?: string;
  items: AlurTujuanItemInput[];
}

/**
 * Server Action Tahap 2A: Breakdown CP menjadi butir Tujuan Pembelajaran (TP)
 */
export async function createBreakdownTpAction(data: TujuanPembelajaranInput) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const res = await fetch(`${backendUrl}/kurikulum-merdeka/tujuan-pembelajaran`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        perangkatKurikulumId: data.perangkatKurikulumId,
        cpId: data.cpId || undefined,
        kodeTp: data.kodeTp,
        lingkupMateri: data.lingkupMateri,
        materiPokok: data.materiPokok,
        deskripsiTp: data.deskripsiTp,
        alokasiJp: Number(data.alokasiJp) || 2,
        dimensiProfilPancasila: data.dimensiProfilPancasila || undefined,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.message || 'Gagal menyimpan Tujuan Pembelajaran' };
    }

    const result = await res.json();
    revalidatePath('/akademik/perangkat-ajar');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || 'Koneksi ke backend gagal' };
  }
}

/**
 * Server Action Tahap 2B: Susun Alur Kronologis ATP & Alokasi JP (Drag-and-Drop / Re-sequence)
 */
export async function saveAtpSequenceAction(payload: SaveAtpSequenceInput) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const res = await fetch(`${backendUrl}/kurikulum-merdeka/atp/sequence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.message || 'Gagal menyimpan susunan Alur Tujuan Pembelajaran' };
    }

    const result = await res.json();
    revalidatePath('/akademik/perangkat-ajar');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || 'Koneksi ke backend gagal' };
  }
}
