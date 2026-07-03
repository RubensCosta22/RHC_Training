const defaults = {
  upper: { sets: 3, reps: '8–12', rest: 90, goal: 'Força com controle técnico' },
  isolation: { sets: 3, reps: '10–15', rest: 60, goal: 'Controle e definição' },
  lower: { sets: 4, reps: '8–12', rest: 90, goal: 'Força e volume muscular' },
  core: { sets: 3, reps: '30–60s', rest: 45, goal: 'Estabilidade e resistência' },
  cardio: { sets: 1, reps: '15–25 min', rest: 0, goal: 'Condicionamento e gasto calórico' }
}

function ex(name, muscleGroup, config, alternatives = []) {
  return {
    id: name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-'),
    name,
    muscleGroup,
    ...config,
    alternatives
  }
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
  },
  {
    name: 'Rudney',
    age: 29,
    gender: 'homem',
    goal: 'Emagrecer, ganhar força e melhorar condicionamento',
    avatar_url: 'R'
  }
]

const henriqueWorkouts = {
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
  },
  D: {
    title: 'Força Funcional e Cadeia Posterior',
    description: 'Fortalecimento para corrida, ganho de força, estabilidade de joelhos e quadril.',
    exercises: [
      ex('Levantamento Terra Romeno', 'Posterior', { ...defaults.lower, sets: 4, reps: '6–8', rest: 120, goal: 'Força de posterior e cadeia posterior' }, ['Stiff', 'Terra com halteres', 'Smith Machine']),
      ex('Hip Thrust', 'Glúteos', { ...defaults.lower, sets: 4, reps: '8–12', rest: 90, goal: 'Força de glúteos e quadril' }, ['Ponte com barra', 'Glute Bridge', 'Máquina Glúteo']),
      ex('Afundo Caminhando', 'Pernas', { ...defaults.lower, sets: 3, reps: '10 cada perna', rest: 90, goal: 'Estabilidade unilateral e força funcional' }, ['Passada', 'Afundo Smith', 'Bulgarian Split Squat']),
      ex('Mesa Flexora', 'Posterior', { ...defaults.isolation, sets: 3, reps: '12', rest: 60, goal: 'Fortalecimento de posteriores' }, ['Flexora sentado', 'Flexora em pé', 'Nordic Curl']),
      ex('Panturrilha em Pé', 'Panturrilha', { ...defaults.isolation, sets: 4, reps: '15–20', rest: 45, goal: 'Resistência e força de panturrilha para corrida' }, ['Panturrilha Leg Press', 'Panturrilha Sentado', 'Panturrilha unilateral']),
      ex('Caminhada Lateral com Mini Band', 'Glúteos', { ...defaults.isolation, sets: 3, reps: '15 passos para cada lado', rest: 45, goal: 'Ativação de glúteo médio e estabilidade de quadril' }, ['Monster Walk', 'Abdução Máquina']),
      ex('Prancha Lateral', 'Core', { ...defaults.core, sets: 3, reps: '30–45 segundos', rest: 45, goal: 'Estabilidade lateral de tronco' }, ['Side Plank', 'Pallof Press'])
    ]
  },
  E: {
    title: 'Condicionamento e Corrida',
    description: 'Melhorar condicionamento, emagrecimento e desempenho na corrida.',
    exercises: [
      ex('Step-Up no Banco', 'Pernas', { ...defaults.lower, sets: 3, reps: '12 cada perna', rest: 60, goal: 'Força unilateral e estabilidade para corrida' }, ['Caixa baixa', 'Escada']),
      ex('Kettlebell Swing', 'Posterior', { ...defaults.cardio, sets: 3, reps: '15', rest: 60, goal: 'Potência de quadril e condicionamento' }, ['Pull Through', 'Hip Hinge com halteres']),
      ex('Farmer Walk', 'Core', { ...defaults.upper, sets: 4, reps: '30 metros', rest: 60, goal: 'Pegada, core e estabilidade corporal' }, ['Trap Bar Carry', 'Halteres']),
      ex('Remo Ergômetro', 'Cardio', { ...defaults.cardio, sets: 1, reps: '8 minutos', rest: 0, goal: 'Condicionamento cardiovascular' }, ['Bike', 'Elíptico']),
      ex('Corrida Intervalada', 'Cardio', { ...defaults.cardio, sets: 1, reps: '10–20 minutos', rest: 0, goal: 'Emagrecimento e melhora do desempenho na corrida' }, ['Bike HIIT', 'Elíptico Intervalado']),
      ex('Tibial Raise', 'Tibial', { ...defaults.isolation, sets: 3, reps: '20', rest: 45, goal: 'Fortalecimento do tibial anterior e prevenção de canelite' }, ['Máquina Tibial', 'Faixa Elástica']),
      ex('Mobilidade', 'Mobilidade', { ...defaults.core, sets: 1, reps: '5–10 minutos', rest: 0, goal: 'Mobilidade de quadril, tornozelo, panturrilha e posterior de coxa' }, ['Mobilidade de quadril', 'Mobilidade de tornozelo', 'Alongamento de posterior'])
    ]
  }
}
const rudneyWorkouts = {
  A: {
    title: 'Peito, ombro e tríceps',
    exercises: [
      ex('Supino Reto', 'Peito', { ...defaults.upper, sets: 3, reps: '8–12' }, ['Supino Máquina', 'Supino com halteres']),
      ex('Supino Inclinado', 'Peito', { ...defaults.upper, sets: 3, reps: '8–12' }, ['Supino inclinado máquina', 'Supino inclinado halteres']),
      ex('Supino Declinado', 'Peito', { ...defaults.upper, sets: 3, reps: '8–12' }, ['Peck Deck', 'Cross Over']),
      ex('Flexão de Ombros', 'Ombro', defaults.isolation, ['Desenvolvimento', 'Elevação lateral']),
      ex('Tríceps Polia', 'Tríceps', defaults.isolation, ['Tríceps corda', 'Tríceps barra']),
      ex('Tríceps Corda', 'Tríceps', defaults.isolation, ['Tríceps mergulho', 'Tríceps francês'])
    ]
  },
  B: {
    title: 'Costas e bíceps',
    exercises: [
      ex('Puxador Frente', 'Costas', defaults.upper, ['Puxador costas', 'Puxador convergente']),
      ex('Remada Baixa', 'Costas', defaults.upper, ['Remada com apoio', 'Remada articulada']),
      ex('Remada com Apoio', 'Costas', defaults.upper, ['Remada baixa', 'Remada unilateral']),
      ex('Graviton', 'Costas', defaults.upper, ['Barra fixa', 'Puxada frente']),
      ex('Rosca Direta', 'Bíceps', defaults.isolation, ['Rosca polia', 'Rosca convergente']),
      ex('Rosca Scott', 'Bíceps', defaults.isolation, ['Rosca direta', 'Rosca inversa'])
    ]
  },
  C: {
    title: 'Pernas e core',
    exercises: [
      ex('Leg Press Horizontal', 'Pernas', defaults.lower, ['Leg Press 45°', 'Leg Press Articulado', 'Leg Press 90°']),
      ex('Cadeira Extensora', 'Quadríceps', defaults.isolation, ['Agachamento guiado', 'Hack horizontal']),
      ex('Cadeira Flexora', 'Posterior', defaults.isolation, ['Mesa flexora', 'Flexão de joelho vertical']),
      ex('Cadeira Abdutora', 'Glúteos', defaults.isolation, ['Cadeira adutora', 'Abdução máquina']),
      ex('Stiff', 'Posterior', defaults.lower, ['Levantamento terra', 'Extensão de quadril']),
      ex('Flexão Plantar no Leg', 'Panturrilha', { ...defaults.isolation, reps: '12–20' }, ['Flexão plantar em pé'])
    ]
  }
}

export const workouts = {
  Henrique: henriqueWorkouts,
  Rudney: rudneyWorkouts,
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

export function getWorkoutTypes(profileName) {
  return Object.keys(workouts[profileName] || {})
}