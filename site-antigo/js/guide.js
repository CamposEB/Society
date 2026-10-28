/* ==========================================================================
   guide.js — catálogo de guias + página de leitura (MLBB Society)
   --------------------------------------------------------------
   - Cards e filtros são gerados a partir dos dados (uma única fonte da verdade)
   - Filtros: categoria, dificuldade, busca (com contadores por categoria)
   - "Leia o guia completo": abre a leitura sem mexer no location.hash
     (usa history.pushState, então não briga com as abas do app.js)
   - Botão voltar do navegador / Esc / botão "Voltar" funcionam
   - Índice com destaque da seção atual, barra de progresso, marcar como lido
   - Guias relacionados, anterior/próximo
   - Funciona mesmo se o HTML da view for injetado depois (MutationObserver)
   - Para forçar a inicialização manualmente: window.initGuide()
   ========================================================================== */
(() => {
  "use strict";

  // ─────────────────────────────────────────────────────────────
  // 0. CONSTANTES
  // ─────────────────────────────────────────────────────────────
  const STORAGE_KEY = "mlbbsociety:guides:read";

  const svg = (inner) =>
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    inner + "</svg>";

  const ICONS = {
    all:       svg('<path d="M4 6h16M4 12h16M4 18h10"/>'),
    basics:    svg('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z"/><path d="M8 7h8"/>'),
    heroes:    svg('<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/>'),
    lane:      svg('<path d="M5 3v18M5 5h12l-3 4 3 4H5"/>'),
    jungle:    svg('<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4 .2 1.2.8 2 1.6 2.3C10.2 8.5 10.8 5.5 12 3z"/>'),
    teamfight: svg('<circle cx="9" cy="8" r="3"/><path d="M3.5 19v-1.5A4.5 4.5 0 0 1 8 13h2a4.5 4.5 0 0 1 4.5 4.5V19M16 5.5a3 3 0 0 1 0 5.8M17 13h.5a3.5 3.5 0 0 1 3.5 3.5V19"/>'),
    macro:     svg('<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>'),
    ranked:    svg('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>'),
    book:      svg('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z"/>'),
  };

  const CATEGORIES = [
    { key: "all",       label: "Todos os guias" },
    { key: "basics",    label: "Fundamentos" },
    { key: "heroes",    label: "Heróis" },
    { key: "lane",      label: "Faixa" },
    { key: "jungle",    label: "Selva" },
    { key: "teamfight", label: "Luta em equipe" },
    { key: "macro",     label: "Macro" },
    { key: "ranked",    label: "Ranked" },
  ];
  const CAT_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));
  const DIFF_LABEL = { beginner: "Iniciante", intermediate: "Intermediário", advanced: "Avançado" };

  // ─────────────────────────────────────────────────────────────
  // 1. CONTEÚDO DOS GUIAS
  //    Ordem = trilha de aprendizado (usada em "anterior / próximo").
  //    sec(titulo, texto, callout?)  |  co(titulo, itens, tipo?)
  //    tipo do callout: "tip" (padrão) | "warn" | "terms" ("Termo — definição")
  // ─────────────────────────────────────────────────────────────
  const co = (title, items, kind) => ({ title, items, kind: kind || "tip" });
  const sec = (title, body, callout) => ({ title, body, callout: callout || null });
  const guide = (id, category, difficulty, time, title, subtitle, tips, sections, related) => ({
    id, category, difficulty, time, title, subtitle, tips, sections, related,
  });

  const GUIDES = [
    // ───────────────────────── FUNDAMENTOS ─────────────────────────
    guide(
      "guia-primeiros-passos", "basics", "beginner", "6 min",
      "Primeiros passos: tela, controles e configurações",
      "Entenda a interface, ajuste os controles ao seu dedo e saiba o que fazer nos primeiros minutos.",
      [
        "Treine no Modo Treinamento antes de jogar valendo",
        "Ajuste o tamanho e a posição dos botões para o seu polegar",
      ],
      [
        sec("Conhecendo a tela",
          "O joystick à esquerda move o herói. À direita ficam o ataque básico, as habilidades, a ultimate, os feitiços de batalha e o botão de voltar à base. No topo, o minimapa mostra torres, aliados e inimigos visíveis; o placar com abates, mortes e ouro completa o essencial.",
          co("O que olhar sempre", [
            "Minimapa: onde está cada aliado e quem sumiu de vista",
            "Recargas: suas habilidades e feitiços antes de entrar numa luta",
            "Vida e mana: voltar para base cedo vale mais do que morrer atoa",
            "Ouro: compre assim que puder — ouro parado não dá mais ataque nem da mais defesa",
          ])),
        sec("Configurações que fazem diferença",
          "Nas configurações, ajuste tamanho e posição dos botões e teste as opções de mira e de prioridade de alvo (por exemplo, focar o inimigo com menos vida). Prefira um FPS estável a gráficos no máximo: queda de frames custa mais lutas do que qualquer detalhe visual. Os nomes das opções mudam entre versões, então explore o menu com calma.",
          co("Checklist antes da partida", [
            "Botões confortáveis e sem sobreposição",
            "Conexão estável (Wi-Fi próximo ou dados com bom sinal)",
            "Notificações do celular silenciadas",
            "Emblema, build e feitiço já escolhidos",
          ])),
        sec("Treine antes de jogar valendo",
          "O Modo Treinamento serve para testar combos, alcance das habilidades e tempo de recarga. Depois, partidas normais ajudam a aprender o mapa e as rotas sem a pressão da ranked. Escolha dois ou três heróis e jogue só com eles por um tempo: conhecer poucos heróis bem supera conhecer muitos pela metade."),
        sec("Roteiro dos primeiros minutos",
          "Compre o item inicial da sua função, vá para a rota (ou selva) e farme os minions com último golpe. Perto dos 2 minutos, observe a Tartaruga e vá com o time se houver prioridade. Compre botas cedo e volte à base quando vida e mana estiverem baixas."),
      ],
      ["guia-classes-herois", "guia-emblemas-talentos", "guia-glossario"]
    ),

    guide(
      "guia-emblemas-talentos", "basics", "beginner", "7 min",
      "Emblemas e talentos: como escolher",
      "Escolha o conjunto, os atributos e o talento principal certos para cada função.",
      [
        "Comece pelo emblema da classe do herói e adapte",
        "O talento principal deve resolver o que sua função precisa",
      ],
      [
        sec("Como os emblemas funcionam",
          "Cada emblema dá atributos (dano, vida, velocidade e outros) e talentos que você desbloqueia ao subir de nível. O talento principal é o que mais muda o seu estilo de jogo. Existem conjuntos específicos por classe — Tank, Soldado, assassino, mago, atirador e suporte — e um conjunto comum, mais flexível."),
        sec("Escolhendo por função",
          "Comece pelo conjunto da classe do herói e depois ajuste. Um soldado que sofre na rota pode preferir talentos de recuperação; um mago de explosão prioriza penetração. Se o herói foge do padrão da classe, o conjunto comum costuma encaixar melhor.",
          co("Pontos de partida", [
            "Tank e suporte: vida, defesa e redução de recarga",
            "Soldado: equilíbrio entre dano e resistência",
            "Assassino: penetração e mobilidade para explodir alvos frágeis",
            "Mago: dano mágico e penetração mágica",
            "Atirador: velocidade de ataque e dano físico",
          ])),
        sec("Emblema na selva",
          "Junglers costumam usar o talento que dá bônus contra monstros e objetivos, como o Caçador Experiente, que aumenta o dano à Tartaruga e ao Lord. Confirme a descrição atual do talento no jogo, porque os números mudam com os patches."),
        sec("Evolua com foco",
          "Suba primeiro os emblemas dos dois ou três heróis que você mais joga. Revise seus talentos depois de cada atualização grande — talentos são mexidos com frequência.",
          co("Erros comuns", [
            "Usar o mesmo emblema para todos os heróis sem pensar",
            "Ignorar o talento principal e olhar só os atributos",
            "Não revisar os talentos depois de um patch",
          ], "warn")),
      ],
      ["guia-primeiros-passos", "guia-itens-builds", "guia-feiticos"]
    ),

    guide(
      "guia-itens-builds", "basics", "intermediate", "10 min",
      "Itens e builds: monte e adapte",
      "Saiba como estruturar sua build, responder aos inimigos e acertar o tempo de cada compra.",
      [
        "Adapte pelo menos um ou dois itens ao time inimigo",
        "Volte à base com ouro para um item completo",
      ],
      [
        sec("Estrutura de uma build",
          "Uma build costuma ter botas, um ou dois itens principais de dano (ou de resistência, para Tanks), um item de utilidade e um defensivo. Priorize o item que resolve o seu problema atual: sustentação, explosão, defesa ou mobilidade. A build \"padrão\" é só o ponto de partida."),
        sec("Adaptando aos inimigos",
          "Leia o time adversário antes de cada compra. O que mais machuca o seu time agora? Responda a isso com o item certo em vez de repetir a mesma build em toda partida.",
          co("Respostas comuns", [
            "Muita cura inimiga: item de redução de cura (Alabarda dos mares,varinha brilhante e dominio de gelo.)",
            "Dano principalmente físico: mais armadura; principalmente mágico: mais resistência mágica",
            "Muito controle de grupo: botas de resistência a controle ou itens com escudo",
            "Assassinos no time inimigo: item defensivo, escudo ou mobilidade",
            "Inimigos com muita vida: item de dano baseado na vida do alvo (Caçadora/Lanterna dos desejos",
          ])),
        sec("Timing de compra",
          "Voltar à base com ouro suficiente para um item completo é melhor do que gastar tudo em itens pequenos. Aproveite para voltar logo depois de empurrar a onda ou limpar a selva, para não perder farm. Se o time vai lutar por um objetivo, compre antes de ir."),
        sec("Erros comuns",
          "O maior erro é teimar na build padrão ignorando a partida. Logo depois vêm deixar ouro parado e copiar build de jogador profissional sem considerar o patch atual — os itens são ajustados com frequência.",
          co("Evite", [
            "Ficar com muito ouro guardado em plena luta",
            "Não fazer o corta-cura quando o time inimigo tem muita cura",
            "Copiar uma build sem ler a descrição atual dos itens",
          ], "warn")),
      ],
      ["guia-emblemas-talentos", "guia-draft-counters", "guia-classes-herois"]
    ),

    guide(
      "guia-feiticos", "basics", "beginner", "6 min",
      "Feitiços de batalha: qual levar e quando usar",
      "Conheça os principais feitiços e escolha o seu antes de cada partida.",
      [
        "Retribuição é obrigatória para quem joga na selva",
        "Flash é o feitiço de escape e engajamento mais usado",
      ],
      [
        sec("Os principais feitiços",
          "Cada feitiço tem uma recarga longa, então o momento de usar faz parte do jogo. A lista disponível pode mudar com os patches; confira as descrições dentro do jogo.",
          co("Para que serve cada um", [
            "Flash (Tempo de Recarga 2 minutos.)— teleporte curto; serve para escapar ou engajar",
            "Caçar (Tempo de Recarga 35s)— acelera o farm e garante objetivos; exclusivo de junglers",
            "Purificar (Tempo de Recarga 90s)— remove controle e efeitos negativos; ótimo contra muito CC",
            "Avançar (Tempo de Recarga 100s) — +50% de velocidade de movimento por 6 segundos; perseguição e fuga",
            "Executar (Tempo de Recarga 90s)— causa dano REAL em alvos com pouca vida; comum em assassinos",
            "Petrificar (Tempo de Recarga 75s)— imobiliza inimigos próximos; engaja ou protege",
            "Teleporte (Tempo de Recarga 75s)— teletransporta até uma torre ou aliado; ajuda nas rotações",
            "Égide (Tempo de Recarga 75s)— escudo temporário; para quem aguenta pouco dano",
            "Vingança (Tempo de Recarga 75s)— devolve parte do dano recebido como dano mágico; comum em Tanks",
            "Inspirar (Tempo de Recarga 75s)— Aumento na velocidade de ataque; comum em atiradores e soldados",
            "Revitalizar (Tempo de Recarga 75s)— Invoca uma fonte de cura que envolve o herói e dura 4s; comum em tanks e soldados",
            "Tiro flamejante (Tempo de Recarga 50s)— Dispara um tiro de fogo em uma direção; comum em magos",
          ], "terms")),
        sec("Escolha por função",
          "Não existe feitiço certo para todos: pense no que o seu herói precisa para sobreviver ou matar.",
          co("Sugestões", [
            "Selva: Caçar (o de Gelo é a escolha segura)",
            "Soldado e Tank: Flash, Petrificar ou Vingança, conforme o herói",
            "Mago e atirador: Flash, Purificar, tiro flamejante ou executar.",
            "Suporte: Flash ou Purificar",
          ])),
        sec("Use na hora certa",
          "Rastreie a recarga do feitiço inimigo: sem o Flash, o alvo fica muito mais vulnerável. Evite gastar o Flash num abate arriscado e ficar sem escape para a luta seguinte.",
          co("Boa prática", [
            "Fale no chat rápido quando o feitiço inimigo estiver em recarga",
            "Guarde o Purificar para o controle que realmente decide a luta",
            "Não use Flash à toa — ele serve para perseguir ou sair vivo",
          ])),
      ],
      ["guia-primeiros-passos", "guia-rotacao-selva", "guia-posicionamento-5v5"]
    ),

    guide(
      "guia-glossario", "basics", "beginner", "5 min",
      "Glossário rápido de MLBB",
      "Os termos que você vai ouvir no chat e nos vídeos, explicados em uma linha.",
      [
        "Aprender os termos facilita entender calls e guias",
        "Use este glossário como consulta rápida durante os estudos",
      ],
      [
        sec("Termos de jogo",
          "Esses são os termos que mais aparecem durante uma partida.",
          co("Mecânica e mapa", [
            "Gank — emboscada de um herói em outra rota",
            "CC — controle de grupo: stun no inimigo.",
            "Poke — causar dano de longe sem entrar em luta",
            "Push — empurrar a onda de minions para a torre inimiga",
            "Freeze — manter a onda parada perto da sua torre",
            "Roam ou rotacionar — sair da rota para ajudar outras partes do mapa",
            "Split push — pressionar uma rota sozinho para dividir o inimigo",
            "Snowball — muitas vantagens acumuladas para um time só até o jogo ficar difícil de virar",
            "Dive — entrar na torre inimiga para matar alguém",
            "Sustain — capacidade de se recuperar (cura, roubo de vida)",
          ], "terms")),
        sec("Termos de equipe e rank",
          "Aparecem no draft, no chat e nas análises.",
          co("Time e partida", [
            "Draft — fase de escolha e bans de heróis",
            "Ban — impedir que um herói seja escolhido",
            "Counter — herói ou item que anula outro",
            "Meta — conjunto de heróis e estratégias mais fortes no momento",
            "Main — o herói que você mais joga",
            "Carry — jogador que carrega o dano do time",
            "Feed — morrer repetidamente e dar ouro ao inimigo",
            "Tilt — frustração que piora suas decisões",
            "KDA — abates, mortes e assistências",
          ], "terms")),
      ],
      ["guia-primeiros-passos", "guia-comunicacao", "guia-classes-herois"]
    ),

    // ───────────────────────── HERÓIS ─────────────────────────
    guide(
      "guia-classes-herois", "heroes", "beginner", "9 min",
      "Classes de heróis e como escolher seu main",
      "Conheça as seis classes e descubra qual combina com o seu estilo de jogo.",
      [
        "Escolha um herói principal e jogue até dominá-lo",
        "Pense em quem completa o time, não só no que você quer",
      ],
      [
        sec("As seis classes",
          "Os exemplos abaixo mostram heróis clássicos de cada classe. O desempenho de cada um muda a cada patch.",
          co("Classe e papel", [
            "Tank — absorve dano e inicia lutas (Khufra, Belerick, minotauro)",
            "Soldado — equilibra dano e resistência (Barats, Paquito, Yu zhong)",
            "Assassino — elimina alvos frágeis rapidamente (Lancelot, Gusion, Hayabusa)",
            "Mago — dano mágico e controle (Eudora, Kagura, Pharsa)",
            "Atirador — dano sustentado à distância (Layla, Claude, Bruno)",
            "Suporte — cura, escudo e utilidade (Floryn, Angela, Rafaela)",
          ], "terms")),
        sec("Qual combina com você",
          "Gosta de entrar primeiro na luta? Tank ou soldado. Prefere precisão e posicionamento? Mago ou atirador. Gosta de caçar alvos e decidir lutas rápido? Assassino. Gosta de ajudar o time a vencer? Suporte ou Tank."),
        sec("Classe não é função",
          "Classe é o tipo do herói; função é o papel na partida: rota EXP, rota do ouro, meio, selva e rotação. O mesmo herói pode servir em mais de uma função, mas muitos só funcionam bem em uma. Veja a tendência do patch antes de escolher fora do padrão."),
        sec("Monte sua pool de heróis",
          "Domine um herói por função para nunca ficar sem opção no draft. É melhor ser muito bom em poucos do que mediano em muitos.",
          co("Pool simples", [
            "1 herói principal que você domina",
            "2 reservas na mesma função",
            "1 curinga para cobrir o que o time precisar",
          ])),
      ],
      ["guia-draft-counters", "guia-primeiros-passos", "guia-subindo-elo"]
    ),

    guide(
      "guia-draft-counters", "heroes", "intermediate", "10 min",
      "Draft: composição, bans e counters",
      "Monte um time equilibrado e aprenda a responder aos picks inimigos.",
      [
        "Pense na composição, não só no seu herói",
        "Evite time sem frontline, sem controle ou com um só tipo de dano",
      ],
      [
        sec("Composição equilibrada",
          "Um time costuma precisar de frontline (tank ou soldado), dano físico e mágico variado, controle de grupo e alguém para iniciar. Times sem frontline ou com um só tipo de dano são fáceis de counterar.",
          co("Checklist de draft", [
            "Tem frontline para absorver dano?",
            "Tem engajamento e controle de grupo?",
            "Tem dano físico e mágico?",
            "Tem alguém forte no fim do jogo?",
          ])),
        sec("Bans e picks",
          "Nos bans, tire heróis que ameaçam o seu time ou que vocês não sabem enfrentar. Nos picks, quem escolhe por último tem vantagem de counter: escolha heróis flexíveis cedo e reserve os específicos para o final. A ordem exata depende do modo de jogo."),
        sec("Como counterar",
          "Em vez de decorar listas, pergunte: do que esse herói precisa para funcionar? Controle de grupo contra heróis que dependem de combo, corta-cura contra sustein, mobilidade contra heróis de alcance fixo, resistência contra o tipo de dano dominante."),
        sec("Quando o draft deu errado",
          "Sem frontline, jogue mais afastado e evite lutas longas. Sem dano, busque vantagem de mapa e objetivos. Se o inimigo escala melhor, force lutas antes do fim do jogo.",
          co("Plano B", [
            "Rotacione cedo para objetivos em que seu time tem vantagem",
            "Evite lutas em que o inimigo tem controle de área",
            "Aceite perder uma rota para ganhar outra",
          ])),
      ],
      ["guia-classes-herois", "guia-itens-builds", "guia-posicionamento-5v5"]
    ),

    // ───────────────────────── FAIXA ─────────────────────────
    guide(
      "guia-faixa-ondas", "lane", "beginner", "8 min",
      "Domínio da fase de faixa: controle de ondas",
      "Controle de ondas e negociação — domine sua rota desde o primeiro minuto.",
      [
        "Dê o último golpe só quando o minion estiver quase morrendo",
        "Congele perto da sua torre para forçar o inimigo a se expor",
      ],
      [
        sec("Os três tipos de onda",
          "Existem três estados de onda: slow push, fast push e congelada. Slow push acumula minions aos poucos, criando uma onda grande que empurra sozinha — útil antes de um objetivo. Fast push mata a onda rápido e força o oponente a farmar sob a torre. Congelar mantém a onda parada perto da sua torre, negando farm e experiência ao adversário.",
          co("Quando usar cada um", [
            "Slow push antes de um objetivo (Tartaruga ou Lord) para criar pressão enquanto você rotaciona",
            "Fast push quando precisa de tempo para comprar item ou ajudar na selva",
            "Congele quando estiver com vantagem de vida e mana e quiser punir o adversário",
          ])),
        sec("Como congelar corretamente",
          "Para congelar, a onda precisa ficar do seu lado do mapa, perto da sua torre, com alguns minions inimigos a mais que os seus (por exemplo, 4 contra 3). Você dá apenas o último golpe nos minions inimigos e evita atacar sem necessidade, para a onda não andar. O oponente fica sem opção segura de farm e, se avançar, o seu jungler ganha uma janela de gank.",
          co("Erros comuns", [
            "Empurrar a onda sem motivo e perder experiência para a torre",
            "Congelar sem visão do rio — vira alvo fácil de gank",
            "Atacar o oponente por cima da onda e levar dano dos minions de graça",
          ], "warn")),
        sec("Quando empurrar",
          "Empurrar é a jogada certa quando você quer: fazer o inimigo perder farm sob a torre; pressionar a estrutura para atrair rotações inimigas; ou garantir prioridade de rota para contestar um objetivo próximo, como a Tartaruga ou o Lorde. Regra prática: empurre antes de sair da rota para criar pressão e obrigar o adversário a responder à onda. Porém, evite avançar demais se estiver com pouca vida, sem visão dos inimigos ou sem saber a posição da equipe adversária."),
        sec("Prioridade de rota",
          "Ter prioridade significa que sua onda está empurrando e você pode sair sem perder farm. Só rotacione com prioridade: se a onda estiver vindo na sua direção, fique e farme. Aprender a ler \"quem tem prioridade agora\" é boa parte do macro da fase de rotas."),
      ],
      ["guia-gold-lane", "guia-exp-lane", "guia-macro-visao"]
    ),

    guide(
      "guia-gold-lane", "lane", "beginner", "8 min",
      "Domínio da Rota do Ouro: guia do atirador",
      "Posicionamento, farm eficiente e picos de poder do atirador.",
      [
        "Use o alcance para farmar sem se expor",
        "Cada morte cedo atrasa seu pico de poder",
      ],
      [
        sec("Entendendo a Rota do Ouro",
          "A Rota do Ouro é a rota lateral mais distante da Tartaruga, pensada para o atirador crescer com farm. Ele é a principal fonte de dano sustentado no fim do jogo, então o objetivo da rota é simples: farmar bem, morrer pouco e chegar forte nas lutas."),
        sec("Farm eficiente",
          "Farme sem se expor: use o alcance para dar último golpe de longe e fique atrás dos seus minions para o inimigo não acertar habilidades sem gastar recurso. Se você não vê o jungler inimigo, fique mais perto da torre.",
          co("Hábitos de bom atirador", [
            "Dê o último golpe com ataque básico sempre que possível",
            "Recue quando o minion inimigo estiver em maior número",
            "Olhe o minimapa a cada último golpe",
          ])),
        sec("Picos de poder",
          "Muitos atiradores ficam fortes com o primeiro item principal completo. Use esse momento para pressionar a torre ou contestar a Tartaruga com o time. Depois do terceiro item, o atirador vira a prioridade do time: fique atrás, ataque quem estiver mais perto e evite flanquear sozinho."),
        sec("Posicionamento em lutas",
          "Atire de longe, atrás do tank, e guarde seu escape para quando um assassino ou iniciador aparecer. Sobreviver à luta rende mais dano do que entrar para pegar um abate e morrer logo em seguida.",
          co("Evite", [
            "Entrar sozinho na linha inimiga para buscar um abate",
            "Gastar o escape antes da hora",
            "Ficar longe do time quando o inimigo está sumido",
          ], "warn")),
      ],
      ["guia-faixa-ondas", "guia-roaming", "guia-posicionamento-5v5"]
    ),

    guide(
      "guia-exp-lane", "lane", "intermediate", "9 min",
      "Dominação da Rota EXP: guia do soldado",
      "Confrontos 1v1, controle de onda, rotações e split push.",
      [
        "Olhe o matchup antes de qualquer troca",
        "Ajude o jungler na primeira Tartaruga: você é o mais próximo",
      ],
      [
        sec("O confronto 1v1",
          "A Rota EXP é a rota solo mais próxima da Tartaruga. Vencer o 1v1 abre espaço para o time inteiro. Antes de trocar golpes, olhe o matchup: se você ganha o 1v1, pressione; se perde, congele perto da torre e espere ajuda do jungler."),
        sec("Controle de onda na EXP",
          "A onda define quem tem prioridade. Se está ganhando, empurre e crie pressão. Se está perdendo, congele e negue farm. Nunca empurre sem visão do rio — é a receita para um gank duplo."),
        sec("Rotações e split push",
          "Como laner solo, você pode dividir o mapa no meio e fim de jogo. O split push força o time inimigo a gastar recursos defendendo enquanto seu time pega objetivos. Só faça isso com escape garantido e olhando o minimapa.",
          co("Antes de dar split push", [
            "Confirme onde está a maior parte do time inimigo",
            "Tenha escape ou mobilidade para sair",
            "Combine com o time: vocês têm um objetivo para pegar enquanto o inimigo defende?",
          ])),
      ],
      ["guia-faixa-ondas", "guia-rotacao-selva", "guia-objetivos"]
    ),

    guide(
      "guia-mid-lane", "lane", "intermediate", "12 min",
      "Controle da Rota do Meio: guia do mago",
      "Limpeza de onda, roaming, objetivos de rio e combos de explosão.",
      [
        "Posicione a habilidade para pegar todos os minions de uma vez",
        "Só saia da rota com prioridade",
      ],
      [
        sec("Limpeza de onda",
          "A rota do meio é a mais curta do mapa: as ondas colidem mais rápido, então a velocidade de limpeza é a habilidade mais importante do mago. Posicione suas habilidades para atingir o maior número de minions possível e economize mana usando ataques básicos quando não precisa de pressa."),
        sec("Timing de roaming",
          "Depois de limpar a onda, você tem duas opções: ir ao rio ajudar na Tartaruga ou rotacionar para uma rota lateral. Sempre faça isso com prioridade; se a onda estiver vindo na sua direção, fique e farme.",
          co("Sinais de que é hora de rotacionar", [
            "Sua onda acabou de ser limpa e a do inimigo está a caminho da torre dele",
            "O jungler aliado está perto do objetivo",
            "Você tem suas habilidades de controle prontas",
          ])),
        sec("Combos de explosão",
          "Cada mago tem um combo-base. Treine no Modo Treinamento até virar reflexo: a ordem das habilidades e o tempo entre elas decidem se o alvo morre ou escapa. Combos rápidos separam magos bons de magos ótimos."),
      ],
      ["guia-rotacao-selva", "guia-macro-visao", "guia-posicionamento-5v5"]
    ),

    // ───────────────────────── SELVA ─────────────────────────
    guide(
      "guia-rotacao-selva", "jungle", "intermediate", "12 min",
      "Guia de rotação da selva",
      "Caminhos de farm, janelas de gank e controle de objetivos para junglers.",
      [
        "Retribuição de Gelo é o padrão seguro para começar",
        "Só gankeie quando seu aliado puder aproveitar a jogada",
      ],
      [
        sec("Preparação pré-jogo",
          "Sua build e seu feitiço definem os primeiros 5 minutos. A Retribuição de Gelo funciona em qualquer composição. A de Chamas favorece duelistas 1v1. A Sangrenta ajuda junglers tanks que precisam de sustentação. No emblema, o Caçador Experiente (bônus contra a Tartaruga e o Lord) é quase obrigatório.",
          co("Estratégia de selva", [
  "Início de jogo: compre as botas e selecione a bênção da Retribuição adequada ao seu estilo de jogo. Priorize eliminar os monstros da selva para ganhar ouro, experiência e evoluir rapidamente.",
  "Durante a partida: farme os acampamentos com eficiência, aproveite oportunidades de gank e utilize a Retribuição para disputar objetivos como a Tartaruga e o Lorde.",
  "Fim de jogo: mantenha a Retribuição para contestar objetivos importantes. Adapte sua rota entre farm, ganks e invasões conforme a situação da partida, evitando deixar recursos da selva disponíveis para o inimigo."
])),
        sec("Rota inicial: buff azul ou vermelho?",
          "O buff azul reduz recarga e ajuda na mana; o vermelho dá dano e lentidão. Heróis que dependem de habilidades costumam começar no azul; heróis de ataque básico, no vermelho. Pense também no lado em que você vai gankar primeiro: chegue com o buff que sua rota precisa."),
        sec("Farm entre os ganks",
          "Um jungler forte não fica parado. Limpe os acampamentos em ordem, passe pelos pontos onde o inimigo pode aparecer e volte a farmar assim que um gank terminar. Deixar monstros sem coletar é atrasar seus itens."),
        sec("Janelas de gank",
          "Ganking não é sair por aí. Existem momentos de ouro: quando o adversário empurrou a onda e está longe da torre; quando seu laner tem controle pronto; quando o inimigo gastou o escape. Antes de ir, veja a vida do aliado — se está muito baixo, vira uma troca ruim.",
          co("Antes de gankar", [
            "Seu aliado tem controle ou dano para aproveitar a jogada?",
            "O inimigo está além da posição segura?",
            "Você sabe onde está o jungler adversário?",
          ])),
        sec("Objetivos: Tartaruga e Lord",
          "A Tartaruga aparece cedo e o Lord, mais tarde; os horários exatos e as recompensas podem mudar entre versões, então confira no jogo. Conteste sempre que tiver prioridade de rota. Se o time inimigo está em maior número, não force: use a Retribuição para tentar roubar o objetivo ou pressione outra parte do mapa."),
      ],
      ["guia-objetivos", "guia-macro-visao", "guia-mid-lane"]
    ),

    // ───────────────────────── LUTA EM EQUIPE ─────────────────────────
    guide(
      "guia-iniciar-lutas", "teamfight", "intermediate", "8 min",
      "Quando lutar e quando evitar",
      "Decida se a luta vale a pena antes de apertar o primeiro botão.",
      [
        "Conte vantagem numérica e recargas antes de iniciar",
        "Lutas perto de objetivos valem mais que lutas em lugares aleatórios",
      ],
      [
        sec("Leia a situação",
          "Antes de entrar, pergunte: quantos de nós estão aqui? Quantos deles estão visíveis? Quem tem ultimate e escape prontos? Uma luta 4v5 em que o inimigo tem o iniciador sem recarga raramente termina bem.",
          co("Checklist rápido", [
            "Todos os aliados estão por perto?",
            "As habilidades principais (suas e inimigas) estão prontas?",
            "Existe um objetivo em jogo para valer o risco?",
          ])),
        sec("Quem inicia e como",
          "O iniciador abre a luta com controle de grupo ou posicionamento; os outros entram em seguida, sem esperar demais. Se ninguém seguir o iniciador, ele morre sozinho. Combine de quem é essa função antes de a luta começar."),
        sec("Evitando lutas ruins",
          "Recuar a tempo é uma decisão de macro, não covardia. Se faltam aliados, se você está sem recarga ou se o inimigo está com vantagem de nível, troque a luta por outro objetivo no mapa.",
          co("Sinais de alerta", [
            "Aliados espalhados pelo mapa",
            "Inimigo com muita vantagem de itens",
            "Seu atirador ou mago principal está fora de posição",
          ], "warn")),
      ],
      ["guia-posicionamento-5v5", "guia-comunicacao", "guia-objetivos"]
    ),

    guide(
      "guia-posicionamento-5v5", "teamfight", "advanced", "12 min",
      "Posicionamento em lutas 5v5",
      "Vença lutas em equipe com posicionamento, prioridade de alvo e timing de habilidade.",
      [
        "Cada função tem sua zona na luta: respeite-a",
        "Guarde o controle para quem vai iniciar ou escapar",
      ],
      [
        sec("Posições por função",
  "Tanks ficam na frente, iniciando lutas e absorvendo controle. Soldados flanqueiam ou mergulham na linha de trás inimiga. Magos e atiradores ficam em posições seguras, atacando de longe. Suportes ficam perto dos aliados que precisam de proteção. O jungler alterna entre flanquear, eliminar alvos prioritários e garantir objetivos como a Tartaruga e o Lorde, aproveitando oportunidades sem se expor desnecessariamente. Violar esse posicionamento é um erro comum em elos baixos: tank se escondendo, atirador se expondo, mago avançando sozinho e jungler iniciando lutas sem apoio.",
  co("Formação ideal", [
    "Frontline: Tank ou Soldado, responsáveis por iniciar e proteger o espaço da equipe",
    "Flancos: Selva ou Soldado, buscando oportunidades para eliminar alvos frágeis",
    "Meio: Mago de controle e Suporte, ajudando a controlar a luta e proteger os aliados",
    "Backline: Atirador, causando dano sustentado de uma posição segura",
    "Objetivos: Selva preparado para usar a Retribuição na Tartaruga e no Lorde"
  ])
),
        sec("Prioridade de alvo",
          "Foque nesta ordem: carries inimigos mal posicionados; heróis com pouca vida e sem escape; suportes de cura se o time inimigo depende deles. Não gaste dano em Tanks no começo — eles aguentam e atrapalham seu foco."),
        sec("Timing de habilidade",
          "Muitas lutas se perdem por habilidade usada na hora errada. Guarde o controle para quem vai iniciar — não gaste no primeiro herói que aparecer. Ataque o carry inimigo depois que ele usar o escape. Espere o Tank inimigo gastar a ultimate antes de avançar a sua backline. Contar as recargas das habilidades-chave dos inimigos é o que separa elos altos de elos médios."),
        sec("Foque em ganhar, não em matar",
          "Quando a luta começa, o objetivo é ganhar a luta — seja matando, seja forçando o recuo. Uma luta 5v4 em que o inimigo desiste vale mais que uma troca cheia de abates. Aprenda a recuar quando a luta virou e reorganize em torno do próximo objetivo."),
      ],
      ["guia-iniciar-lutas", "guia-roaming", "guia-macro-visao"]
    ),

    // ───────────────────────── MACRO ─────────────────────────
    guide(
      "guia-macro-visao", "macro", "intermediate", "10 min",
      "Consciência de mapa e controle de visão",
      "Domine a leitura do minimapa, o rastreamento do inimigo e a visão nos arbustos.",
      [
        "Olhe o minimapa a cada poucos segundos, até virar reflexo",
        "Sempre saiba onde está o jungler inimigo",
      ],
      [
        sec("Hábito de checar o minimapa",
          "O minimapa é a ferramenta mais subestimada do MLBB. Muitos jogadores só olham quando morrem. Treine o hábito de olhar a cada poucos segundos, mesmo durante o farm — por exemplo, a cada último golpe. Em uma semana vira reflexo.",
          co("Exercício prático", [
            "Olhe o minimapa a cada último golpe, sem parar de farmar",
            "Antes de cada luta, confirme onde está o jungler inimigo",
            "Antes de empurrar uma torre, conte quantos inimigos você não vê",
          ])),
        sec("Rastreando o jungler inimigo",
          "O jungler inimigo é a maior ameaça em quase toda fase. Sempre que ele aparecer, memorize o lado. Quando sumir, pergunte: foi para o buff azul? Para o Lord? Para a sua rota? Uma boa leitura do jungler evita a maior parte das mortes evitáveis."),
        sec("Visão nos arbustos",
          "No MLBB: a visão vem de posicionamento. Cheque os arbustos antes de entrar, jogue perto de aliados e use habilidades que revelam o mapa quando o seu herói tiver. O time que vê o inimigo primeiro costuma decidir a luta.",
          co("Boas práticas", [
            "Não entre sozinho em arbusto desconhecido em fase de gank",
            "Avise o time quando um inimigo importante sumir do mapa",
            "Use o chat rápido para sinalizar objetivos e perigos",
          ])),
      ],
      ["guia-rotacao-selva", "guia-roaming", "guia-posicionamento-5v5"]
    ),

    guide(
      "guia-objetivos", "macro", "intermediate", "10 min",
      "Objetivos: Tartaruga, Lord e torres",
      "Saiba o que priorizar, quando contestar e como converter vantagem em partida ganha.",
      [
        "Empurre a onda antes de ir para o objetivo",
        "Troque objetivos quando o inimigo contesta um deles",
      ],
      [
        sec("Por que objetivos decidem partidas",
          "Matar heróis não ganha o jogo — derrubar a base ganha. Objetivos como a Tartaruga e o Lord dão ouro, experiência ou ajudam a pressionar as torres. Os horários de aparição e as recompensas mudam entre versões do jogo, então confirme os valores atuais dentro da partida."),
        sec("Tartaruga",
          "Aparece cedo e dá ouro e experiência ao time. É o primeiro grande motivo de luta no mapa. Conteste quando tiver prioridade de rota, quando o inimigo estiver distraído em outra rota ou depois de ganhar uma troca de abates.",
          co("Antes da Tartaruga", [
            "Empurre a onda da sua rota para não perder farm",
            "Veja se o inimigo tem visão da área",
            "Combine quem vai roubar (Retribuição) e quem protege",
          ])),
        sec("Lord",
          "O Lord aparece mais tarde e, ao ser derrotado, ajuda o time a pressionar uma rota. Uma luta pelo Lord costuma ser decisiva: só vá com o time unido, vida alta e recargas prontas. Depois de pegar, use a vantagem imediatamente para derrubar torres — não perca tempo."),
        sec("Torres e troca de objetivos",
          "Derrubar torres abre o mapa e dá ouro. Se o inimigo contesta um objetivo, considere trocar: pegar outro objetivo ou torre enquanto eles lutam pode valer mais que forçar uma luta ruim.",
          co("Evite", [
            "Dar dive em torre com a onda inimiga a favor deles",
            "Lutar pelo Lord com o time espalhado",
            "Esquecer de empurrar a onda antes de rotacionar",
          ], "warn")),
      ],
      ["guia-rotacao-selva", "guia-roaming", "guia-iniciar-lutas"]
    ),

    guide(
      "guia-roaming", "macro", "advanced", "12 min",
      "Guia completo de roaming",
      "Bênçãos, rotações, visão, peel e timing de engajamento.",
      [
        "Sua primeira compra: botas com uma bênção de roaming",
        "Saber peelar o carry é tão importante quanto iniciar",
      ],
      [
        sec("Bênçãos de roaming",
  "Compre botas e ative a habilidade de roaming ao cumprir os requisitos necessários. Escolha a bênção conforme a função do seu herói e a estratégia da equipe. Durante o início da partida, evite disputar o último golpe dos minions com seus aliados enquanto o efeito de roaming estiver ativo, para não prejudicar a distribuição de ouro da equipe.",
  co("Bênçãos por função", [
    "Ocultação: ideal para tanks iniciadores, como Tigreal e Khufra, facilitando aproximações e emboscadas.",
    "Favor: recomendado para suportes que curam ou restauram a vida dos aliados, como Estes e Rafaela.",
    "Incentivo: indicado para fortalecer aliados próximos e aumentar sua capacidade de combate.",
    "Golpe Direto: útil para causar dano adicional e finalizar inimigos com pouca vida."
  ])
),
        sec("Rotação inteligente",
          "O roamer não tem rota fixa. Você segue o jungler nos primeiros minutos, ajuda na Tartaruga e depois cobre a rota mais vulnerável. Olhe o minimapa o tempo todo: se a rota do ouro está sob pressão, vá para lá; se o meio está empurrando, ajude na selva."),
        sec("Peel: a arte de salvar",
          "Peel é ficar entre o carry e quem quer matá-lo. Isso inclui usar controle no assassino, dar escudo ao carry ou simplesmente ficar na frente. Saber a diferença entre \"iniciar a luta\" e \"peelar o carry\" separa suportes de elo alto dos de elo baixo.",
          co("Evite", [
            "Iniciar luta sem o time por perto",
            "Gastar o controle no primeiro herói que aparecer",
            "Ficar longe do carry quando um assassino está no mapa",
          ], "warn")),
      ],
      ["guia-posicionamento-5v5", "guia-objetivos", "guia-macro-visao"]
    ),

    // ───────────────────────── RANKED ─────────────────────────
    guide(
      "guia-comunicacao", "ranked", "intermediate", "7 min",
      "Comunicação e trabalho em equipe",
      "Use o chat rápido e os sinais do jogo para coordenar o time sem criar atrito.",
      [
        "Seja curto, claro e útil — uma informação por mensagem",
        "Silencie jogadores tóxicos e foque na partida",
      ],
      [
        sec("Sinais e chat rápido",
          "Os sinais e mensagens rápidas resolvem a maior parte da comunicação: avisar que um inimigo sumiu, sinalizar objetivo, pedir ajuda, pedir para reunir. Eles são mais rápidos que digitar e ninguém precisa parar de jogar para entender.",
          co("O que vale avisar", [
            "Inimigo importante sumiu do mapa",
            "Recarga de feitiço ou ultimate inimiga",
            "Quando você vai rotacionar ou voltar à base",
          ])),
        sec("Como falar com o time",
          "Prefira frases de ação, como \"vamos Tartaruga\" ou \"cuidado, jungler no meio\", em vez de críticas. Evite culpar alguém no chat: isso só gera discussão, tilt e pior desempenho de todo o time."),
        sec("Quando alguém é tóxico",
          "Silencie o jogador, ignore e volte a se concentrar no jogo. Use as ferramentas de denúncia depois da partida, não durante. Seu foco é o próximo objetivo — não discutir.",
          co("Em vez de discutir", [
            "Silencie o jogador e siga jogando",
            "Proponha um plano simples para o objetivo seguinte",
            "Denuncie depois da partida",
          ])),
      ],
      ["guia-iniciar-lutas", "guia-glossario", "guia-subindo-elo"]
    ),

    guide(
      "guia-subindo-elo", "ranked", "beginner", "9 min",
      "Subindo de elo: hábitos e mentalidade",
      "Hábitos simples que fazem diferença para quem quer subir na ranked.",
      [
        "Jogue poucos heróis e conheça bem cada um",
        "Pare de jogar quando estiver irritado",
      ],
      [
        sec("Foco em consistência",
          "Quem sobe de elo não é quem joga só com os melhores heróis do patch: é quem erra menos. Escolha uma pool pequena, jogue com regularidade e evite trocar de herói a cada derrota. A consistência vence a sorte no longo prazo.",
          co("Hábitos de quem sobe", [
            "Pool pequena de heróis dominados",
            "Olhar o minimapa o tempo todo",
            "Aprender com as mortes, não só com os abates",
            "Jogar com a mente tranquila",
          ])),
        sec("Controle o tilt",
          "Tilt é a frustração que faz você jogar pior. Depois de duas ou três derrotas seguidas, pare e faça uma pausa. Jogar irritado derruba o desempenho e costuma gerar mais derrotas — é a forma mais rápida de perder estrelas."),
        sec("Metas realistas",
          "Defina metas pequenas: morrer menos, melhorar o farm, chegar às lutas junto com o time. Subir elo vem como consequência desses hábitos. Evite medir tudo só pelo resultado da partida — uma derrota em que você jogou bem também ensina.",
          co("Metas simples", [
            "Menos de uma morte por minuto de partida",
            "Conferir o minimapa a cada último golpe",
            "Pedir ajuda ou sinalizar antes de entrar em luta",
          ])),
        sec("Analise suas partidas",
          "Reveja seus replays de vez em quando. Procure o motivo das suas mortes: foi falta de visão, entrada sozinho, falta de escape? Anote um erro por partida e trabalhe nele nas próximas. É assim que o aprendizado se acumula.",
          co("Perguntas para o replay", [
            "Por que eu morri?",
            "Eu sabia onde estava o jungler inimigo?",
            "Eu podia ter evitado essa luta?",
          ])),
      ],
      ["guia-comunicacao", "guia-classes-herois", "guia-macro-visao"]
    ),
  ];

  const BY_ID = new Map(GUIDES.map((g) => [g.id, g]));

  // ─────────────────────────────────────────────────────────────
  // 2. UTILITÁRIOS
  // ─────────────────────────────────────────────────────────────
  const normalize = (s) =>
    String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = String(text);
    return n;
  };

  const iconNode = (key, cls) => {
    const s = el("span", cls);
    s.setAttribute("aria-hidden", "true");
    s.innerHTML = ICONS[key] || "";
    return s;
  };

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  const truncate = (text, max) => {
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,.;:]$/, "") + "…";
  };

  const tipCount = (g) =>
    g.sections.reduce((sum, s) => sum + (s.callout ? s.callout.items.length : 0), 0);

  GUIDES.forEach((g) => {
    g.searchText = normalize(
      [g.title, g.subtitle, CAT_LABEL[g.category], DIFF_LABEL[g.difficulty], g.tips.join(" ")]
        .concat(g.sections.map((s) =>
          [s.title, s.body, s.callout ? s.callout.title + " " + s.callout.items.join(" ") : ""].join(" ")
        ))
        .join(" ")
    );
  });

  // Progresso de leitura (localStorage com fallback seguro)
  const readStore = {
    load() {
      try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        return new Set(Array.isArray(raw) ? raw : []);
      } catch (_) { return new Set(); }
    },
    save(set) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...set])); } catch (_) { /* ignora */ }
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 3. ESTADO
  // ─────────────────────────────────────────────────────────────
  let ui = null;                       // referências do DOM atual
  const state = { category: "all", difficulty: "all", query: "" };
  const readSet = readStore.load();
  let globalsBound = false;

  // ─────────────────────────────────────────────────────────────
  // 4. LISTA: FILTROS E CARDS
  // ─────────────────────────────────────────────────────────────
  function buildFilters() {
    ui.filtersEl.replaceChildren();
    CATEGORIES.forEach((c) => {
      const btn = el("button", "guide-filter" + (c.key === state.category ? " is-active" : ""));
      btn.type = "button";
      btn.dataset.filter = c.key;
      if (c.key !== "all") btn.dataset.category = c.key;
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", String(c.key === state.category));
      btn.append(iconNode(c.key, "guide-filter-icon"), el("span", null, c.label));
      const count = el("span", "guide-filter-count", "0");
      btn.append(count);
      ui.filterCounts.set(c.key, count);
      ui.filterBtns.push(btn);
      ui.filtersEl.append(btn);
    });
  }

  function buildCard(g) {
    const card = el("article", "guide-card");
    card.dataset.id = g.id;
    card.dataset.category = g.category;
    card.dataset.difficulty = g.difficulty;

    const head = el("header", "guide-card-head");
    const cat = el("span", "guide-card-category");
    cat.append(iconNode(g.category, "guide-card-icon"), el("span", null, CAT_LABEL[g.category]));
    const badges = el("span", "guide-card-badges");
    const diff = el("span", "guide-card-difficulty", DIFF_LABEL[g.difficulty]);
    diff.dataset.difficulty = g.difficulty;
    badges.append(diff, el("span", "guide-card-time", g.time));
    head.append(cat, badges);

    const first = g.sections[0];
    const section = el("section", "guide-card-section");
    section.append(
      el("h3", "guide-card-section-title", first.title),
      el("p", "guide-card-body", truncate(first.body, 170))
    );
    const tips = el("ul", "guide-card-tips");
    g.tips.forEach((t) => tips.append(el("li", null, t)));
    section.append(tips);

    const foot = el("footer", "guide-card-foot");
    const row = el("div", "guide-card-foot-row");
    const meta = el("span", "guide-card-meta");
    meta.insertAdjacentHTML("beforeend", ICONS.book);
    meta.append(document.createTextNode(g.sections.length + " seções · " + tipCount(g) + " dicas"));
    const read = el("span", "guide-card-read", "✓ Lido");
    row.append(meta, read);
    const cta = el("button", "guide-card-cta", "Leia o guia completo");
    cta.type = "button";
    cta.dataset.open = g.id;
    cta.setAttribute("aria-label", "Ler guia completo: " + g.title);
    foot.append(row, cta);

    card.append(head, el("h2", "guide-card-title", g.title), el("p", "guide-card-subtitle", g.subtitle), section, foot);
    return card;
  }

  function applyFilters() {
    if (!ui) return;
    const words = state.query ? state.query.split(/\s+/) : [];
    const counts = { all: 0 };
    CATEGORIES.forEach((c) => { counts[c.key] = 0; });
    let visible = 0;

    GUIDES.forEach((g) => {
      const okDiff = state.difficulty === "all" || g.difficulty === state.difficulty;
      const okQuery = words.every((w) => g.searchText.includes(w));
      if (okDiff && okQuery) { counts.all++; counts[g.category]++; }
      const okCat = state.category === "all" || g.category === state.category;
      const show = okCat && okDiff && okQuery;
      ui.cards.get(g.id).hidden = !show;
      if (show) visible++;
    });

    ui.filterCounts.forEach((node, key) => { node.textContent = String(counts[key] || 0); });
    ui.countEl.textContent = String(visible);
    ui.countLabel.textContent = visible === 1 ? "guia encontrado" : "guias encontrados";
    ui.emptyEl.hidden = visible > 0;
  }

  function updateReadUI() {
    if (!ui) return;
    GUIDES.forEach((g) => ui.cards.get(g.id).classList.toggle("is-read", readSet.has(g.id)));
    const done = GUIDES.filter((g) => readSet.has(g.id)).length;
    ui.readInfo.replaceChildren();
    if (done > 0) {
      const b = el("b", null, String(done));
      ui.readInfo.append(b, document.createTextNode(" de " + GUIDES.length + " guias lidos"));
    } else {
      ui.readInfo.textContent = GUIDES.length + " guias na trilha de aprendizado";
    }
  }

  function setCategory(key) {
    state.category = key;
    ui.filterBtns.forEach((b) => {
      const on = b.dataset.filter === key;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", String(on));
    });
    applyFilters();
  }

  function setDifficulty(key) {
    state.difficulty = key;
    ui.diffBtns.forEach((b) => {
      const on = b.dataset.difficulty === key;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", String(on));
    });
    applyFilters();
  }

  // ─────────────────────────────────────────────────────────────
  // 5. DETALHE (PÁGINA DE LEITURA)
  // ─────────────────────────────────────────────────────────────
  function buildCallout(c) {
    const box = el("div", "guide-article-callout" + (c.kind === "warn" ? " is-warn" : c.kind === "terms" ? " is-terms" : ""));
    if (c.title) box.append(el("h3", null, c.title));
    const ul = el("ul");
    c.items.forEach((item) => {
      const li = el("li");
      const parts = c.kind === "terms" ? item.split(" — ") : null;
      if (parts && parts.length > 1) {
        li.append(el("b", null, parts[0]), document.createTextNode(" — " + parts.slice(1).join(" — ")));
      } else {
        li.textContent = item;
      }
      ul.append(li);
    });
    box.append(ul);
    return box;
  }

  function buildRelated(g) {
    const items = (g.related || []).map((id) => BY_ID.get(id)).filter(Boolean);
    if (!items.length) return null;
    const card = el("div", "guide-sidebar-card");
    card.append(el("h3", null, "Guias relacionados"));
    const list = el("div", "guide-related-list");
    items.forEach((r) => {
      const a = el("button", "guide-related-item");
      a.type = "button";
      a.dataset.open = r.id;
      a.dataset.category = r.category;
      a.dataset.difficulty = r.difficulty;
      a.append(iconNode(r.category, "guide-related-icon"));
      const copy = el("span", "guide-related-copy");
      copy.append(el("b", null, r.title));
      const meta = el("span", "guide-related-meta");
      meta.append(el("em", null, DIFF_LABEL[r.difficulty]), document.createTextNode(" · " + r.time));
      copy.append(meta);
      a.append(copy, el("span", "guide-related-arrow", "›"));
      list.append(a);
    });
    card.append(list);
    return card;
  }

  function buildPager(g) {
    const i = GUIDES.indexOf(g);
    const prev = GUIDES[i - 1];
    const next = GUIDES[i + 1];
    if (!prev && !next) return null;
    const wrap = el("nav", "guide-pager");
    wrap.setAttribute("aria-label", "Navegar entre guias");
    const mk = (target, label, cls) => {
      const b = el("button", "guide-pager-btn " + cls);
      b.type = "button";
      b.dataset.open = target.id;
      b.dataset.category = target.category;
      b.append(el("span", "guide-pager-label", label), el("span", "guide-pager-title", target.title));
      return b;
    };
    if (prev) wrap.append(mk(prev, "← Guia anterior", "is-prev"));
    if (next) wrap.append(mk(next, "Próximo guia →", "is-next"));
    return wrap;
  }

  function renderDetail(g) {
    const d = ui.detail;
    d.replaceChildren();
    ui.currentId = g.id;
    if (ui.observer) { ui.observer.disconnect(); ui.observer = null; }

    // Barra de progresso + voltar
    const progress = el("div", "guide-progress");
    progress.dataset.category = g.category;
    progress.setAttribute("role", "progressbar");
    progress.setAttribute("aria-label", "Progresso de leitura");
    const bar = el("span", "guide-progress-bar");
    progress.append(bar);

    const crumbs = el("div", "guide-detail-breadcrumb");
    const back = el("button", "guide-back", "← Voltar para todos os guias");
    back.type = "button";
    back.dataset.back = "1";
    crumbs.append(back);

    // Artigo
    const article = el("article", "guide-article");
    article.dataset.category = g.category;

    const head = el("header", "guide-article-head");
    head.append(el("h1", "guide-article-title", g.title));
    if (g.subtitle) head.append(el("p", "guide-article-subtitle", g.subtitle));
    const meta = el("div", "guide-article-meta");
    const cat = el("span", "guide-card-category");
    cat.dataset.category = g.category;
    cat.append(iconNode(g.category, "guide-card-icon"), el("span", null, CAT_LABEL[g.category]));
    const diff = el("span", "guide-card-difficulty", DIFF_LABEL[g.difficulty]);
    diff.dataset.difficulty = g.difficulty;
    meta.append(cat, diff, el("span", "guide-card-time", g.time));
    head.append(meta);
    article.append(head);

    g.sections.forEach((s, i) => {
      const section = el("section", "guide-article-section");
      section.id = "guide-sec-" + (i + 1);
      const sh = el("header", "guide-article-section-head");
      sh.append(el("span", "guide-article-number", String(i + 1).padStart(2, "0")), el("h2", null, s.title));
      section.append(sh);
      if (s.body) section.append(el("p", null, s.body));
      if (s.callout && s.callout.items.length) section.append(buildCallout(s.callout));
      article.append(section);
    });

    const toggle = el("button", "guide-read-toggle");
    toggle.type = "button";
    toggle.dataset.toggleRead = g.id;
    article.append(toggle);
    const pager = buildPager(g);
    if (pager) article.append(pager);

    // Sidebar
    const sidebar = el("aside", "guide-sidebar");
    sidebar.dataset.category = g.category;
    const toc = el("div", "guide-sidebar-card");
    toc.append(el("h3", null, "Neste guia"));
    const tocList = el("ul", "guide-toc-list");
    const tocLinks = [];
    g.sections.forEach((s, i) => {
      const li = el("li");
      const a = el("a", null, s.title);
      a.href = "#guide-sec-" + (i + 1);
      a.dataset.target = "guide-sec-" + (i + 1);
      tocLinks.push(a);
      li.append(a);
      tocList.append(li);
    });
    toc.append(tocList);
    sidebar.append(toc);
    const related = buildRelated(g);
    if (related) sidebar.append(related);

    const layout = el("div", "guide-detail-layout");
    layout.append(article, sidebar);
    d.append(progress, crumbs, layout);

    ui.article = article;
    ui.bar = bar;
    ui.progressEl = progress;
    ui.toggleBtn = toggle;
    ui.tocLinks = tocLinks;
    updateToggle();

    // Destaque da seção atual no índice
    if ("IntersectionObserver" in window) {
      ui.observer = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          tocLinks.forEach((a) => a.classList.toggle("is-active", a.dataset.target === en.target.id));
        });
      }, { rootMargin: "-15% 0px -70% 0px", threshold: 0 });
      article.querySelectorAll(".guide-article-section").forEach((s) => ui.observer.observe(s));
    }
    updateProgress();
  }

  function updateToggle() {
    if (!ui || !ui.toggleBtn) return;
    const on = readSet.has(ui.currentId);
    ui.toggleBtn.classList.toggle("is-on", on);
    ui.toggleBtn.textContent = on ? "✓ Guia lido" : "Marcar como lido";
    ui.toggleBtn.setAttribute("aria-pressed", String(on));
  }

  function setRead(id, on) {
    if (on) readSet.add(id); else readSet.delete(id);
    readStore.save(readSet);
    updateToggle();
    updateReadUI();
  }

  function updateProgress() {
    if (!ui || ui.detail.hidden || !ui.article || !ui.bar) return;
    const r = ui.article.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const total = r.height - vh * 0.6;
    const p = total <= 0 ? 0 : clamp((vh * 0.3 - r.top) / total, 0, 1);
    ui.bar.style.transform = "scaleX(" + p.toFixed(3) + ")";
    ui.progressEl.setAttribute("aria-valuenow", String(Math.round(p * 100)));
    if (p >= 0.9 && !readSet.has(ui.currentId)) setRead(ui.currentId, true);
  }

  // ─────────────────────────────────────────────────────────────
  // 6. NAVEGAÇÃO LISTA ↔ DETALHE (sem mexer no location.hash)
  // ─────────────────────────────────────────────────────────────
  function scrollToView() {
    // scrollIntoView funciona tanto com scroll da janela quanto com container interno
    ui.view.scrollIntoView({ block: "start", behavior: "auto" });
  }

  function showDetail(id, opts) {
    const g = BY_ID.get(id);
    if (!g || !ui) return;
    const push = !opts || opts.push !== false;
    renderDetail(g);
    ui.list.hidden = true;
    ui.detail.hidden = false;
    ui.view.classList.add("is-detail");
    if (push) {
      try { history.pushState({ guide: id }, "", location.href); } catch (_) { /* ignora */ }
    }
    scrollToView();
    updateProgress();
  }

  function showList() {
    if (!ui) return;
    const lastId = ui.currentId;
    if (ui.observer) { ui.observer.disconnect(); ui.observer = null; }
    ui.detail.hidden = true;
    ui.detail.replaceChildren();
    ui.list.hidden = false;
    ui.view.classList.remove("is-detail");
    ui.currentId = null;
    ui.article = null;
    const card = lastId && ui.cards.get(lastId);
    if (card && !card.hidden) card.scrollIntoView({ block: "center", behavior: "auto" });
    else scrollToView();
  }

  function goBack() {
    if (history.state && history.state.guide) history.back();
    else showList();
  }

  // ─────────────────────────────────────────────────────────────
  // 7. INICIALIZAÇÃO
  // ─────────────────────────────────────────────────────────────
  function bindDom() {
    const view = document.getElementById("guideView");
    if (!view) return;

    ui = {
      view,
      list: document.getElementById("guideList"),
      detail: document.getElementById("guideDetail"),
      filtersEl: document.getElementById("guideFilters"),
      diffBtns: [...view.querySelectorAll(".guide-difficulty-btn")],
      search: document.getElementById("guideSearch"),
      grid: document.getElementById("guideGrid"),
      countEl: document.getElementById("guideCount"),
      countLabel: document.getElementById("guideCountLabel"),
      readInfo: document.getElementById("guideReadInfo"),
      emptyEl: document.getElementById("guideEmpty"),
      clearBtn: document.getElementById("guideClearFilters"),
      filterBtns: [],
      filterCounts: new Map(),
      cards: new Map(),
      currentId: null, article: null, bar: null, progressEl: null, toggleBtn: null,
      tocLinks: [], observer: null,
    };
    if (!ui.list || !ui.detail || !ui.grid || !ui.filtersEl) { ui = null; return; }

    view.dataset.guideReady = "1";

    // Filtros e cards
    buildFilters();
    const frag = document.createDocumentFragment();
    GUIDES.forEach((g) => {
      const card = buildCard(g);
      ui.cards.set(g.id, card);
      frag.append(card);
    });
    ui.grid.replaceChildren(frag);

    // Eventos da view (delegação: nada se perde se os nós forem recriados)
    ui.filtersEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".guide-filter");
      if (btn) setCategory(btn.dataset.filter || "all");
    });

    ui.diffBtns.forEach((btn) =>
      btn.addEventListener("click", () => setDifficulty(btn.dataset.difficulty || "all"))
    );

    if (ui.search) {
      let timer = null;
      ui.search.addEventListener("input", (e) => {
        clearTimeout(timer);
        const value = e.target.value;
        timer = setTimeout(() => { state.query = normalize(value); applyFilters(); }, 120);
      });
      ui.search.addEventListener("keydown", (e) => { if (e.key === "Enter") e.preventDefault(); });
    }

    if (ui.clearBtn) {
      ui.clearBtn.addEventListener("click", () => {
        state.query = "";
        if (ui.search) ui.search.value = "";
        setDifficulty("all");
        setCategory("all");
        if (ui.search) ui.search.focus();
      });
    }

    // Abrir guia: botão "Leia o guia completo", clique no card, relacionados, anterior/próximo
    view.addEventListener("click", (e) => {
      const opener = e.target.closest("[data-open]");
      if (opener) { e.preventDefault(); showDetail(opener.dataset.open); return; }

      if (e.target.closest("[data-back]")) { e.preventDefault(); goBack(); return; }

      const read = e.target.closest("[data-toggle-read]");
      if (read) { setRead(read.dataset.toggleRead, !readSet.has(read.dataset.toggleRead)); return; }

      const toc = e.target.closest(".guide-toc-list a");
      if (toc) {
        e.preventDefault();
        const target = document.getElementById(toc.dataset.target);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      const card = e.target.closest(".guide-card");
      if (card && card.dataset.id && ui.list.contains(card)) showDetail(card.dataset.id);
    });

    applyFilters();
    updateReadUI();
  }

  function bindGlobals() {
    if (globalsBound) return;
    globalsBound = true;

    // Botão voltar/avançar do navegador
    window.addEventListener("popstate", (e) => {
      if (!ui || !document.body.contains(ui.view)) return;
      const id = e.state && e.state.guide;
      if (id && BY_ID.has(id)) showDetail(id, { push: false });
      else if (!ui.detail.hidden) showList();
    });

    // Esc volta para a lista
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || !ui || ui.detail.hidden) return;
      if (!document.body.contains(ui.view)) return;
      const tag = (document.activeElement && document.activeElement.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      goBack();
    });

    // Progresso de leitura (capture pega scroll da janela e de containers internos)
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; updateProgress(); });
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
  }

  function init() {
    const view = document.getElementById("guideView");
    if (!view) { ui = null; return; }
    if (view.dataset.guideReady === "1") return;
    bindDom();
    bindGlobals();
  }

  // Inicializa agora, no DOMContentLoaded e sempre que a view for injetada depois
  window.initGuide = init;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  if ("MutationObserver" in window) {
    let pending = false;
    new MutationObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => { pending = false; init(); });
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
})();