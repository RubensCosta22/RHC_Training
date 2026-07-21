# Execução Inteligente — PR #38

Este módulo conecta o Motor de Programas à experiência de treino sem alterar o fluxo tradicional enquanto não houver programa ativo para o perfil.

## Princípios

- RPE é registrado por exposição e nunca substitui carga ou repetições.
- Sugestões de progressão são explicáveis e precisam de confirmação do usuário.
- Falha isolada mantém a carga; regressão só é sugerida após o limite configurado.
- Substituições mantêm o padrão de movimento e possuem baseline/carga próprios.
- O timer usa o descanso prescrito pelo programa, mantendo controles manuais.
- Dados do programa são opcionais nas sessões legadas.

## Persistência

A migration `20260721170000_smart_execution.sql` cria `program_exercise_exposures`. Nenhuma sessão histórica é alterada. Cada exposição guarda carga, repetições por série, RPE, variação escolhida e a sugestão calculada para a próxima exposição.

## Compatibilidade

Sem enrollment ativo, o treino continua funcionando exatamente no modo tradicional.