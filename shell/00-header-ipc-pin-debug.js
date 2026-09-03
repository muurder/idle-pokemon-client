    const { ipcRenderer } = require('electron');

    // Versao + autor na barra de titulo da janela: document.title dispara
    // 'page-title-updated', que o Electron reflete no titulo nativo sozinho.
    ipcRenderer.invoke('get-app-version').then(v => {
        if (v) document.title = document.title + ' — v' + v + ' · @jesuscrizto';
    }).catch(() => {});

    // === MENU HAMBÚRGUER FLUTUANTE DA TOPBAR ===
