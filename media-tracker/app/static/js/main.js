document.addEventListener('DOMContentLoaded', () => {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const cards = document.querySelectorAll('.card');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // 1. Changer l'onglet actif
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      // 2. Récupérer le filtre sélectionné
      const filterValue = button.getAttribute('data-status');

      // 3. Filtrer les cartes
      cards.forEach(card => {
        const cardStatus = card.getAttribute('data-status');

        if (filterValue === 'all' || cardStatus === filterValue) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    });
  });
});