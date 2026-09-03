    //  🪟 ARRASTO DA JANELA DE RENOMEAR (aba do personagem)
    // ================================================================
    function iniciarArrastoModalRenomear(e) {
      const box = document.querySelector('#modal-rename .modal-box');
      if (!box) return;
      const r = box.getBoundingClientRect();
      box.style.position = 'fixed';
      box.style.margin = '0';
      box.style.left = r.left + 'px';
      box.style.top = r.top + 'px';
      const sx = e.clientX, sy = e.clientY, ox = r.left, oy = r.top;
      function mv(ev) {
        box.style.left = (ox + ev.clientX - sx) + 'px';
        box.style.top = (oy + ev.clientY - sy) + 'px';
      }
      function up() {
        document.removeEventListener('mousemove', mv);
        document.removeEventListener('mouseup', up);
      }
      document.addEventListener('mousemove', mv);
      document.addEventListener('mouseup', up);
      e.preventDefault();
    }

    // ================================================================
