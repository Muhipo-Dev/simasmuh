'use client';

import React, { useState } from 'react';
import { 
  Compass, 
  ListTree, 
  FileSpreadsheet, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Sparkles,
  Info,
  Check,
  HelpCircle,
  Lightbulb
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { createBreakdownTpAction, saveAtpSequenceAction } from './actions/kurikulum-tahap2';

interface StepWizardProps {
  initialFase?: 'FASE_E' | 'FASE_F';
  initialSubjectId?: string;
  initialClassId?: string;
  teacherId?: string;
  perangkatKurikulumId?: string;
  assignedClasses?: Array<{ id: string; name: string; gradeLevel: number }>;
  assignedSubjects?: Array<{ id: string; name: string; code: string }>;
  schedulePairings?: Array<{
    classId: string;
    className: string;
    gradeLevel: number;
    subjectId: string;
    subjectName: string;
    fase: string;
    totalJpPerMinggu: number;
    days: number[];
  }>;
  existingTps?: Array<{
    id: string;
    kodeTp: string;
    lingkupMateri: string;
    materiPokok: string;
    deskripsiTp: string;
    alokasiJp: number;
    orderIndex?: number;
  }>;
  onFinish?: () => void;
}

export function TeacherRoadmapStepper({
  initialFase = 'FASE_E',
  initialSubjectId = '',
  initialClassId = '',
  teacherId = '',
  perangkatKurikulumId = '',
  assignedClasses = [],
  assignedSubjects = [],
  schedulePairings = [],
  existingTps = [],
  onFinish
}: StepWizardProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Data Penugasan Mengajar Guru (Otomatis dari Jadwal)
  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialClassId || (schedulePairings[0]?.classId || assignedClasses[0]?.id || '')
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    initialSubjectId || (schedulePairings[0]?.subjectId || assignedSubjects[0]?.id || '')
  );

  const activePairing = React.useMemo(() => {
    return schedulePairings.find(
      (p) => p.classId === selectedClassId && p.subjectId === selectedSubjectId
    ) || schedulePairings[0] || null;
  }, [schedulePairings, selectedClassId, selectedSubjectId]);

  // Tahap 1: Target Kompetensi Akhir (CP)
  const [fase, setFase] = useState<string>(
    activePairing?.fase || initialFase || 'FASE_E'
  );
  const [subjectName, setSubjectName] = useState<string>(
    activePairing?.subjectName || assignedSubjects.find(s => s.id === selectedSubjectId)?.name || 'Mata Pelajaran'
  );
  const [gradeLevel, setGradeLevel] = useState<number>(
    activePairing?.gradeLevel || (assignedClasses.find(c => c.id === selectedClassId)?.gradeLevel || 10)
  );
  const [elemenCp, setElemenCp] = useState<string>('Materi Inti / Elemen Pembelajaran');
  const [deskripsiCp, setDeskripsiCp] = useState<string>(
    'Pada akhir fase ini, peserta didik mampu memahami konsep dasar, menerapkan keterampilan berpikir kritis, dan menyelesaikan persoalan nyata secara mandiri.'
  );

  const handleSelectClass = (classId: string | null) => {
    if (!classId) return;
    setSelectedClassId(classId);
    const pair = schedulePairings.find(p => p.classId === classId);
    if (pair) {
      setSelectedSubjectId(pair.subjectId);
      setSubjectName(pair.subjectName);
      setFase(pair.fase || (pair.gradeLevel === 10 ? 'FASE_E' : 'FASE_F'));
      setGradeLevel(pair.gradeLevel);
    } else {
      const cls = assignedClasses.find(c => c.id === classId);
      if (cls) {
        setGradeLevel(cls.gradeLevel);
        setFase(cls.gradeLevel === 10 ? 'FASE_E' : 'FASE_F');
      }
    }
  };

  const handleSelectSubject = (subjId: string | null) => {
    if (!subjId) return;
    setSelectedSubjectId(subjId);
    const subj = assignedSubjects.find(s => s.id === subjId);
    if (subj) setSubjectName(subj.name);
  };

  // Tahap 2: Tujuan Pembelajaran (TP)
  const [tpList, setTpList] = useState<Array<{
    id: string;
    kodeTp: string;
    lingkupMateri: string;
    materiPokok: string;
    deskripsiTp: string;
    alokasiJp: number;
    sequence: number;
  }>>(() => {
    if (existingTps && existingTps.length > 0) {
      return existingTps.map((t, idx) => ({
        id: t.id,
        kodeTp: t.kodeTp || `${gradeLevel}.${idx + 1}`,
        lingkupMateri: t.lingkupMateri,
        materiPokok: t.materiPokok || t.lingkupMateri,
        deskripsiTp: t.deskripsiTp,
        alokasiJp: t.alokasiJp || activePairing?.totalJpPerMinggu || 2,
        sequence: t.orderIndex || idx + 1,
      }));
    }
    const defaultJp = activePairing?.totalJpPerMinggu || 2;
    return [
      {
        id: 'tp-1',
        kodeTp: `${gradeLevel}.1`,
        lingkupMateri: 'Materi Pokok 1',
        materiPokok: 'Konsep Dasar',
        deskripsiTp: `Murid mampu memahami konsep dasar materi ${subjectName} dan menerapkannya dalam latihan mandiri.`,
        alokasiJp: defaultJp,
        sequence: 1,
      },
      {
        id: 'tp-2',
        kodeTp: `${gradeLevel}.2`,
        lingkupMateri: 'Materi Pokok 2',
        materiPokok: 'Penerapan Praktik',
        deskripsiTp: `Murid mampu mempraktikkan keterampilan inti dan menyelesaikan tugas secara kolaboratif.`,
        alokasiJp: defaultJp,
        sequence: 2,
      }
    ];
  });

  // Tahap 3: Modul Ajar & Kriteria Hasil Belajar (KKTP)
  const [selectedTpId, setSelectedTpId] = useState<string>('tp-1');
  const [judulModul, setJudulModul] = useState<string>('Modul Ajar Pertemuan 1');
  const [kktpDeskripsi, setKktpDeskripsi] = useState<string>(
    'Murid dikatakan tuntas apabila dapat menjelaskan konsep materi dengan kata-kata sendiri dan mampu menyelesaikan latihan tugas dengan benar minimal 75%.'
  );

  // Helper Tambah & Hapus TP
  const handleAddTp = () => {
    const nextSeq = tpList.length + 1;
    setTpList([
      ...tpList,
      {
        id: `tp-${Date.now()}`,
        kodeTp: `${gradeLevel}.${nextSeq}`,
        lingkupMateri: `Materi Pokok ${nextSeq}`,
        materiPokok: '',
        deskripsiTp: '',
        alokasiJp: activePairing?.totalJpPerMinggu || 2,
        sequence: nextSeq,
      }
    ]);
  };

  const handleRemoveTp = (id: string) => {
    if (tpList.length <= 1) return;
    setTpList(tpList.filter(t => t.id !== id));
  };

  const handleUpdateTp = (id: string, field: string, val: any) => {
    setTpList(tpList.map(t => t.id === id ? { ...t, [field]: val } : t));
  };

  // Simpan Tahap 2
  const handleSaveStep2 = async () => {
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      if (perangkatKurikulumId) {
        for (const item of tpList) {
          await createBreakdownTpAction({
            perangkatKurikulumId,
            kodeTp: item.kodeTp,
            lingkupMateri: item.lingkupMateri,
            materiPokok: item.materiPokok || item.lingkupMateri,
            deskripsiTp: item.deskripsiTp,
            alokasiJp: item.alokasiJp,
          });
        }
      }
      setStatusMessage({ type: 'success', text: 'Tujuan pembelajaran berhasil disimpan!' });
      setCurrentStep(3);
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e.message || 'Gagal menyimpan data' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">
      {/* 1. Indikator Langkah Sederhana & Ramah Pemula */}
      <div className="bg-card border rounded-xl p-4 shadow-xs">
        <div className="grid grid-cols-3 gap-2">
          {/* Langkah 1 */}
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-2.5 p-2.5 rounded-lg text-left transition-all ${
              currentStep === 1
                ? 'bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800'
                : currentStep > 1
                ? 'bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
                : 'opacity-60'
            }`}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
              currentStep === 1
                ? 'bg-blue-600 text-white'
                : currentStep > 1
                ? 'bg-emerald-600 text-white'
                : 'bg-muted text-muted-foreground'
            }`}>
              {currentStep > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
            </div>
            <div className="truncate">
              <span className="text-xs font-bold block text-foreground truncate">Langkah 1</span>
              <span className="text-[11px] text-muted-foreground block truncate">Target Belajar (CP)</span>
            </div>
          </button>

          {/* Langkah 2 */}
          <button
            type="button"
            onClick={() => setCurrentStep(2)}
            className={`flex items-center gap-2.5 p-2.5 rounded-lg text-left transition-all ${
              currentStep === 2
                ? 'bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800'
                : currentStep > 2
                ? 'bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
                : 'opacity-60'
            }`}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
              currentStep === 2
                ? 'bg-blue-600 text-white'
                : currentStep > 2
                ? 'bg-emerald-600 text-white'
                : 'bg-muted text-muted-foreground'
            }`}>
              {currentStep > 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
            </div>
            <div className="truncate">
              <span className="text-xs font-bold block text-foreground truncate">Langkah 2</span>
              <span className="text-[11px] text-muted-foreground block truncate">Tujuan Materi (TP)</span>
            </div>
          </button>

          {/* Langkah 3 */}
          <button
            type="button"
            onClick={() => setCurrentStep(3)}
            className={`flex items-center gap-2.5 p-2.5 rounded-lg text-left transition-all ${
              currentStep === 3
                ? 'bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800'
                : 'opacity-60'
            }`}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
              currentStep === 3
                ? 'bg-blue-600 text-white'
                : 'bg-muted text-muted-foreground'
            }`}>
              3
            </div>
            <div className="truncate">
              <span className="text-xs font-bold block text-foreground truncate">Langkah 3</span>
              <span className="text-[11px] text-muted-foreground block truncate">Modul & Kriteria (KKTP)</span>
            </div>
          </button>
        </div>
      </div>

      {/* Pesan Bantuan Singkat */}
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg text-xs text-blue-900 dark:text-blue-200">
        <Lightbulb className="w-4 h-4 text-blue-600 shrink-0" />
        <span>
          {currentStep === 1 && 'Cukup pilih kelas dan mapel yang Anda ajar. Sistem sudah mengisi target pembelajaran secara otomatis.'}
          {currentStep === 2 && 'Tentukan topik atau materi apa saja yang akan dipelajari siswa selama semester ini.'}
          {currentStep === 3 && 'Tentukan modul pertemuan dan kriteria sederhana untuk menyatakan siswa telah tuntas belajar.'}
        </span>
      </div>

      {/* Alert Status */}
      {statusMessage && (
        <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
          statusMessage.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <Info className="w-4 h-4 shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* LANGKAH 1: PILIH KELAS & TARGET PEMBELAJARAN (CP) */}
      {/* ========================================================= */}
      {currentStep === 1 && (
        <Card className="border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-foreground">
              Langkah 1: Pilih Kelas &amp; Mata Pelajaran
            </CardTitle>
            <CardDescription className="text-xs">
              Pilih kelas yang Anda ajar. Beban jam pelajaran (JP) dan kurikulum terhubung otomatis dari jadwal resmi sekolah.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Kelas</Label>
                <Select value={selectedClassId} onValueChange={handleSelectClass}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Pilih Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignedClasses.length > 0 ? (
                      assignedClasses.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name} (Kelas {cls.gradeLevel})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="X 1">X 1</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Mata Pelajaran</Label>
                <Select value={selectedSubjectId} onValueChange={handleSelectSubject}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Pilih Mapel" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignedSubjects.length > 0 ? (
                      assignedSubjects.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.name} ({sub.code})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value={selectedSubjectId || 'default'}>
                        {subjectName || 'Informatika'}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Kotak Ringkasan Otomatis (Tanpa Istilah Rumit) */}
            <div className="p-3 bg-muted/40 rounded-lg border text-xs space-y-1">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Alokasi Mengajar:</span>
                <span className="font-bold text-foreground">{activePairing?.totalJpPerMinggu || 2} Jam Pelajaran (JP) per minggu</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Jenjang Kurikulum:</span>
                <span className="font-bold text-foreground">Kelas {gradeLevel} ({fase === 'FASE_E' ? 'Fase E' : 'Fase F'})</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                Target Capaian Belajar Akhir (CP)
              </Label>
              <Textarea
                rows={3}
                className="text-xs leading-relaxed"
                value={deskripsiCp}
                onChange={(e) => setDeskripsiCp(e.target.value)}
                placeholder="Target kemampuan akhir yang diharapkan dicapai siswa..."
              />
            </div>

            <div className="flex justify-end pt-1">
              <Button
                onClick={() => setCurrentStep(2)}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 font-semibold"
              >
                Lanjut: Rincikan Materi Pembelajaran
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================= */}
      {/* LANGKAH 2: RUMUSKAN TUJUAN BELAJAR SISWA (TP & ATP) */}
      {/* ========================================================= */}
      {currentStep === 2 && (
        <Card className="border shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  Langkah 2: Rincikan Materi &amp; Tujuan Belajar (TP)
                </CardTitle>
                <CardDescription className="text-xs">
                  Tuliskan topik apa saja yang akan dipelajari siswa selama semester ini.
                </CardDescription>
              </div>
              <Button
                onClick={handleAddTp}
                variant="outline"
                size="sm"
                className="text-xs h-8 gap-1.5 border-dashed font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Topik
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {tpList.map((tp, idx) => (
              <div
                key={tp.id}
                className="p-3 border rounded-lg bg-card space-y-2.5 transition-all hover:border-blue-300"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
                    Materi #{idx + 1}
                  </span>
                  {tpList.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveTp(tp.id)}
                      className="h-6 px-2 text-[11px] text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Hapus
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Judul / Topik Materi</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="Contoh: Pengenalan Konsep..."
                      value={tp.lingkupMateri}
                      onChange={(e) => handleUpdateTp(tp.id, 'lingkupMateri', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Alokasi Waktu (JP)</Label>
                    <Input
                      type="number"
                      className="h-8 text-xs font-mono"
                      value={tp.alokasiJp}
                      onChange={(e) => handleUpdateTp(tp.id, 'alokasiJp', Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Kemampuan yang Ingin Dicapai Siswa</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="Contoh: Siswa dapat menjelaskan dan mempraktikkan..."
                    value={tp.deskripsiTp}
                    onChange={(e) => handleUpdateTp(tp.id, 'deskripsiTp', e.target.value)}
                  />
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(1)}
                className="gap-1.5 text-xs h-9 font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Kembali
              </Button>
              <Button
                disabled={isSubmitting}
                onClick={handleSaveStep2}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 font-semibold"
              >
                {isSubmitting ? 'Menyimpan...' : 'Lanjut: Buat Modul Pertemuan'}
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================= */}
      {/* LANGKAH 3: MODUL AJAR & KRITERIA KETERCAPAIAN (KKTP) */}
      {/* ========================================================= */}
      {currentStep === 3 && (
        <Card className="border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-foreground">
              Langkah 3: Siapkan Modul &amp; Kriteria Tuntas Belajar (KKTP)
            </CardTitle>
            <CardDescription className="text-xs">
              Hubungkan topik materi yang sudah Anda buat dengan modul mengajar dan tentukan bukti sederhana ketercapaian siswa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Pilih Topik Materi</Label>
                <Select value={selectedTpId} onValueChange={(val) => setSelectedTpId(val || '')}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Pilih Topik Materi" />
                  </SelectTrigger>
                  <SelectContent>
                    {tpList.map((tp) => (
                      <SelectItem key={tp.id} value={tp.id}>
                        {tp.kodeTp} - {tp.lingkupMateri}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Nama Modul Ajar</Label>
                <Input
                  className="h-9 text-xs"
                  value={judulModul}
                  onChange={(e) => setJudulModul(e.target.value)}
                  placeholder="Contoh: Modul Pertemuan 1"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                Kriteria Siswa Dinyatakan Tuntas (KKTP Kualitatif)
              </Label>
              <Textarea
                rows={3}
                className="text-xs leading-relaxed"
                value={kktpDeskripsi}
                onChange={(e) => setKktpDeskripsi(e.target.value)}
                placeholder="Tuliskan bukti nyata apa yang menunjukkan murid telah memahami pelajaran ini..."
              />
              <p className="text-[11px] text-muted-foreground">
                *Cukup tuliskan deskripsi kemampuan nyata siswa, tidak perlu menghitung angka KKM yang rumit.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(2)}
                className="gap-1.5 text-xs h-9 font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Kembali
              </Button>
              <Button
                onClick={() => {
                  setStatusMessage({
                    type: 'success',
                    text: 'Perencanaan selesai! Anda sekarang siap mengisi Jurnal Harian saat mengajar di kelas.'
                  });
                  if (onFinish) onFinish();
                }}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 font-bold"
              >
                <CheckCircle2 className="w-4 h-4" />
                Selesai &amp; Siap Mengajar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
