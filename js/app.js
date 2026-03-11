/* ── Bible Summary App ─ Hash-based SPA ──────────────── */

const app       = document.getElementById('app');
const breadNav  = document.getElementById('breadcrumb').querySelector('.container');
const themeBtn  = document.getElementById('theme-toggle');

/* ── Theme ─────────────────────────────────────────────── */
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
themeBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

themeBtn.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  themeBtn.textContent = next === 'dark' ? '☀️' : '🌙';
});

/* ── Router ─────────────────────────────────────────────── */
function getRoute() {
  const hash = location.hash.replace(/^#\/?/, '').trim();
  if (!hash) return { view: 'home' };
  const parts = hash.split('/');
  if (parts.length === 1) return { view: 'book', bookId: parts[0] };
  if (parts.length >= 2) return { view: 'chapter', bookId: parts[0], chapterNum: parseInt(parts[1], 10) };
  return { view: 'home' };
}

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', render);

/* ── Helpers ────────────────────────────────────────────── */
function findBook(id) {
  return BIBLE_DATA.books.find(b => b.id === id);
}

function e(tag, attrs, ...children) {
  const el = document.createElement(tag);
  if (attrs) Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'className') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v);
  });
  children.flat().forEach(c => {
    if (c == null) return;
    el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return el;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function highlight(text, query) {
  if (!query) return escapeHtml(text);
  const safe = escapeHtml(text);
  const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return safe.replace(re, '<mark>$1</mark>');
}

/* ── Breadcrumb ─────────────────────────────────────────── */
function setBreadcrumb(parts) {
  breadNav.innerHTML = '';
  parts.forEach((p, i) => {
    if (i > 0) breadNav.appendChild(e('span', { className: 'sep' }, ' › '));
    if (p.href) {
      breadNav.appendChild(e('a', { href: p.href }, p.label));
    } else {
      breadNav.appendChild(e('span', { className: 'current' }, p.label));
    }
  });
}

/* ── Home View ──────────────────────────────────────────── */
let searchQuery = '';

function renderHome() {
  setBreadcrumb([{ label: 'The Bible' }]);
  document.title = 'Bible Summary';

  const otBooks = BIBLE_DATA.books.filter(b => b.testament === 'old');
  const ntBooks = BIBLE_DATA.books.filter(b => b.testament === 'new');

  const container = document.createDocumentFragment();

  // Overview
  const overview = e('section', { className: 'overview-section' });
  overview.appendChild(e('h1', {}, 'The Holy Bible'));
  BIBLE_DATA.overview.split('\n').forEach(para => {
    if (para.trim()) overview.appendChild(e('p', {}, para.trim()));
  });
  const stats = e('div', { className: 'testament-stats' });
  stats.appendChild(e('span', { className: 'stat-chip ot' }, `Old Testament — 39 books`));
  stats.appendChild(e('span', { className: 'stat-chip nt' }, `New Testament — 27 books`));
  overview.appendChild(stats);
  container.appendChild(overview);

  // Search
  const searchWrap = e('div', { className: 'search-bar' });
  const searchInput = e('input', {
    className: 'search-input',
    type: 'search',
    placeholder: 'Search books…',
    value: searchQuery
  });
  searchInput.addEventListener('input', (ev) => {
    searchQuery = ev.target.value.toLowerCase().trim();
    renderBookSections(sectionsContainer, otBooks, ntBooks);
  });
  searchWrap.appendChild(searchInput);
  container.appendChild(searchWrap);

  const sectionsContainer = e('div', {});
  renderBookSections(sectionsContainer, otBooks, ntBooks);
  container.appendChild(sectionsContainer);

  app.innerHTML = '';
  app.appendChild(container);
  if (searchQuery) searchInput.focus();
}

function renderBookSections(wrapper, otBooks, ntBooks) {
  wrapper.innerHTML = '';
  const q = searchQuery;

  const filter = books => q ? books.filter(b =>
    b.name.toLowerCase().includes(q) || b.category.toLowerCase().includes(q) || b.summary.toLowerCase().includes(q)
  ) : books;

  const filtered_ot = filter(otBooks);
  const filtered_nt = filter(ntBooks);

  if (!filtered_ot.length && !filtered_nt.length) {
    wrapper.appendChild(e('p', { className: 'loading' }, 'No books match your search.'));
    return;
  }

  if (filtered_ot.length) {
    wrapper.appendChild(renderTestamentSection('Old Testament', filtered_ot, 'ot', q));
  }
  if (filtered_nt.length) {
    wrapper.appendChild(renderTestamentSection('New Testament', filtered_nt, 'nt', q));
  }
}

function renderTestamentSection(label, books, tClass, query) {
  const section = e('section', { className: 'testament-group' });
  section.appendChild(e('h2', { className: 'testament-heading' }, e('span', {}, label)));

  // Group by category
  const categories = [];
  const catMap = {};
  books.forEach(b => {
    if (!catMap[b.category]) { catMap[b.category] = []; categories.push(b.category); }
    catMap[b.category].push(b);
  });

  categories.forEach(cat => {
    const group = e('div', { className: 'category-group' });
    group.appendChild(e('div', { className: 'category-label' }, cat));
    const grid = e('div', { className: 'book-grid' });
    catMap[cat].forEach(book => {
      const card = e('a', {
        className: 'book-card',
        href: `#${book.id}`
      });
      const nameEl = document.createElement('div');
      nameEl.className = 'book-card-name';
      nameEl.innerHTML = highlight(book.name, query);
      card.appendChild(nameEl);
      card.appendChild(e('div', { className: 'book-card-meta' }, `${book.chapters.length} chapter${book.chapters.length !== 1 ? 's' : ''}`));
      card.appendChild(e('span', { className: `book-card-tag ${tClass}` }, tClass === 'ot' ? 'OT' : 'NT'));
      grid.appendChild(card);
    });
    group.appendChild(grid);
    section.appendChild(group);
  });

  return section;
}

/* ── Book View ──────────────────────────────────────────── */
function renderBook(bookId) {
  const book = findBook(bookId);
  if (!book) { renderError(`Book "${bookId}" not found.`); return; }

  setBreadcrumb([
    { label: 'Bible', href: '#' },
    { label: book.name }
  ]);
  document.title = `${book.name} — Bible Summary`;

  const tClass = book.testament === 'old' ? 'ot' : 'nt';

  const container = document.createDocumentFragment();

  // Header
  const header = e('div', { className: 'book-header' });
  header.appendChild(e('h1', {}, book.name));
  const meta = e('div', { className: 'book-meta' });
  meta.appendChild(e('span', { className: `book-card-tag ${tClass}` }, book.testament === 'old' ? 'Old Testament' : 'New Testament'));
  meta.appendChild(e('span', {}, '·'));
  meta.appendChild(e('span', {}, book.category));
  meta.appendChild(e('span', {}, '·'));
  meta.appendChild(e('span', {}, `${book.chapters.length} chapters`));
  header.appendChild(meta);
  container.appendChild(header);

  // Summary
  const summaryEl = e('div', { className: 'book-summary' });
  book.summary.split('\n').forEach(para => {
    if (para.trim()) summaryEl.appendChild(e('p', {}, para.trim()));
  });
  container.appendChild(summaryEl);

  // Themes
  if (book.themes && book.themes.length) {
    const themes = e('div', { className: 'themes-row' });
    book.themes.forEach(t => themes.appendChild(e('span', { className: 'theme-tag' }, t)));
    container.appendChild(themes);
  }

  // Chapters
  container.appendChild(e('div', { className: 'chapters-heading' }, 'Chapters'));
  const list = e('div', { className: 'chapter-list' });
  book.chapters.forEach(ch => {
    const card = e('a', {
      className: 'chapter-card',
      href: `#${book.id}/${ch.number}`
    });
    card.appendChild(e('div', { className: 'chapter-card-num' }, `Chapter ${ch.number}`));
    card.appendChild(e('div', { className: 'chapter-card-summary' }, ch.summary));
    list.appendChild(card);
  });
  container.appendChild(list);

  app.innerHTML = '';
  app.appendChild(container);
  window.scrollTo(0, 0);
}

/* ── Chapter View ───────────────────────────────────────── */
function renderChapter(bookId, chapterNum) {
  const book = findBook(bookId);
  if (!book) { renderError(`Book "${bookId}" not found.`); return; }
  const ch = book.chapters.find(c => c.number === chapterNum);
  if (!ch) { renderError(`Chapter ${chapterNum} of ${book.name} not found.`); return; }

  setBreadcrumb([
    { label: 'Bible', href: '#' },
    { label: book.name, href: `#${book.id}` },
    { label: `Chapter ${chapterNum}` }
  ]);
  document.title = `${book.name} ${chapterNum} — Bible Summary`;

  const container = document.createDocumentFragment();

  // Header
  const header = e('div', { className: 'chapter-header' });
  header.appendChild(e('h1', {}, `${book.name} — Chapter ${chapterNum}`));
  container.appendChild(header);

  // Summary
  const summaryBlock = e('div', { className: 'chapter-summary-block' });
  ch.summary.split('\n').forEach(para => {
    if (para.trim()) summaryBlock.appendChild(e('p', {}, para.trim()));
  });
  container.appendChild(summaryBlock);

  // Key Verses
  if (ch.key_verses && ch.key_verses.length) {
    container.appendChild(e('div', { className: 'key-verses-heading' }, 'Key Verses'));
    const verseList = e('div', { className: 'verse-list' });
    ch.key_verses.forEach(v => {
      const card = e('div', { className: 'verse-card' });
      card.appendChild(e('div', { className: 'verse-ref' }, `${book.name} ${v.ref}`));
      card.appendChild(e('div', { className: 'verse-text' }, `"${v.text}"`));
      verseList.appendChild(card);
    });
    container.appendChild(verseList);
  }

  // Prev / Next navigation
  const nav = e('div', { className: 'chapter-nav' });

  const backLink = e('a', { className: 'nav-btn back', href: `#${book.id}` }, `← Back to ${book.name}`);
  nav.appendChild(backLink);

  const prevCh = book.chapters.find(c => c.number === chapterNum - 1);
  const nextCh = book.chapters.find(c => c.number === chapterNum + 1);

  if (prevCh) {
    nav.appendChild(e('a', { className: 'nav-btn', href: `#${book.id}/${prevCh.number}` }, `‹ Chapter ${prevCh.number}`));
  }
  if (nextCh) {
    nav.appendChild(e('a', { className: 'nav-btn', href: `#${book.id}/${nextCh.number}` }, `Chapter ${nextCh.number} ›`));
  }

  container.appendChild(nav);

  app.innerHTML = '';
  app.appendChild(container);
  window.scrollTo(0, 0);
}

/* ── Error ──────────────────────────────────────────────── */
function renderError(msg) {
  setBreadcrumb([{ label: 'Bible', href: '#' }, { label: 'Not Found' }]);
  app.innerHTML = `<p class="loading">${escapeHtml(msg)} <a href="#">Go home</a></p>`;
}

/* ── Main render ────────────────────────────────────────── */
function render() {
  const route = getRoute();
  if (route.view === 'home') renderHome();
  else if (route.view === 'book') renderBook(route.bookId);
  else if (route.view === 'chapter') renderChapter(route.bookId, route.chapterNum);
  else renderError('Page not found.');
}
