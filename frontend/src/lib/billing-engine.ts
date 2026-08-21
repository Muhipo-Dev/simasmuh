import { ProgramType, Student, Modifier, BillingResult } from '@/types/finance';

export const BASE_SPP_MAP: Record<string, number> = {
  reguler: 300000,
  kader: 250000,
  tahfidz: 350000,
  olahraga: 350000,
  ci: 750000,
  mic: 600000,
  enterpreneur: 350000,
  'seni budaya': 350000,
  'soshum saintek': 400000,
  inklusi: 250000,
};

export const calculateBilling = (
  student: Student,
  customProgramRates?: Record<string, number>,
): BillingResult => {
  const progKey = (student.program || 'reguler').toLowerCase();
  const rates = customProgramRates || BASE_SPP_MAP;
  const baseFee = rates[progKey] ?? rates['reguler'] ?? 300000;

  const flattenModifiers = (mods: Modifier[] = []): Modifier[] =>
    mods.flatMap((m) => [m, ...flattenModifiers(m.nestedModifiers)]);

  const { totalDiscount, breakdown } = flattenModifiers(student.modifiers).reduce(
    (acc, mod) => {
      const amount =
        mod.type === 'percentage'
          ? Math.round((baseFee * mod.value) / 100)
          : mod.value;

      acc.totalDiscount += amount;
      acc.breakdown.push({ name: mod.name, amount });
      return acc;
    },
    { totalDiscount: 0, breakdown: [] as { name: string; amount: number }[] },
  );

  // If student has explicit beasiswaSppPct
  let studentBeasiswaDiscount = 0;
  const beasiswaPct = student.beasiswaSppPct || student.beasiswaPercentage || 0;
  if (beasiswaPct > 0 && totalDiscount === 0) {
    studentBeasiswaDiscount = Math.round((baseFee * beasiswaPct) / 100);
    breakdown.push({
      name: `Beasiswa Siswa (${beasiswaPct}%)`,
      amount: studentBeasiswaDiscount,
    });
  }

  const grandTotalDiscount = totalDiscount + studentBeasiswaDiscount;
  const finalFee = Math.max(0, baseFee - grandTotalDiscount);

  return {
    baseFee,
    totalBeasiswa: grandTotalDiscount,
    finalFee,
    breakdown,
  };
};
