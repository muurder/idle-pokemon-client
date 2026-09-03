    // Quantidade dinâmica de contas ativas (padrão: 1 conta)
    let totalContas = 1;
    try {
      const savedTotal = parseInt(localStorage.getItem('idlePokemonTotalContas'), 10);
      if (!isNaN(savedTotal) && savedTotal >= 1 && savedTotal <= 16) totalContas = savedTotal;
    } catch(e) {}

    // Nomes personalizados das abas
    let nomesAbas = [];
    try {
      const savedNames = localStorage.getItem('idlePokemonCustomTabNames');
      if (savedNames) {
        const parsed = JSON.parse(savedNames);
        if (Array.isArray(parsed)) nomesAbas = parsed;
      }
    } catch(e) {}
    while (nomesAbas.length < totalContas) {
      nomesAbas.push(`Conta ${nomesAbas.length + 1}`);
    }

    // ⚠️ PARTICAO POR POSICAO, nao por indice.
    // A particao (`persist:accN`) e a identidade REAL da conta: e ela que
    // guarda cookies e sessao do jogo. Antes ela era DERIVADA do indice
    // (`persist:acc${i+1}`), o que amarrava "posicao na lista" a "qual conta e"
    // — por isso reordenar as abas so trocava os rotulos de lugar enquanto as
    // sessoes ficavam paradas. Agora a particao e um dado proprio, guardado e
    // reordenado junto com nome e proxy, e a posicao passa a ser so posicao.
    let listaParticoes = [];
    try {
      const salvo = localStorage.getItem('idlePokemonTabPartitions');
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed)) listaParticoes = parsed.filter(x => typeof x === 'string' && x);
      }
    } catch (e) { }

    // Devolve a menor particao `persist:accN` ainda nao usada — abrir e fechar
    // contas nao pode fazer duas posicoes apontarem pra mesma sessao.
    function particaoLivre() {
      const usadas = new Set(listaParticoes);
      for (let n = 1; n <= 64; n++) {
        const cand = 'persist:acc' + n;
        if (!usadas.has(cand)) return cand;
      }
      return 'persist:acc' + Date.now();
    }

    // Instalacao antiga (ou primeira execucao): a posicao i sempre foi acc(i+1).
    while (listaParticoes.length < totalContas) {
      const padrao = 'persist:acc' + (listaParticoes.length + 1);
      listaParticoes.push(listaParticoes.includes(padrao) ? particaoLivre() : padrao);
    }

    function salvarParticoes() {
      try { localStorage.setItem('idlePokemonTabPartitions', JSON.stringify(listaParticoes)); } catch (e) { }
    }

    // Proxies atribuídos a cada conta
    let listaProxies = [];
    while (listaProxies.length < totalContas) {
      listaProxies.push('');
    }

    // Configuração de auto-rotação de proxy no Refresh por conta
    let contasAutoProxyRefresh = [];
    try {
      const savedAutoRotate = localStorage.getItem('idlePokemonAutoRotateRefresh');
      if (savedAutoRotate) {
        const parsed = JSON.parse(savedAutoRotate);
        if (Array.isArray(parsed)) contasAutoProxyRefresh = parsed;
      }
    } catch(e) {}
    while (contasAutoProxyRefresh.length < totalContas) {
      contasAutoProxyRefresh.push(false);
    }

    let autoProxyPoolPointer = 0;
    try {
      const savedPtr = parseInt(localStorage.getItem('idlePokemonAutoProxyPointer'), 10);
      if (!isNaN(savedPtr)) autoProxyPoolPointer = savedPtr;
    } catch(e) {}

    // Credenciais de login
    let listaCredenciais = [];
    try {
      const savedCreds = localStorage.getItem('idlePokemonCustomCredentials');
      if (savedCreds) {
        const parsed = JSON.parse(savedCreds);
        if (Array.isArray(parsed)) listaCredenciais = parsed;
      }
    } catch(e) {}
    while (listaCredenciais.length < totalContas) {
      const i = listaCredenciais.length;
      listaCredenciais.push({ user: nomesAbas[i] || `Conta ${i + 1}`, pass: '', autoLogin: true });
    }

    // Arrays de referências do DOM (atualizados dinamicamente)
    let webviews = [];
    let wrappers = [];
    let tabButtons = [];

    // ================================================================
