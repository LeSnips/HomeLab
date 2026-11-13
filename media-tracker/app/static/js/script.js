document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('toggleSidebarBtn');
  const navButtons = document.querySelectorAll('.nav-btn');
  const categoryTitle = document.getElementById('currentCategoryTitle');
  const filterTabsContainer = document.getElementById('filterTabs');
  const searchInput = document.getElementById('searchInput');

  let currentCategory = 'manga';
  let currentStatusFilter = 'all';

  const filterConfigs = {
    mangaLike: [
      { id: 'all', label: 'Tous' },
      { id: 'pal', label: 'Pile à lire' },
      { id: 'owned', label: 'Possédés' },
      { id: 'missing', label: 'À compléter' },
      { id: 'wishlist', label: 'Envie' }
    ],
    default: [
      { id: 'all', label: 'Tous' },
      { id: 'watching', label: 'En cours' },
      { id: 'completed', label: 'Terminé' },
      { id: 'dropped', label: 'Abandonné' },
      { id: 'plan', label: 'Envie' }
    ]
  };

  function configTypeFor(category) {
    return (category === 'manga' || category === 'livres') ? 'mangaLike' : 'default';
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
  }

  navButtons.forEach(button => {
    button.addEventListener('click', () => {
      navButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      currentCategory = button.getAttribute('data-category');
      currentStatusFilter = 'all';
      if (categoryTitle) categoryTitle.textContent = button.querySelector('.label').textContent;

      updateFilterTabs(configTypeFor(currentCategory));
      applyFilters();
    });
  });

  function updateFilterTabs(configType) {
    if (!filterTabsContainer) return;
    const config = filterConfigs[configType];
    filterTabsContainer.innerHTML = '';

    config.forEach((tab, index) => {
      const btn = document.createElement('button');
      btn.className = `tab-btn ${index === 0 ? 'active' : ''}`;
      btn.setAttribute('data-filter', tab.id);
      btn.textContent = tab.label;

      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentStatusFilter = tab.id;
        applyFilters();
      });

      filterTabsContainer.appendChild(btn);
    });
  }

  function applyFilters() {
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    document.querySelectorAll('.media-card').forEach(card => {
      const typeMatch = card.dataset.type === currentCategory;
      const statusMatch = currentStatusFilter === 'all' || card.dataset.status === currentStatusFilter;
      const titleEl = card.querySelector('.card-title');
      const titleMatch = !query || (titleEl && titleEl.textContent.toLowerCase().includes(query));

      card.style.display = (typeMatch && statusMatch && titleMatch) ? 'flex' : 'none';
    });
  }

  if (searchInput) searchInput.addEventListener('input', applyFilters);

  // Initialisation par défaut sur Manga
  updateFilterTabs(configTypeFor(currentCategory));
  applyFilters();
});

// --- Tracker +/- avec sauvegarde côté serveur ---
function adjustUnit(button, delta) {
  const container = button.closest('.tracker-control');
  const valSpan = container.querySelector('.val');
  const mediaId = container.getAttribute('data-media-id');
  const newVal = parseInt(valSpan.textContent, 10) + delta;
  if (newVal < 0) return;

  valSpan.textContent = newVal;

  fetch(`/update/${mediaId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ current_unit: newVal })
  }).catch(() => { valSpan.textContent = newVal - delta; }); // rollback si erreur réseau
}

// --- Changement de statut ---
function updateStatus(select) {
  const mediaId = select.getAttribute('data-media-id');
  const newStatus = select.value;

  fetch(`/update/${mediaId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ status: newStatus })
  }).then(() => {
    const card = select.closest('.media-card');
    card.dataset.status = newStatus;
    const badge = card.querySelector('.card-badge');
    if (badge) {
      badge.className = `card-badge badge-${newStatus}`;
      badge.textContent = newStatus;
    }
  });
}

function toggleEpisode(button) {
  const mediaId = button.dataset.mediaId;
  const number = parseInt(button.dataset.number, 10);

  fetch(`/update/${mediaId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ current_unit: number })
  }).then(() => window.location.reload());
}