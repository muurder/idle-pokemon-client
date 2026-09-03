    async function alternarLockPoke(pokeId, contaIdx) {
      const wv = webviews[contaIdx];
      if (!wv) return;

      const pObj = avaliadorPokesCache.find(p => String(p.id) === String(pokeId) && p.contaIdx === contaIdx);
      const novoEstadoLock = pObj ? !pObj.locked : true;

      const res = await executarAcaoTradeNoWebview(wv, 'lockPoke', { pokeId: pokeId });
      if (res && res.ok) {
        if (pObj) pObj.locked = novoEstadoLock;
        mostrarToast(`Pokémon <b>${pObj ? pObj.name : ''}</b> ${novoEstadoLock ? '🔒 Travado com sucesso!' : '🔓 Destravado!'}`, novoEstadoLock ? '🔒' : '🔓', 'toast-success', 2500);
        renderizarAvaliadorMeta();
      } else {
        mostrarToast('Erro ao travar/destravar pokémon: ' + (res.error || 'Falha de comunicação'), '❌', 'normal', 3000);
      }
    }

    async function alternarTeamBoxPoke(pokeId, contaIdx, isTeam) {
      const wv = webviews[contaIdx];
      if (!wv) return;

      const pObj = avaliadorPokesCache.find(p => String(p.id) === String(pokeId) && p.contaIdx === contaIdx);
      const acao = isTeam ? 'moveToBox' : 'setActive';

      const res = await executarAcaoTradeNoWebview(wv, acao, { pokeId: pokeId });
      if (res && res.ok) {
        if (pObj) pObj.isTeam = !isTeam;
        mostrarToast(`Pokémon <b>${pObj ? pObj.name : ''}</b> ${isTeam ? '📦 guardado no Box!' : '⚔️ equipado no Time!'}`, isTeam ? '📦' : '⚔️', 'toast-success', 2500);
        renderizarAvaliadorMeta();
        setTimeout(carregarInventariosTradeHub, 800);
      } else {
        mostrarToast(`Erro ao ${isTeam ? 'guardar no box' : 'equipar no time'}: ` + (res.error || 'Falha de comunicação'), '❌', 'normal', 3500);
      }
    }

    async function venderPokeConta(pokeId, contaIdx, nome, valorSell, isTeam) {
      const wv = webviews[contaIdx];
      if (!wv) return;

      const pObj = avaliadorPokesCache.find(p => String(p.id) === String(pokeId) && p.contaIdx === contaIdx);
      if (pObj && pObj.locked) {
        mostrarToast('O Pokémon está <b>🔒 Travado</b>. Destrave-o antes de vender.', '🔒', 'normal', 3000);
        return;
      }

      const msg = isTeam 
        ? `💰 ${nome} está no ⚔️ TIME ATIVO.\n\nDeseja desequipar do time e VENDER por $${valorSell.toLocaleString('pt-BR')} Gold?`
        : `💰 Deseja realmente VENDER ${nome} por $${valorSell.toLocaleString('pt-BR')} Gold?`;

      if (!confirm(msg)) return;

      // Se estiver no time, desequipa primeiro (moveToBox)
      if (isTeam) {
        mostrarToast(`Removendo <b>${nome}</b> do time ativo...`, '📦', 'normal', 1500);
        const resBox = await executarAcaoTradeNoWebview(wv, 'moveToBox', { pokeId: pokeId });
        if (!resBox || !resBox.ok) {
          mostrarToast('Não foi possível desequipar do time: ' + (resBox.error || 'Pokémon ativo na caçada'), '❌', 'normal', 3500);
          return;
        }
      }

      const res = await executarAcaoTradeNoWebview(wv, 'sell', { pokeId: pokeId });
      if (res && res.ok) {
        mostrarToast(`💰 <b>${nome}</b> vendido por <b>$${valorSell.toLocaleString('pt-BR')}</b> Gold!`, '💰', 'toast-success', 3500);
        avaliadorPokesCache = avaliadorPokesCache.filter(p => !(String(p.id) === String(pokeId) && p.contaIdx === contaIdx));
        renderizarAvaliadorMeta();
        setTimeout(carregarInventariosTradeHub, 800);
      } else {
        mostrarToast('Erro ao vender pokémon: ' + (res.error || 'Falha de comunicação'), '❌', 'normal', 3500);
      }
    }

    async function abrirAuraSelectPoke(pokeId, contaIdx) {
      const wv = webviews[contaIdx];
      if (!wv) return;

      try {
        await wv.executeJavaScript(`
          (function() {
            try {
              const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
              const s = w.K || w.gameState || {};
              const pokes = [...(s.team || []), ...(s.box || [])];
              const target = pokes.find(p => String(p.id) === ${JSON.stringify(String(pokeId))});
              if (target && typeof w.openAuraSelect === 'function') {
                w.openAuraSelect(target);
                return true;
              }
            } catch(e){}
            return false;
          })()
        `);
        selectTab(contaIdx);
        fecharModalAvaliadorMeta();
        mostrarToast('Painel de Auras aberto na conta selecionada!', '✨', 'normal', 3000);
      } catch(e) {
        mostrarToast('Erro ao abrir seletor de aura: ' + e.message, '❌', 'normal', 3000);
      }
    }


    function copiarInventarioPokes4ContasJSON() {
      if (!avaliadorPokesCache.length) {
        mostrarToast('Clique em 🔄 Atualizar Dados primeiro!', '⚠️', 'normal', 3000);
        return;
      }
      const dados = {
        total: avaliadorPokesCache.length,
        timestamp: new Date().toISOString(),
        pokemons: avaliadorPokesCache.map(p => ({
          id: p.id,
          name: p.name,
          level: p.level,
          shiny: p.shiny,
          contaNome: p.contaNome,
          contaIdx: p.contaIdx,
          isTeam: p.isTeam,
          locked: p.locked,
          power: p.power,
          rarity: p.rarity,
          iv: p.iv,
          growthTotal: p.growthTotal,
          growthPct: p.growthPct,
          growthDesc: p.growthDesc,
          sell: p.sell,
          tier: p.tier,
          score: p.score
        }))
      };
      const jsonTxt = JSON.stringify(dados, null, 2);
      (navigator.clipboard ? navigator.clipboard.writeText(jsonTxt) : Promise.reject()).then(() => {
        mostrarToast(`📋 Dados dos <b>${avaliadorPokesCache.length} Pokémon</b> copiados! Cole aqui no chat para analisarmos.`, '📋', 'toast-success', 4000);
      }).catch(() => {
        const ta = document.createElement('textarea'); ta.value = jsonTxt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
        mostrarToast(`📋 Dados dos <b>${avaliadorPokesCache.length} Pokémon</b> copiados! Cole aqui no chat para analisarmos.`, '📋', 'toast-success', 4000);
      });
    }

    // === CONTROLE DE ÁUDIO GLOBAL UNIFICADO ===
