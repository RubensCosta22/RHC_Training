const ex = (name, muscleGroup, reps='12', sets=3) => ({ name, muscleGroup, sets, reps, rest:60, goal:'Ganho de massa muscular', alternatives:[], active:true })

export const requestedPlans = {
  Karol: {
    schedule:{0:'A',1:'B',2:'C',3:null,4:'D',5:'A',6:'E'},
    plans:[
      {workout_type:'A',title:'Glúteos isolado',exercises:[ex('Elevação pélvica','Glúteos'),ex('Coice na polia','Glúteos'),ex('Abdução na polia','Glúteos'),ex('Levantamento terra sumô','Glúteos'),ex('Abdução','Glúteos')]},
      {workout_type:'B',title:'Peito, bíceps e ombro',exercises:[ex('Supino reto','Peito'),ex('Voador peitoral','Peito'),ex('Rosca na polia','Bíceps'),ex('Rosca martelo','Bíceps'),ex('Elevação lateral','Ombro'),ex('Desenvolvimento com halter','Ombro'),ex('Esteira','Cardio','10 min',1)]},
      {workout_type:'C',title:'Glúteos e posterior',exercises:[ex('Búlgaro','Glúteos'),ex('Abdução','Glúteos'),ex('Coice na polia','Glúteos'),ex('Mesa flexora','Posterior'),ex('Cadeira flexora','Posterior'),ex('Stiff','Posterior')]},
      {workout_type:'D',title:'Quadríceps',exercises:[ex('Agachamento taça','Quadríceps'),ex('Hack','Quadríceps'),ex('Leg press','Quadríceps'),ex('Extensora','Quadríceps'),ex('Adução','Adutores'),ex('Panturrilha','Panturrilha','12-20')]},
      {workout_type:'E',title:'Tríceps e costas',exercises:[ex('Puxada','Costas'),ex('Remada','Costas'),ex('Remada curvada','Costas'),ex('Pulley','Tríceps'),ex('Corda','Tríceps')]}
    ]
  },
  Rudney: {
    schedule:{0:'A',1:'B',2:'A',3:null,4:'C',5:'A',6:'B'},
    plans:[
      {workout_type:'A',title:'Peito, bíceps e ombro',exercises:[ex('Supino inclinado','Peito'),ex('Supino reto deitado','Peito'),ex('Voador peitoral (peck deck)','Peito'),ex('Rosca Scott','Bíceps'),ex('Rosca na barra','Bíceps'),ex('Desenvolvimento com halter','Ombro')]},
      {workout_type:'B',title:'Pernas',exercises:[ex('Hack','Pernas'),ex('Leg press','Pernas'),ex('Extensora','Quadríceps'),ex('Adução','Adutores'),ex('Cadeira flexora','Posterior'),ex('Panturrilha sentado','Panturrilha','12-20')]},
      {workout_type:'C',title:'Tríceps e costas',exercises:[ex('Puxador costas','Costas'),ex('Puxador frente','Costas'),ex('Remada baixa','Costas'),ex('Pulley','Tríceps'),ex('Corda','Tríceps'),ex('Esteira','Cardio','10 min',1)]}
    ]
  }
}
