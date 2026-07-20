# RHC Design System — Performance Editorial

## 1. Princípios

1. **O treino é o protagonista.** A interface desaparece durante a ação e traz contexto apenas quando necessário.
2. **Hierarquia antes de decoração.** Escala, contraste e espaço organizam a tela; bordas e caixas são exceções.
3. **Densidade progressiva.** O resumo é leve. Detalhes aparecem sob demanda.
4. **Assimetria com intenção.** Métricas, ações e conteúdo não são forçados em grids idênticos.
5. **Movimento funcional.** Animações confirmam estado, navegação e progresso; nunca atrasam o usuário.
6. **Dados são permanentes.** Mudanças visuais ou de configuração nunca alteram o histórico concluído.

## 2. Identidade

O RHC usa uma estética `performance editorial`: preto quente, branco suave, verde elétrico pontual e cores funcionais contidas. A marca não usa gradientes genéricos nem brilho constante.

### Cores

| Token | Valor | Uso |
|---|---:|---|
| `canvas` | `#08090A` | Fundo principal |
| `canvas-raised` | `#0D0F11` | Navegação e áreas elevadas |
| `surface` | `#141619` | Controles e módulos funcionais |
| `surface-hover` | `#1A1D21` | Hover/seleção discreta |
| `line` | `#272A2F` | Divisores |
| `text` | `#F5F7F2` | Títulos e valores |
| `muted` | `#92979F` | Texto secundário |
| `quiet` | `#62676F` | Metadados |
| `signal` | `#C8FF3D` | Ação principal e progresso |
| `signal-ink` | `#111400` | Texto sobre signal |
| `info` | `#74C7FF` | Informação e agenda |
| `warning` | `#FFB55E` | Atenção |
| `danger` | `#FF6B70` | Erro e ação destrutiva |

O `signal` ocupa no máximo 10% da tela. Verde não é cor de superfície genérica.

## 3. Tipografia

- Família: `SF Pro Display / Inter / ui-sans-serif`.
- Display: 40–56px, peso 760, tracking `-0.045em`.
- Título de página: 32–40px, peso 740, tracking `-0.035em`.
- Título de seção: 18–22px, peso 680.
- Corpo: 14–16px, peso 450, line-height 1.55.
- Label: 11–12px, peso 650, caixa alta e tracking `0.12em`.
- Números usam `tabular-nums`.

## 4. Espaçamento e forma

- Escala base: `4, 8, 12, 16, 24, 32, 48, 64, 96`.
- Ritmo vertical de página: 32px no mobile, 48px no desktop.
- Controle: raio 12px.
- Superfície: raio 18px.
- Destaque editorial: raio 28px.
- Pills apenas para status ou seleção compacta.
- Sombras são raras; separação padrão usa contraste de superfície e uma linha de 1px.

## 5. Componentes

- **Page Header:** kicker curto, título forte, descrição limitada a 52 caracteres por linha.
- **Primary Action:** bloco signal, sem gradiente, altura mínima 48px.
- **Secondary Action:** transparente com linha; ghost para ações de baixa prioridade.
- **Panel:** superfície funcional para formulários e gráficos. Não usar para cada métrica.
- **Metric:** valor grande + label, preferencialmente em fluxo aberto com divisores.
- **List Row:** unidade padrão para histórico, perfis e configurações.
- **Navigation Dock:** flutuante no mobile, compacta e translúcida, com um único item ativo.
- **Status:** ponto + texto; badges somente quando a informação precisa de contorno.
- **Form Field:** label acima, fundo sólido, foco signal de 2px, erro persistente abaixo.

## 6. Estados

- `hover`: elevação de luminância e deslocamento máximo de 1px.
- `active`: escala `0.985` por 100ms.
- `focus-visible`: anel de 2px `signal`, offset de 3px.
- `disabled`: 45% de opacidade, sem movimento.
- `loading`: skeleton discreto, nunca layout pulando.
- `success`, `warning`, `error`: faixa lateral colorida + texto; não preencher toda a superfície.
- `empty`: mensagem editorial, uma ação possível, sem ilustração genérica obrigatória.

## 7. Movimento

- Rápido: 120ms (`press`, toggle).
- Padrão: 180ms (`hover`, foco, expansão curta).
- Estrutural: 280ms (`drawer`, troca de seção).
- Curva: `cubic-bezier(.2,.8,.2,1)`.
- Entrada de página: opacidade + 8px vertical, 280ms.
- Respeitar `prefers-reduced-motion` integralmente.

## 8. Acessibilidade

- Alvos de toque com no mínimo 44px.
- Contraste AA para texto e controles.
- Estado nunca comunicado somente por cor.
- Foco sempre visível.
- Labels persistentes nos formulários.
- Navegação e métricas mantêm ordem lógica no leitor de tela.

## 9. Composição por contexto

- **Treino:** uma ação dominante, progresso próximo, detalhes recolhidos.
- **Evolução:** momento atual primeiro, tendência comparável depois, conquistas e detalhes por último.
- Comparações temporais devem sempre explicitar o período de referência.
- Conquistas são derivadas de dados reais, incluem estados bloqueado/desbloqueado e nunca substituem a leitura de desempenho.
- Em gráficos, apenas uma série recebe `signal`; séries secundárias usam cores funcionais e grades silenciosas.
- **Administração:** lista e comandos; sem aparência de dashboard corporativo.
- **Histórico:** timeline, filtros recolhíveis e metadados silenciosos.
- **Autenticação:** marca e promessa à esquerda/alto; formulário simples e isolado.

## 10. Arquitetura responsiva

- **Mobile (`< 1024px`):** fluxo vertical, dock inferior, uma decisão dominante por viewport.
- **Desktop (`>= 1024px`):** navegação lateral fixa, canvas fluido de até 1440px e grade de 12 colunas.
- Desktop nunca é uma coluna mobile centralizada ou apenas ampliada.
- O início distribui treino, ritmo, métricas e atalhos em áreas simultâneas; o mobile reordena as mesmas áreas por prioridade.
- Módulos principais podem ocupar 7–8 colunas; contexto e métricas usam 4–5 colunas.
- Em telas ultrawide, margens preservam leitura, mas o conteúdo útil deve ocupar entre 70% e 85% do viewport.
