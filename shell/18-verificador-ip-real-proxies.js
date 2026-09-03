
    function fecharModalSeFora(event, modalId) {
      if (event.target && event.target.id === modalId) {
        document.getElementById(modalId).classList.remove('active');
      }
    }

    // Listener para teclas no input do modal de renomeação
    document.getElementById('modal-rename-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        confirmarRenomear();
        e.preventDefault();
      } else if (e.key === 'Escape') {
        fecharModalRenomear();
        e.preventDefault();
      }
    });

    // Listener para teclas no input de quantidade do Trade
