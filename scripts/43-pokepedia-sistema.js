        // =====================================================================
        // 43-pokepedia-sistema.js — POKÉPÉDIA: conteúdo da aba Sistema
        // =====================================================================
        // Os textos de mecânica da Poképédia oficial (idlepokemoon.com.br/
        // pokepedia/sistemas/*), reunidos como DADO estruturado — números,
        // fórmulas e tabelas fiéis à fonte (extraídos 2026-09-08). Sem DOM: é
        // uma lista de seções que o 41 desenha. Cada seção tem blocos, cada
        // bloco um título e linhas (texto puro ou "rótulo|valor" pra virar
        // tabela de duas colunas).
        // =====================================================================

        const PP_SISTEMA = [
            {
                id: 'combate', rot: 'Combate', icone: '⚔️',
                resumo: 'Como o dano é calculado na caçada e os multiplicadores.',
                blocos: [
                    { h: 'Fórmula de dano', linhas: [
                        'dano = poder do golpe × (seu ataque ÷ defesa do alvo) × vantagem de tipo × mesmo tipo × escala de nível × variação',
                        'Dano mínimo: 1 · Variação: 0,90 a 1,05'
                    ] },
                    { h: 'Multiplicadores', tabela: [
                        ['Mesmo tipo (STAB)', '×1,5'], ['Super eficaz', '×1,65'],
                        ['Dupla fraqueza', '×2,72'], ['Pouco eficaz', '×0,5'],
                        ['Dupla resistência', '×0,25'], ['Crítico', '×2 (chance 6,25%)'],
                        ['Selvagem atacando', '×1,5'], ['Shiny', '×1,2 (todos atributos e vida)'],
                        ['Clã', '+4% ou +8%']
                    ] },
                    { h: 'Diferença de nível', linhas: [
                        'Alvo acima: −1,5% dano causado e +1,5% dano recebido POR nível',
                        'Piso do dano causado: 20% · Dano recebido: sem limite'
                    ] },
                    { h: 'Velocidade', linhas: [
                        'Divide a recarga dos golpes e o intervalo entre ataques',
                        'Piso de recarga: 0,75s · Piso de intervalo: 0,5s · Intervalo base: 2,5s'
                    ] },
                    { h: 'Outros', linhas: [
                        'Golpes de apoio duram 1 hora, no máximo ×2,2',
                        'Física vs Especial é decidido pelo TIPO do golpe',
                        'Batalha por turno (Ginásio/PvP) usa regime diferente'
                    ] }
                ]
            },
            {
                id: 'golpes', rot: 'Golpes', icone: '💥',
                resumo: 'Categorias, recarga, STAB e regras de TM.',
                blocos: [
                    { h: 'Categorias', linhas: [
                        'Físicos: usam Ataque vs Defesa do alvo',
                        'Especiais: usam Atq. Especial vs Def. Especial do alvo',
                        'Status: dormir, envenenar, curar, mudar atributos'
                    ] },
                    { h: 'Quantos golpes', linhas: [
                        'Caçada: automática — o pokémon usa todos os desbloqueados por nível',
                        'Ginásio/PvP: você escolhe 4 golpes por pokémon'
                    ] },
                    { h: 'Recarga e PP', linhas: [
                        'Recarga na caçada: 1,60s a 2,50s (inverso ao poder)',
                        'Intervalo mínimo entre ataques: 1s · PP só existe em batalha de turno'
                    ] },
                    { h: 'STAB e TM', linhas: [
                        'STAB: ×1,5 quando o golpe é do mesmo tipo do pokémon',
                        'TM/HM adiciona golpe não aprendido naturalmente',
                        'Desde 12/08/2026 o golpe de TM vale também na caçada',
                        'TM tier SS (poder 225) é prêmio de Chefe Lendário'
                    ] },
                    { h: 'Números', tabela: [
                        ['Poder natural', '20 a 200'], ['Especiais criados', '150'],
                        ['Tier SS', '225'], ['Precisão dos criados', '100%']
                    ] }
                ]
            },
            {
                id: 'growth', rot: 'Qualidade & Growth', icone: '🌱',
                resumo: 'A raridade e as 6 notas que cada pokémon ganha ao nascer.',
                blocos: [
                    { h: 'Qualidade (raridade)', linhas: [
                        'Multiplicador geral dos atributos, em 7 faixas:'
                    ], tabela: [
                        ['Fraca', 'abaixo de 1,00'], ['Comum', '1,00'], ['Incomum', '1,10'],
                        ['Rara', '1,30'], ['Épica', '1,50'], ['Lendária', '1,70'], ['Mítica', '2,00']
                    ] },
                    { h: 'Growth', linhas: [
                        '6 notas separadas (Vida, Ataque, Defesa, Atq.Esp, Def.Esp, Velocidade)',
                        'Cada nota vai de 1 a 32 · cada ponto soma +2 na base do atributo'
                    ] },
                    { h: 'Fórmula de poder', linhas: [
                        'Atributo = (base da espécie + 2 × nota do Growth) × nível ÷ 100 × Qualidade [× 1,2 se shiny] + 10',
                        'A Qualidade entra duas vezes, então amplifica muito os raros'
                    ] },
                    { h: 'Peso do Growth', linhas: [
                        'Base baixa (Diglett): até 6,2× entre nota 1 e 32',
                        'Base alta (Mewtwo): só 1,4× entre nota 1 e 32'
                    ] }
                ]
            },
            {
                id: 'natures', rot: 'Natures', icone: '🧭',
                resumo: 'Sobe 10% de um atributo, desce 10% de outro. HP nunca é afetado.',
                blocos: [
                    { h: '25 naturezas (20 ativas + 5 neutras)', tabela: [
                        ['Lonely', '+Ataque / −Defesa'], ['Brave', '+Ataque / −Velocidade'],
                        ['Adamant', '+Ataque / −Atq.Esp'], ['Naughty', '+Ataque / −Def.Esp'],
                        ['Bold', '+Defesa / −Ataque'], ['Relaxed', '+Defesa / −Velocidade'],
                        ['Impish', '+Defesa / −Atq.Esp'], ['Lax', '+Defesa / −Def.Esp'],
                        ['Timid', '+Velocidade / −Ataque'], ['Hasty', '+Velocidade / −Defesa'],
                        ['Jolly', '+Velocidade / −Atq.Esp'], ['Naive', '+Velocidade / −Def.Esp'],
                        ['Modest', '+Atq.Esp / −Ataque'], ['Mild', '+Atq.Esp / −Defesa'],
                        ['Quiet', '+Atq.Esp / −Velocidade'], ['Rash', '+Atq.Esp / −Def.Esp'],
                        ['Calm', '+Def.Esp / −Ataque'], ['Gentle', '+Def.Esp / −Defesa'],
                        ['Sassy', '+Def.Esp / −Velocidade'], ['Careful', '+Def.Esp / −Atq.Esp'],
                        ['Hardy · Docile · Serious · Bashful · Quirky', 'neutras']
                    ] },
                    { h: 'Regra', linhas: ['HP nunca é afetado por nenhuma nature.'] }
                ]
            },
            {
                id: 'habilidades', rot: 'Habilidades', icone: '✨',
                resumo: 'Efeito passivo permanente. Uma por pokémon.',
                blocos: [
                    { h: 'O que são', linhas: [
                        'Efeito passivo o tempo todo, sem gastar turno nem ocupar slot de golpe',
                        'Cada pokémon tem 1 habilidade · 164 no total (gen 5), 144 ativas em algum motor'
                    ] },
                    { h: 'Obter e trocar', linhas: [
                        'Revelação inicial: grátis, dá a habilidade canônica da espécie',
                        'Espécie com duas canônicas: sorteia entre as duas',
                        'Ocultas: só saem no giro (as mais raras)',
                        'Giro de troca: 5.000.000 + 50 stones'
                    ] },
                    { h: 'Por motor', tabela: [
                        ['Caçada', 'tempo contínuo, sem turnos'],
                        ['Ginásio', 'por turno, status completo'],
                        ['Boss', 'por turno, chefe imune a status/debuff'],
                        ['Indicadores', '✅ completo · ⚠️ em parte · ⛔ nada']
                    ] }
                ]
            },
            {
                id: 'pergaminho', rot: 'Pergaminho de IV', icone: '📜',
                resumo: 'Regira a nota de um atributo. Só 2 atributos por pokémon, pra sempre.',
                blocos: [
                    { h: 'Regra', linhas: [
                        'Cada pokémon nasce com nota 1 a 32 em cada um dos 6 atributos',
                        'No máximo 2 atributos DIFERENTES girados na vida inteira',
                        'Os outros 4 ficam definitivos — nenhum Pergaminho encosta neles',
                        'Você vê o resultado antes de decidir (confirma com Ficar)'
                    ] },
                    { h: 'Chances da roleta', tabela: [
                        ['1 a 10', '35%'], ['11 a 16', '30%'], ['17 a 22', '20%'],
                        ['23 a 28', '10%'], ['29 a 31', '4%'], ['32', '1%']
                    ] },
                    { h: 'Custo', linhas: [
                        'Consome o item ao girar · a vaga de reuso só se gasta ao confirmar',
                        'Fonte: exclusivamente Chefes Lendários'
                    ] }
                ]
            },
            {
                id: 'boost', rot: 'Boost', icone: '⬆️',
                resumo: '+1 nível efetivo de força e vida por boost, até +100.',
                blocos: [
                    { h: 'Como funciona', linhas: [
                        'Cada boost dá +1 nível efetivo de força e vida, até +100',
                        'Golpe não entra: o boost não libera ataques mais cedo'
                    ] },
                    { h: 'Custo por faixa', tabela: [
                        ['+1 a +25', 'grátis (0 💎)'], ['+26 a +100', '1 💎 por nível'],
                        ['Gold', '1.000.000 a 5.000.000 por faixa'], ['Stones', '1-2 até 9-10 por faixa']
                    ] },
                    { h: 'Total +0 → +100', tabela: [
                        ['Diamantes', '75 💎'], ['Gold', '300.000.000'], ['Stones', '550']
                    ] }
                ]
            },
            {
                id: 'ginasio', rot: 'Ginásio', icone: '🥊',
                resumo: '18 líderes, 6 faixas. Tudo em nível 100.',
                blocos: [
                    { h: 'Estrutura', linhas: [
                        '18 líderes em 6 faixas de 3 · cada líder tem tipo temático e insígnia',
                        'Progressão linear: só passa de faixa vencendo todos da atual'
                    ] },
                    { h: 'Requisitos', linhas: [
                        'Pokémon nível 100 (piso) · treinador no nível da faixa (100/200/300/400/500/600)',
                        'Time até 6, sem repetir espécie · Ditto proibido (inclusive shiny)',
                        'Sem custo, tentativas ilimitadas'
                    ] },
                    { h: 'Batalha', tabela: [
                        ['Nível', 'ambos em 100'], ['Vantagem de tipo', '×2 (×4 dupla)'],
                        ['STAB', '×1,5'], ['Crítico', '6,25% · ×1,5'], ['Multiplicador geral', '×1,75']
                    ] },
                    { h: 'Recompensas', linhas: [
                        '1ª vitória por líder: insígnia + 5 Chaves de Boss + 2 Pergaminhos + TM',
                        'Fechar os 18: 15 Chaves de Boss + 5 Pergaminhos'
                    ] },
                    { h: 'Bônus das insígnias', tabela: [
                        ['Chave de Boss', '+2% por insígnia (+36% com 18)'],
                        ['TM', '×1,05 por insígnia (multiplicativo)']
                    ] }
                ]
            },
            {
                id: 'clas', rot: 'Clãs', icone: '🛡️',
                resumo: '9 clãs por afinidade de tipo. +8%/+4% força e velocidade.',
                blocos: [
                    { h: 'Regras', linhas: [
                        '9 grupos fixos (diferente de guilda) · nível 80 pra entrar/trocar',
                        'Primeira escolha grátis · trocar custa 10 💎',
                        'Com pokémon ativo do tipo do clã: +8% força e +8% velocidade',
                        'Sem tipo correspondente: +4% e +4% · não empilha (muda de patamar)'
                    ] },
                    { h: 'Os 9 clãs', tabela: [
                        ['Seavell', 'Água, Gelo'], ['Naturia', 'Planta, Inseto, Venenoso'],
                        ['Volcanic', 'Fogo'], ['Wingeon', 'Voador, Dragão'],
                        ['Raibolt', 'Elétrico'], ['Orebound', 'Pedra, Terra, Aço'],
                        ['Malefic', 'Fantasma, Sombrio, Venenoso'], ['Gardestrike', 'Lutador, Normal'],
                        ['Psycraft', 'Psíquico, Fada']
                    ] }
                ]
            },
            {
                id: 'guildas', rot: 'Guildas', icone: '🤝',
                resumo: 'Criadas por jogadores. Até 25, +1% XP por nível (máx +40%).',
                blocos: [
                    { h: 'Criação', linhas: [
                        'Fundar custa 10 💎, sem requisito de nível · nome até 24 letras',
                        'TAG de 2-4 caracteres · limite 25 vagas'
                    ] },
                    { h: 'Cargos', tabela: [
                        ['Líder', 'transfere, dissolve, muda cargos'],
                        ['Oficial', 'convida, expulsa, brasão e TAG'],
                        ['Membro', 'sem permissões']
                    ] },
                    { h: 'Benefícios e níveis', linhas: [
                        '+1% de XP por nível da guilda (máx +40% no nível 40)',
                        'TAG colorida, brasão próprio, rankings de poder e nível',
                        'Progressão do nível 1 ao 40 por contribuição cumulativa'
                    ] },
                    { h: 'Contribuição', tabela: [
                        ['Caçar', '1 ponto / 1.200.000 XP'], ['Shiny', '5.000 pontos'],
                        ['Boss diário', '200 (derrota) / 400 (vitória)'],
                        ['Doações semanais', 'até 10.000.000 gold ou 10 💎 por membro']
                    ] }
                ]
            }
        ];
