import { ProgramType, Student, Modifier, BillingResult } from '@/types/finance';

export const BASE_SPP_MAP: Record<ProgramType, number> = {
  Reguler: 500000,
  Kader: 250000,
  Olahraga: 680000,
  CI: 750000,
};

export const calculateBilling = (student: Student): BillingResult => {
  const baseFee = BASE_SPP_MAP[student.program] ?? 0;
  
  const flattenModifiers = (mods: Modifier[] = []): Modifier[] =>
    mods.flatMap((m) => [m, ...flattenModifiers(m.nestedModifiers)]);

  const { totalDiscount, breakdown } = flattenModifiers(student.modifiers).reduce(
    (acc, mod) => {
      const amount = mod.type === 'percentage' 
        ? Math.round((baseFee * mod.value) / 100)
        : mod.value;
      
      acc.totalDiscount += amount;
      acc.breakdown.push({ name: mod.name, amount });
      return acc;
    },
    { totalDiscount: 0, breakdown: [] as { name: string; amount: number }[] }
  );

  const finalFee = Math.max(0, baseFee - totalDiscount);

  return { baseFee, totalDiscount, finalFee, breakdown };
};
