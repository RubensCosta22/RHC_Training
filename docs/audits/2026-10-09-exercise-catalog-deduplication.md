# Consolidação do catálogo de exercícios — confirmação do usuário (2026-10-09)

**Escopo:** mapeamento de IDs do banco de produção, somente leitura. NÃO foram alterados IDs, registros históricos, planos ou exposições. Preparar e testar migração na branch antes de qualquer aplicação no Supabase ativo.

## Unificações confirmadas

| Nome canônico proposto | Alias / ID de origem | ID canônico | Histórico origem + destino | Exposições origem + destino |
|---|---|---|---|---|
| Cadeira flexora | Flexora `074b9cf7-9f6a-4d25-b1ec-7e9c87c9cb0e` | `53b81d94-b3e4-429d-bd46-f24cf9d6ccfd` | 10 + 2 | 10 + 0 |
| Cadeira extensora | Extensora `97c70cb5-2d17-44c8-b82b-08cd0209f2d7` | `72654ccf-112f-4a44-b3d8-be08859f9135` | 12 + 2 | 12 + 0 |
| Panturrilha máquina em pé | Panturrilha `e84f4a7f-1895-4b80-830c-67858ec32d15` | `af282883-f6a3-41bb-a180-c791da2e197c` | 13 + 3 | 11 + 3 |
| Elevação lateral na máquina | Elevação lateral máquina `a6d05784-5bc4-44e8-a4bc-a9f76c55f08e` | `af9d8e05-4e24-40fe-82e1-9ad99d9e9247` | 4 + 8 | 4 + 8 |
| Panturrilha sentado | Panturrilha sentada `da83c85c-0c2c-4c34-9797-8a890d43119f` | `a12db86a-0a1a-4a3d-a0b8-d5bfb84c0e9c` | 1 + 5 | 1 + 5 |
| Peck deck inverso | Peck Deck invertido `8b3dc86a-d82d-47cc-b047-75b716ae02d7` | `a504c687-b842-4905-b8b5-ff8f7d4cb16b` | 0 + 2 | 0 + 2 |
| Face Pull | Face Pull na corda `b5b387e7-2766-49e7-8a9f-3884706a2d20` | `2e8b488e-6452-42ad-8fbd-e6755dd809ac` | 0 + 10 | 0 + 10 |
| Elevação lateral com halteres | Elevação lateral `9224b4a8-7ff7-4e72-b220-f7e4faebd03e` | `23da68d7-a64a-4c81-89a6-fcf00ac0fbe8` | 10 + 0 | 7 + 0 |

**Esclarecimento do usuário:** Elevação lateral (sem qualificativo), com carga de referência de 10 kg, é feita com halteres, **não** na máquina. Histórico de halteres e máquina deve permanecer separado.

## Regras para implementação

- Manter o histórico de carga por variação canônica, jamais unir halteres e máquina.
- Reapontar vínculos por IDs explícitos somente após inventário de todas as chaves estrangeiras, índices únicos e referências textuais.
- Preservar snapshots originais, séries, cargas, datas e RPE; não somar sessões nem calcular cargas novas.
- Manter trilha de alias original e testes de regressão que confirmem contagens e ausência de perda/duplicação.
- Outras variações (flexora deitada, flexora unilateral, extensora articulada/unilateral, panturrilha sentada, leg press unilateral) **não** são parte desses merges.
- Nomes equivalentes `Crucifixo inverso na polia` / `Crucifixo inverso no cabo` e `Crunch na polia` / `Crunch no cabo` ainda aguardam confirmação.
- Nunca executar diretamente no banco ativo durante a auditoria; migração revisada, testada e aprovada separadamente.
