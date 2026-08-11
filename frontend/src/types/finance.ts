export type ProgramType = 'Reguler' | 'Kader' | 'Olahraga' | 'CI';

export type ModifierType = 'percentage' | 'fixed';

export interface Modifier {
  id: string;
  name: string;
  type: ModifierType;
  value: number; // 0-100 for percentage, nominal amount for fixed
  nestedModifiers?: Modifier[];
}

export interface Student {
  id: string;
  name: string;
  program: ProgramType;
  modifiers?: Modifier[];
}

export interface BillingResult {
  baseFee: number;
  totalBeasiswa: number;
  finalFee: number;
  breakdown: { name: string; amount: number }[];
}
