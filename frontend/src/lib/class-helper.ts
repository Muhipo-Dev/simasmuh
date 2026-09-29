export function sortClasses<T extends { name?: string | null; gradeLevel?: number | string | null }>(classes: T[] = []): T[] {
  if (!Array.isArray(classes)) return [];

  const romanToNumber = (val: string): number => {
    const v = val.trim().toUpperCase();
    if (v === 'I') return 1;
    if (v === 'II') return 2;
    if (v === 'III') return 3;
    if (v === 'IV') return 4;
    if (v === 'V') return 5;
    if (v === 'VI') return 6;
    if (v === 'VII') return 7;
    if (v === 'VIII') return 8;
    if (v === 'IX') return 9;
    if (v === 'X') return 10;
    if (v === 'XI') return 11;
    if (v === 'XII') return 12;
    if (v === 'XIII') return 13;
    const num = parseInt(v, 10);
    return isNaN(num) ? 999 : num;
  };

  const getEffectiveGrade = (cls: T): number => {
    if (cls.gradeLevel !== undefined && cls.gradeLevel !== null && cls.gradeLevel !== '') {
      const num = typeof cls.gradeLevel === 'number' ? cls.gradeLevel : parseInt(String(cls.gradeLevel), 10);
      if (!isNaN(num) && num > 0) return num;
    }
    const name = cls.name || '';
    const match = name.match(/^(?:KELAS\s+)?(XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I|\d+)/i);
    if (match && match[1]) {
      return romanToNumber(match[1]);
    }
    return 999;
  };

  return [...classes].sort((a, b) => {
    const gradeA = getEffectiveGrade(a);
    const gradeB = getEffectiveGrade(b);
    if (gradeA !== gradeB) {
      return gradeA - gradeB;
    }
    return (a.name || '').localeCompare(b.name || '', undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  });
}
