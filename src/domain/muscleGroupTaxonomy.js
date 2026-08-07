export const CANONICAL_MUSCLE_GROUPS = Object.freeze([
  'Peito',
  'Costas',
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Quadríceps',
  'Posteriores',
  'Glúteos',
  'Panturrilhas',
  'Core',
  'Tibial',
  'Adutores',
  'Abdutores'
])

const aliases = new Map([
  ['peito', 'Peito'],
  ['costas', 'Costas'],
  ['ombro', 'Ombros'],
  ['ombros', 'Ombros'],
  ['biceps', 'Bíceps'],
  ['triceps', 'Tríceps'],
  ['quadriceps', 'Quadríceps'],
  ['perna', 'Quadríceps'],
  ['pernas', 'Quadríceps'],
  ['posterior', 'Posteriores'],
  ['posteriores', 'Posteriores'],
  ['gluteo', 'Glúteos'],
  ['gluteos', 'Glúteos'],
  ['panturrilha', 'Panturrilhas'],
  ['panturrilhas', 'Panturrilhas'],
  ['core', 'Core'],
  ['tibial', 'Tibial'],
  ['adutor', 'Adutores'],
  ['adutores', 'Adutores'],
  ['abdutor', 'Abdutores'],
  ['abdutores', 'Abdutores']
])

function key(value) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function normalizeMuscleGroup(value) {
  if (value == null || value === '') return null
  return aliases.get(key(value)) || null
}

export function isCanonicalMuscleGroup(value) {
  return CANONICAL_MUSCLE_GROUPS.includes(value)
}
