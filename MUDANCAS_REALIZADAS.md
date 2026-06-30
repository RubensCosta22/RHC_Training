# Mudanças realizadas

Base usada: `meu_treino_GPT.zip`.

## Visual aproveitado do Gemini

- Tema visual em verde/emerald com gradiente.
- Header fixo com nome do app, status Online/Offline e selo de segurança.
- Cards com destaque visual e brilho suave.
- Dashboard mais direto para uso mobile.
- Botões maiores e mais fáceis de tocar durante o treino.

## Pontos fracos corrigidos

1. **Troca de exercício funcional**
   - As alternativas agora são botões clicáveis.
   - O exercício escolhido substitui o original no registro salvo.
   - O botão “Ver execução” pesquisa no YouTube o exercício selecionado.

2. **Progressão automática melhorada**
   - Adicionado campo “Reps feitas”.
   - A sugestão de aumento agora considera se atingiu o limite máximo da faixa de repetições.
   - Em caso de dor ou dificuldade, a sugestão passa a orientar manter ou reduzir.

3. **Dashboard com atalhos completos**
   - Treino A, B e C em destaque.
   - Botões diretos para Histórico, Evolução, Medidas e Fotos.

4. **PWA melhorado**
   - Adicionados ícones PNG 192x192 e 512x512.
   - Mantido SVG maskable.

5. **Banco atualizado**
   - Adicionada coluna `actual_reps` em `workout_exercises`.
   - O SQL inclui `alter table ... add column if not exists` para compatibilidade com quem já executou uma versão anterior.

6. **Exportação atualizada**
   - CSV e JSON passam a incluir reps feitas.

## Validação

- `npm install` executado com sucesso.
- `npm run build` executado com sucesso.
- O build gerou apenas aviso de chunk grande, comum por conta de Recharts/Supabase em bundle único. Não bloqueia deploy.
