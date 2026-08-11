import React from 'react';
import { Student } from '@/types/finance';
import { calculateBilling } from '@/lib/billing-engine';

const SCENARIOS: { label: string; student: Student }[] = [
  {
    label: 'Skenario 1: Reguler Murni',
    student: { id: '1', name: 'Ahmad', program: 'Reguler' },
  },
  {
    label: 'Skenario 2: Kader dengan Beasiswa 50%',
    student: {
      id: '2',
      name: 'Siti',
      program: 'Kader',
      modifiers: [{ id: 'm1', name: 'Beasiswa Kader', type: 'percentage', value: 50 }],
    },
  },
  {
    label: 'Skenario 3: Olahraga dengan Pembebasan 100% (Nested Modifier)',
    student: {
      id: '3',
      name: 'Budi',
      program: 'Olahraga',
      modifiers: [
        {
          id: 'm2',
          name: 'Diskon Atlet 50%',
          type: 'percentage',
          value: 50,
          nestedModifiers: [
            { id: 'm3', name: 'Bantuan Kurang Mampu 50%', type: 'percentage', value: 50 },
          ],
        },
      ],
    },
  },
];

export default function FinanceTestPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto font-sans text-slate-800">
      <h1 className="text-2xl font-bold mb-6 text-slate-900">Validasi Engine Tagihan SIMASMUH</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {SCENARIOS.map(({ label, student }) => {
          const result = calculateBilling(student);
          return (
            <div key={student.id} className="p-4 border rounded-xl shadow-sm bg-white border-slate-200">
              <h2 className="font-semibold text-sm text-slate-600 mb-2">{label}</h2>
              <div className="text-xs space-y-1">
                <p><span className="font-medium">Siswa:</span> {student.name}</p>
                <p><span className="font-medium">Program:</span> {student.program}</p>
                <p><span className="font-medium">Tarif Dasar:</span> Rp {result.baseFee.toLocaleString('id-ID')}</p>
                <p><span className="font-medium text-rose-600">Total Potongan:</span> -Rp {result.totalBeasiswa.toLocaleString('id-ID')}</p>
                {result.breakdown.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <p className="font-medium text-[11px] text-slate-500 mb-1">Rincian Potongan:</p>
                    <ul className="list-disc list-inside text-[11px] text-slate-600">
                      {result.breakdown.map((item, idx) => (
                        <li key={idx}>
                          {item.name}: Rp {item.amount.toLocaleString('id-ID')}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <hr className="my-2 border-slate-100" />
                <p className="text-sm font-bold text-emerald-600">
                  Tagihan Akhir: Rp {result.finalFee.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
