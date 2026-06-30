const defaults = {
  upper: { sets: 3, reps: '8–12', rest: 90, goal: 'Força com controle técnico' },
  isolation: { sets: 3, reps: '10–15', rest: 60, goal: 'Controle e definição' },
  lower: { sets: 4, reps: '8–12', rest: 90, goal: 'Força e volume muscular' },
  core: { sets: 3, reps: '30–60s', rest: 45, goal: 'Estabilidade e resistência' },
  cardio: { sets: 1, reps: '15–25 min', rest: 0, goal: 'Condicionamento e gasto calórico' }
}

function ex(name, muscleGroup, config, alternatives = []) {
  return { id: name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-'), name, muscleGroup, ...config, alternatives }
}

export const profilesSeed = [
  {
    name: 'Henrique',
    age: 29,
    gender: 'homem',
    goal: 'Emagrecer e ganhar força',
    avatar_url: 'H'
  },
  {
    name: 'Nicole',
    age: 20,
    gender: 'mulher',
    goal: 'Emagrecer e definir',
    avatar_url: 'N'
  }
]

export const workouts = {
  Henrique: {
    A: {
      title: 'Peito, ombro e tríceps',
      exercises: [
        ex('Supino reto', 'Peito', { ...defaults.upper, sets: 4, reps: '6–10' }, ['Supino máquina', 'Supino com halteres', 'Flexão']),
        ex('Supino inclinado', 'Peito', defaults.upper, ['Crucifixo inclinado', 'Supino inclinado com halteres', 'Peck deck']),
        ex('Desenvolvimento de ombro', 'Ombro', { ...defaults.upper, reps: '8–10' }, ['Máquina de ombro', 'Arnold press', 'Desenvolvimento com halteres']),
        ex('Elevação lateral', 'Ombro', defaults.isolation, ['Elevação lateral no cabo', 'Máquina lateral', 'Elevação unilateral']),
        ex('Tríceps corda', 'Tríceps', defaults.isolation, ['Tríceps barra V', 'Tríceps testa', 'Mergulho']),
        ex('Prancha abdominal', 'Core', defaults.core, ['Crunch', 'Abdominal máquina', 'Abdominal infra'])
      ]
    },
    B: {
      title: 'Costas e bíceps',
      exercises: [
        ex('Puxada frente', 'Costas', defaults.upper, ['Barra assistida', 'Puxada neutra', 'Puxada articulada']),
        ex('Remada baixa', 'Costas', defaults.upper, ['Remada máquina', 'Remada cavalinho', 'Remada no cabo']),
        ex('Remada unilateral', 'Costas', defaults.upper, ['Remada serrote', 'Remada máquina unilateral', 'Remada apoiada']),
        ex('Pulldown', 'Costas', defaults.isolation, ['Pullover máquina', 'Pullover halter', 'Pulldown corda']),
        ex('Rosca direta', 'Bíceps', defaults.isolation, ['Rosca barra W', 'Rosca no cabo', 'Rosca máquina']),
        ex('Rosca martelo', 'Bíceps', defaults.isolation, ['Rosca alternada', 'Rosca corda', 'Rosca concentrada'])
      ]
    },
    C: {
      title: 'Pernas e core',
      exercises: [
        ex('Agachamento livre', 'Pernas', { ...defaults.lower, reps: '6–10' }, ['Agachamento smith', 'Hack machine', 'Goblet squat']),
        ex('Leg press', 'Pernas', defaults.lower, ['Hack machine', 'Agachamento smith', 'Passada']),
        ex('Cadeira extensora', 'Quadríceps', defaults.isolation, ['Sissy squat', 'Extensora unilateral', 'Agachamento búlgaro']),
        ex('Mesa flexora', 'Posterior', defaults.isolation, ['Cadeira flexora', 'Stiff', 'Flexora unilateral']),
        ex('Panturrilha', 'Panturrilha', { ...defaults.isolation, reps: '12–20' }, ['Panturrilha em pé', 'Panturrilha sentado', 'Panturrilha no leg']),
        ex('Abdominal infra', 'Core', defaults.core, ['Prancha', 'Elevação de pernas', 'Crunch reverso'])
      ]
    }
  },
  Nicole: {
    A: {
      title: 'Pernas e glúteos',
      exercises: [
        ex('Leg press', 'Pernas', defaults.lower, ['Hack machine', 'Agachamento smith', 'Passada']),
        ex('Cadeira extensora', 'Quadríceps', defaults.isolation, ['Extensora unilateral', 'Agachamento búlgaro', 'Sissy squat']),
        ex('Elevação pélvica', 'Glúteos', defaults.lower, ['Hip thrust máquina', 'Ponte glútea', 'Elevação pélvica unilateral']),
        ex('Cadeira abdutora', 'Glúteos', defaults.isolation, ['Abdução no cabo', 'Abdução elástico', 'Abdutora inclinada']),
        ex('Mesa flexora', 'Posterior', defaults.isolation, ['Cadeira flexora', 'Flexora unilateral', 'Stiff leve']),
        ex('Panturrilha', 'Panturrilha', { ...defaults.isolation, reps: '12–20' }, ['Panturrilha em pé', 'Panturrilha sentado', 'Panturrilha no leg'])
      ]
    },
    B: {
      title: 'Superiores e core',
      exercises: [
        ex('Puxada frente', 'Costas', defaults.upper, ['Puxada neutra', 'Barra assistida', 'Puxada articulada']),
        ex('Remada baixa', 'Costas', defaults.upper, ['Remada máquina', 'Remada apoiada', 'Remada unilateral']),
        ex('Supino máquina', 'Peito', defaults.upper, ['Supino halteres', 'Flexão inclinada', 'Peck deck']),
        ex('Desenvolvimento de ombro', 'Ombro', defaults.upper, ['Máquina de ombro', 'Elevação frontal', 'Desenvolvimento halteres']),
        ex('Tríceps corda', 'Tríceps', defaults.isolation, ['Tríceps barra V', 'Tríceps banco', 'Tríceps testa']),
        ex('Prancha abdominal', 'Core', defaults.core, ['Abdominal máquina', 'Crunch', 'Abdominal infra'])
      ]
    },
    C: {
      title: 'Glúteos, posterior e cardio',
      exercises: [
        ex('Stiff', 'Posterior', defaults.lower, ['Levantamento terra romeno', 'Stiff halteres', 'Good morning leve']),
        ex('Elevação pélvica', 'Glúteos', defaults.lower, ['Hip thrust máquina', 'Ponte glútea', 'Elevação pélvica unilateral']),
        ex('Afundo', 'Pernas', defaults.lower, ['Passada', 'Afundo smith', 'Afundo búlgaro']),
        ex('Cadeira flexora', 'Posterior', defaults.isolation, ['Mesa flexora', 'Flexora unilateral', 'Stiff leve']),
        ex('Abdutora', 'Glúteos', defaults.isolation, ['Cadeira abdutora', 'Abdução no cabo', 'Abdução elástico']),
        ex('Cardio final', 'Cardio', defaults.cardio, ['Esteira inclinada', 'Bike', 'Elíptico'])
      ]
    }
  }
}

export function getWorkout(profileName, type) {
  return workouts[profileName]?.[type]
}
