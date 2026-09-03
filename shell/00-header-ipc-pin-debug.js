    const { ipcRenderer } = require('electron');

    ipcRenderer.invoke('get-app-version').then(v => {
        const el = document.getElementById('app-version-tag');
        if (el && v) el.textContent = 'v' + v;
    }).catch(() => {});

    // === MENU HAMBÚRGUER FLUTUANTE DA TOPBAR ===
