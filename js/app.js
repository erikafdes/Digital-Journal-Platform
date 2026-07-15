/* =========================================================
   app.js
   Digital Journal Platform — front-end only application.
   All data persistence is handled by storage.js (localStorage).
   Visual layer redesigned around calm, premium micro-interactions;
   functionality and data model are unchanged.
   ========================================================= */

const MOODS = {
  joyful:   { emoji: '😊', label: 'Joyful',   soft: 'var(--gold-soft)',     ring: 'var(--gold)' },
  calm:     { emoji: '😌', label: 'Calm',     soft: 'var(--sage-soft)',     ring: 'var(--sage)' },
  neutral:  { emoji: '😐', label: 'Neutral',  soft: 'var(--blue-soft)',     ring: 'var(--blue)' },
  tired:    { emoji: '😴', label: 'Tired',    soft: 'var(--lavender-soft)', ring: 'var(--lavender)' },
  anxious:  { emoji: '😟', label: 'Anxious',  soft: 'var(--rose-soft)',     ring: 'var(--rose)' },
  sad:      { emoji: '😢', label: 'Sad',      soft: 'var(--blue-soft)',     ring: 'var(--blue)' },
  angry:    { emoji: '😠', label: 'Angry',    soft: 'var(--rose-soft)',     ring: 'var(--rose)' },
  grateful: { emoji: '🙏', label: 'Grateful', soft: 'var(--gold-soft)',     ring: 'var(--gold)' }
};

const QUOTES = [
  "Write what should not be forgotten.",
  "The page is patient. Give it whatever today was.",
  "Small words, kept daily, become a life on paper.",
  "You don't need the right words — just your own.",
  "Some days are for keeping. This is one of them.",
  "A quiet moment, put into sentences.",
  "Let today be true on the page, even if it wasn't tidy.",
  "This is your record. No one edits it but you."
];

let state = {
  currentUser: null,
  entries: [],
  filters: { search: '', mood: null, tag: null, sort: 'newest' },
  calendarDate: new Date(),
  editingEntryId: null,
  pendingDeleteId: null,
  pendingImageData: null
};

// ---------------------------------------------------------
// INIT
// ---------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  applySavedTheme();
  const user = DB.getCurrentUser();
  if(user){
    enterApp(user);
  }else{
    showScreen('auth-screen');
  }
  bindAuthEvents();
  bindAppEvents();
  bindModalEvents();
});

function showScreen(id){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ---------------------------------------------------------
// THEME
// ---------------------------------------------------------
function applySavedTheme(){
  const theme = localStorage.getItem('journal_theme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme(){
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('journal_theme', next);
}

// ---------------------------------------------------------
// AUTH
// ---------------------------------------------------------
function bindAuthEvents(){
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab + '-form').classList.add('active');
    });
  });

  document.getElementById('login-form').addEventListener('submit', e => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    const user = DB.findUserByUsername(username);
    if(!user || user.password !== password){
      errorEl.textContent = 'Username or passphrase is incorrect.';
      return;
    }
    errorEl.textContent = '';
    DB.setSession(user.id);
    enterApp(user);
    e.target.reset();
  });

  document.getElementById('signup-form').addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const username = document.getElementById('signup-username').value.trim();
    const password = document.getElementById('signup-password').value;
    const errorEl = document.getElementById('signup-error');

    if(username.length < 3){
      errorEl.textContent = 'Username should be at least 3 characters.';
      return;
    }
    if(password.length < 4){
      errorEl.textContent = 'Passphrase should be at least 4 characters.';
      return;
    }
    if(DB.findUserByUsername(username)){
      errorEl.textContent = 'That username is already taken on this device.';
      return;
    }
    errorEl.textContent = '';
    const user = DB.createUser({ name, username, password });
    DB.setSession(user.id);
    enterApp(user);
    e.target.reset();
  });

  document.getElementById('logout-btn').addEventListener('click', () => {
    DB.clearSession();
    state.currentUser = null;
    showScreen('auth-screen');
  });
}

function enterApp(user){
  state.currentUser = user;
  state.entries = DB.getEntries(user.id);
  showScreen('app-screen');
  renderWelcome(user);
  renderMoodFilterChips();
  renderAll();
}

function renderWelcome(user){
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const name = user.name || user.username;
  document.getElementById('welcome-greeting').textContent = `${timeGreeting}, ${name} 🌿`;
  document.getElementById('welcome-date').textContent = new Date().toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric'
  });
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  document.getElementById('welcome-quote').textContent = `“${quote}”`;
}

// ---------------------------------------------------------
// NAV
// ---------------------------------------------------------
function bindAppEvents(){
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

  function goToView(view){
    document.querySelectorAll('.rail-btn[data-view], .tab-btn[data-view]').forEach(b => b.classList.remove('active'));
    document.querySelectorAll(`[data-view="${view}"]`).forEach(b => b.classList.add('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + view).classList.add('active');
    if(view === 'calendar') renderCalendar();
    if(view === 'insights') renderInsights();
  }

  document.querySelectorAll('.rail-btn[data-view], .tab-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => goToView(btn.dataset.view));
  });

  document.getElementById('new-entry-btn').addEventListener('click', () => openEditor());

  document.getElementById('search-input').addEventListener('input', e => {
    state.filters.search = e.target.value.toLowerCase();
    renderEntries();
  });

  document.getElementById('sort-select').addEventListener('change', e => {
    state.filters.sort = e.target.value;
    renderEntries();
  });

  document.getElementById('export-btn').addEventListener('click', exportEntries);
  document.getElementById('import-input').addEventListener('change', importEntries);

  document.getElementById('cal-prev').addEventListener('click', () => {
    state.calendarDate.setMonth(state.calendarDate.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById('cal-next').addEventListener('click', () => {
    state.calendarDate.setMonth(state.calendarDate.getMonth() + 1);
    renderCalendar();
  });
}

// ---------------------------------------------------------
// RENDER: everything
// ---------------------------------------------------------
function renderAll(){
  renderEntries();
  renderTagFilterChips();
  renderStatRow();
  renderMiniMoodBars();
  renderStreakRing();
}

// ---------------------------------------------------------
// DASHBOARD: stat row, mini mood bars, streak ring
// ---------------------------------------------------------
function renderStatRow(){
  const total = state.entries.length;
  const totalWords = state.entries.reduce((sum, e) => sum + wordCount(e.content), 0);
  const streak = computeStreak();
  const allTags = new Set(state.entries.flatMap(e => e.tags || []));

  const row = document.getElementById('stat-row');
  row.innerHTML = `
    <div class="stat-pill tone-sage"><span class="stat-num">${total}</span><span class="stat-label">Entries</span></div>
    <div class="stat-pill tone-blue"><span class="stat-num">${totalWords}</span><span class="stat-label">Words written</span></div>
    <div class="stat-pill tone-gold"><span class="stat-num">${streak}</span><span class="stat-label">Day streak</span></div>
    <div class="stat-pill tone-lavender"><span class="stat-num">${allTags.size}</span><span class="stat-label">Tags used</span></div>
  `;
}

function renderMiniMoodBars(){
  const wrap = document.getElementById('mini-mood-bars');
  const since = new Date();
  since.setDate(since.getDate() - 6);
  const recent = state.entries.filter(e => new Date(e.date) >= since);
  const counts = {};
  Object.keys(MOODS).forEach(k => counts[k] = 0);
  recent.forEach(e => { if(counts[e.mood] !== undefined) counts[e.mood]++; });
  const max = Math.max(1, ...Object.values(counts));

  wrap.innerHTML = Object.entries(counts).map(([key, count]) => {
    const m = MOODS[key];
    const pct = Math.max(6, Math.round((count / max) * 100));
    return `<div class="mini-bar-col">
      <div class="mini-bar" style="height:${pct}%; background:${m.ring};" title="${m.label}: ${count}"></div>
      <span class="mini-bar-label">${m.emoji}</span>
    </div>`;
  }).join('');
}

function renderStreakRing(){
  const streak = computeStreak();
  const circumference = 214;
  const capped = Math.min(streak, 30); // visually cap at a 30-day ring fill
  const offset = circumference - (capped / 30) * circumference;
  document.getElementById('streak-ring-fill').style.strokeDashoffset = streak === 0 ? circumference : offset;
  document.getElementById('streak-number').textContent = streak;
  document.getElementById('streak-text').textContent = streak === 0
    ? 'Start today to begin a streak.'
    : `${streak} day${streak===1?'':'s'} of showing up for yourself.`;
}

// ---------------------------------------------------------
// ENTRIES LIST + FILTERS
// ---------------------------------------------------------
function getFilteredEntries(){
  let list = [...state.entries];
  const { search, mood, tag, sort } = state.filters;

  if(search){
    list = list.filter(e =>
      e.title.toLowerCase().includes(search) ||
      e.content.toLowerCase().includes(search)
    );
  }
  if(mood){
    list = list.filter(e => e.mood === mood);
  }
  if(tag){
    list = list.filter(e => (e.tags || []).includes(tag));
  }

  switch(sort){
    case 'oldest': list.sort((a,b) => new Date(a.date) - new Date(b.date)); break;
    case 'longest': list.sort((a,b) => b.content.length - a.content.length); break;
    case 'alpha': list.sort((a,b) => a.title.localeCompare(b.title)); break;
    default: list.sort((a,b) => new Date(b.date) - new Date(a.date));
  }
  return list;
}

function renderEntries(){
  const container = document.getElementById('entries-list');
  const emptyState = document.getElementById('entries-empty');
  const filtered = getFilteredEntries();

  container.innerHTML = '';
  emptyState.classList.toggle('visible', filtered.length === 0);

  filtered.forEach((entry, i) => {
    const card = document.createElement('div');
    card.className = 'entry-card';
    card.style.animationDelay = `${Math.min(i, 8) * 0.04}s`;
    const mood = MOODS[entry.mood] || MOODS.neutral;
    const rt = readingTime(entry.content);
    card.innerHTML = `
      <div class="entry-card-top">
        <h3>${escapeHtml(entry.title)}</h3>
        <span class="mood-badge" style="background:${mood.soft};" title="${mood.label}">${mood.emoji}</span>
      </div>
      <span class="entry-date">${formatDate(entry.date)}</span>
      ${entry.image ? `<img class="entry-thumb" src="${entry.image}" alt="">` : ''}
      <p class="entry-snippet">${escapeHtml(entry.content)}</p>
      <div class="entry-tags">${(entry.tags||[]).map(t => `<span>#${escapeHtml(t)}</span>`).join('')}</div>
      <div class="entry-footer-row"><span>${rt} min read</span></div>
    `;
    card.addEventListener('click', () => openViewer(entry.id));
    container.appendChild(card);
  });
}

function renderMoodFilterChips(){
  const wrap = document.getElementById('mood-filter-chips');
  wrap.innerHTML = '';
  Object.entries(MOODS).forEach(([key, m]) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = `${m.emoji} ${m.label}`;
    chip.addEventListener('click', () => {
      const isActive = chip.classList.contains('active');
      wrap.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      state.filters.mood = isActive ? null : key;
      if(!isActive) chip.classList.add('active');
      renderEntries();
    });
    wrap.appendChild(chip);
  });
}

function renderTagFilterChips(){
  const wrap = document.getElementById('tag-filter-chips');
  const allTags = [...new Set(state.entries.flatMap(e => e.tags || []))].sort();
  wrap.innerHTML = '';
  if(allTags.length === 0){
    wrap.innerHTML = '<span class="empty-hint">No tags yet</span>';
    return;
  }
  allTags.forEach(tag => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = `#${tag}`;
    chip.addEventListener('click', () => {
      const isActive = chip.classList.contains('active');
      wrap.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      state.filters.tag = isActive ? null : tag;
      if(!isActive) chip.classList.add('active');
      renderEntries();
    });
    wrap.appendChild(chip);
  });
}

function computeStreak(){
  const dateSet = new Set(state.entries.map(e => e.date));
  let streak = 0;
  let cursor = new Date();
  while(true){
    const iso = cursor.toISOString().slice(0,10);
    if(dateSet.has(iso)){
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }else{
      break;
    }
  }
  return streak;
}

// ---------------------------------------------------------
// EDITOR MODAL
// ---------------------------------------------------------
function bindModalEvents(){
  buildMoodPicker();

  document.getElementById('editor-close').addEventListener('click', closeEditor);
  document.getElementById('editor-cancel').addEventListener('click', closeEditor);
  document.getElementById('editor-overlay').addEventListener('click', e => {
    if(e.target.id === 'editor-overlay') closeEditor();
  });

  document.getElementById('entry-content').addEventListener('input', () => {
    updateEditorMetrics();
    pulseSaveIndicator('Editing…');
  });
  document.getElementById('entry-title').addEventListener('input', () => pulseSaveIndicator('Editing…'));

  document.querySelectorAll('.tb-btn[data-cmd]').forEach(btn => {
    btn.addEventListener('click', () => {
      const textarea = document.getElementById('entry-content');
      const cmd = btn.dataset.cmd;
      const wrap = { bold: '**', italic: '_', underline: '__' }[cmd];
      wrapSelection(textarea, wrap);
      updateEditorMetrics();
    });
  });

  document.getElementById('entry-image').addEventListener('change', e => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      state.pendingImageData = ev.target.result;
      const preview = document.getElementById('entry-image-preview');
      preview.src = ev.target.result;
      preview.hidden = false;
      document.getElementById('remove-image-btn').hidden = false;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('remove-image-btn').addEventListener('click', () => {
    state.pendingImageData = null;
    document.getElementById('entry-image').value = '';
    document.getElementById('entry-image-preview').hidden = true;
    document.getElementById('remove-image-btn').hidden = true;
  });

  document.getElementById('entry-form').addEventListener('submit', saveEntry);

  // Viewer modal
  document.getElementById('view-close').addEventListener('click', closeViewer);
  document.getElementById('view-overlay').addEventListener('click', e => {
    if(e.target.id === 'view-overlay') closeViewer();
  });
  document.getElementById('view-edit-btn').addEventListener('click', () => {
    const id = state.editingEntryId;
    closeViewer();
    openEditor(id);
  });
  document.getElementById('view-delete-btn').addEventListener('click', () => {
    openConfirm(state.editingEntryId);
  });

  // Confirm dialog
  document.getElementById('confirm-cancel').addEventListener('click', closeConfirm);
  document.getElementById('confirm-overlay').addEventListener('click', e => {
    if(e.target.id === 'confirm-overlay') closeConfirm();
  });
  document.getElementById('confirm-ok').addEventListener('click', () => {
    if(state.pendingDeleteId){
      state.entries = DB.deleteEntry(state.currentUser.id, state.pendingDeleteId);
      closeConfirm();
      closeViewer();
      renderAll();
      renderMoodFilterChips();
      showToast('Entry deleted.');
    }
  });
}

function buildMoodPicker(){
  const wrap = document.getElementById('mood-picker');
  wrap.innerHTML = '';
  Object.entries(MOODS).forEach(([key, m]) => {
    const orb = document.createElement('div');
    orb.className = 'mood-orb';
    orb.style.background = m.soft;
    orb.textContent = m.emoji;
    orb.title = m.label;
    orb.dataset.mood = key;
    orb.addEventListener('click', () => {
      wrap.querySelectorAll('.mood-orb').forEach(o => o.classList.remove('selected'));
      orb.classList.add('selected');
      document.getElementById('entry-mood').value = key;
    });
    wrap.appendChild(orb);
  });
}

function selectMoodInPicker(moodKey){
  document.querySelectorAll('.mood-orb').forEach(o => {
    o.classList.toggle('selected', o.dataset.mood === moodKey);
  });
  document.getElementById('entry-mood').value = moodKey;
}

function wrapSelection(textarea, wrapper){
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selected = value.slice(start, end) || 'text';
  textarea.value = value.slice(0, start) + wrapper + selected + wrapper + value.slice(end);
  textarea.focus();
  textarea.selectionStart = start + wrapper.length;
  textarea.selectionEnd = start + wrapper.length + selected.length;
}

function openEditor(entryId = null){
  state.editingEntryId = entryId;
  state.pendingImageData = null;
  const form = document.getElementById('entry-form');
  form.reset();
  document.getElementById('entry-image-preview').hidden = true;
  document.getElementById('remove-image-btn').hidden = true;

  if(entryId){
    const entry = state.entries.find(e => e.id === entryId);
    document.getElementById('entry-id').value = entry.id;
    document.getElementById('entry-title').value = entry.title;
    document.getElementById('entry-date').value = entry.date;
    selectMoodInPicker(entry.mood);
    document.getElementById('entry-tags').value = (entry.tags || []).join(', ');
    document.getElementById('entry-content').value = entry.content;
    if(entry.image){
      state.pendingImageData = entry.image;
      const preview = document.getElementById('entry-image-preview');
      preview.src = entry.image;
      preview.hidden = false;
      document.getElementById('remove-image-btn').hidden = false;
    }
  }else{
    document.getElementById('entry-id').value = '';
    document.getElementById('entry-date').value = new Date().toISOString().slice(0,10);
    selectMoodInPicker('neutral');
  }
  updateEditorMetrics();
  pulseSaveIndicator('Saved');
  document.getElementById('editor-overlay').classList.add('active');
}

function closeEditor(){
  document.getElementById('editor-overlay').classList.remove('active');
}

function updateEditorMetrics(){
  const text = document.getElementById('entry-content').value;
  const words = wordCount(text);
  const chars = text.length;
  document.getElementById('word-count').textContent = `${words} word${words===1?'':'s'}`;
  document.getElementById('char-count').textContent = `${chars} character${chars===1?'':'s'}`;
  document.getElementById('read-time').textContent = `${readingTime(text)} min read`;
}

let saveIndicatorTimer = null;
function pulseSaveIndicator(label){
  const el = document.getElementById('save-indicator');
  el.innerHTML = `<span class="save-dot"></span> ${label}`;
  if(label === 'Editing…'){
    clearTimeout(saveIndicatorTimer);
    saveIndicatorTimer = setTimeout(() => {
      el.innerHTML = '<span class="save-dot"></span> Saved';
    }, 900);
  }
}

function saveEntry(e){
  e.preventDefault();
  const id = document.getElementById('entry-id').value;
  const tags = document.getElementById('entry-tags').value
    .split(',').map(t => t.trim()).filter(Boolean);

  const payload = {
    title: document.getElementById('entry-title').value.trim(),
    date: document.getElementById('entry-date').value,
    mood: document.getElementById('entry-mood').value || 'neutral',
    tags,
    content: document.getElementById('entry-content').value.trim(),
    image: state.pendingImageData || null
  };

  if(id){
    DB.updateEntry(state.currentUser.id, id, payload);
    showToast('Entry updated.');
  }else{
    DB.createEntry(state.currentUser.id, payload);
    showToast('Entry saved.');
  }
  state.entries = DB.getEntries(state.currentUser.id);
  closeEditor();
  renderAll();
  renderMoodFilterChips();
}

// ---------------------------------------------------------
// VIEWER MODAL
// ---------------------------------------------------------
function openViewer(entryId){
  const entry = state.entries.find(e => e.id === entryId);
  if(!entry) return;
  state.editingEntryId = entryId;
  const mood = MOODS[entry.mood] || MOODS.neutral;

  document.getElementById('view-entry-title').textContent = entry.title;
  document.getElementById('view-entry-date').textContent = formatDate(entry.date);
  document.getElementById('view-entry-mood').textContent = `${mood.emoji} ${mood.label}`;
  document.getElementById('view-entry-readtime').textContent = `${readingTime(entry.content)} min read`;
  document.getElementById('view-entry-tags').innerHTML =
    (entry.tags||[]).map(t => `<span>#${escapeHtml(t)}</span>`).join('');
  document.getElementById('view-entry-content').textContent = entry.content;

  const img = document.getElementById('view-entry-image');
  if(entry.image){ img.src = entry.image; img.hidden = false; }
  else{ img.hidden = true; }

  document.getElementById('view-overlay').classList.add('active');
}

function closeViewer(){
  document.getElementById('view-overlay').classList.remove('active');
}

function openConfirm(entryId){
  state.pendingDeleteId = entryId;
  document.getElementById('confirm-message').textContent = 'Delete this entry? This cannot be undone.';
  document.getElementById('confirm-overlay').classList.add('active');
}

function closeConfirm(){
  document.getElementById('confirm-overlay').classList.remove('active');
  state.pendingDeleteId = null;
}

// ---------------------------------------------------------
// EXPORT / IMPORT
// ---------------------------------------------------------
function exportEntries(){
  const data = JSON.stringify(state.entries, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `journal-entries-${state.currentUser.username}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Entries exported.');
}

function importEntries(e){
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try{
      const parsed = JSON.parse(ev.target.result);
      if(!Array.isArray(parsed)) throw new Error('not an array');
      const added = DB.importEntries(state.currentUser.id, parsed);
      state.entries = DB.getEntries(state.currentUser.id);
      renderAll();
      renderMoodFilterChips();
      showToast(`Imported ${added} entr${added===1?'y':'ies'}.`);
    }catch(err){
      showToast('That file could not be read as journal entries.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// ---------------------------------------------------------
// CALENDAR VIEW
// ---------------------------------------------------------
function renderCalendar(){
  const grid = document.getElementById('calendar-grid');
  const title = document.getElementById('cal-title');
  const date = state.calendarDate;
  const year = date.getFullYear();
  const month = date.getMonth();

  title.textContent = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const entriesByDate = {};
  state.entries.forEach(e => { entriesByDate[e.date] = e; });

  grid.innerHTML = '';
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => {
    const el = document.createElement('div');
    el.className = 'cal-dow';
    el.textContent = d;
    grid.appendChild(el);
  });

  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayIso = new Date().toISOString().slice(0,10);

  for(let i = 0; i < startOffset; i++){
    const el = document.createElement('div');
    el.className = 'cal-cell empty';
    grid.appendChild(el);
  }

  for(let day = 1; day <= daysInMonth; day++){
    const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const entry = entriesByDate[iso];
    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    if(entry) cell.classList.add('has-entry');
    if(iso === todayIso) cell.classList.add('today');
    cell.innerHTML = `<span class="cal-day-num">${day}</span>`;
    if(entry){
      const mood = MOODS[entry.mood] || MOODS.neutral;
      cell.innerHTML += `<span class="cal-mood-dot">${mood.emoji}</span>`;
      cell.addEventListener('click', () => openViewer(entry.id));
    }
    grid.appendChild(cell);
  }
}

// ---------------------------------------------------------
// INSIGHTS VIEW
// ---------------------------------------------------------
function renderInsights(){
  const totalEntries = state.entries.length;
  const totalWords = state.entries.reduce((sum, e) => sum + wordCount(e.content), 0);
  const avgWords = totalEntries ? Math.round(totalWords / totalEntries) : 0;
  const streak = computeStreak();

  document.getElementById('stat-cards').innerHTML = `
    <div class="stat-card"><div class="stat-num">${totalEntries}</div><div class="stat-label">Total entries</div></div>
    <div class="stat-card"><div class="stat-num">${totalWords}</div><div class="stat-label">Words written</div></div>
    <div class="stat-card"><div class="stat-num">${avgWords}</div><div class="stat-label">Avg words / entry</div></div>
    <div class="stat-card"><div class="stat-num">${streak}</div><div class="stat-label">Day streak</div></div>
  `;

  const moodCounts = {};
  Object.keys(MOODS).forEach(k => moodCounts[k] = 0);
  state.entries.forEach(e => { if(moodCounts[e.mood] !== undefined) moodCounts[e.mood]++; });
  const maxCount = Math.max(1, ...Object.values(moodCounts));

  document.getElementById('mood-bars').innerHTML = Object.entries(moodCounts).map(([key,count]) => {
    const m = MOODS[key];
    const pct = Math.round((count / maxCount) * 100);
    return `<div class="mood-bar-row">
      <span class="mood-bar-label">${m.emoji} ${m.label}</span>
      <div class="mood-bar-track"><div class="mood-bar-fill" style="width:${pct}%"></div></div>
      <span class="mood-bar-count">${count}</span>
    </div>`;
  }).join('');

  const tagCounts = {};
  state.entries.forEach(e => (e.tags||[]).forEach(t => { tagCounts[t] = (tagCounts[t]||0) + 1; }));
  const sortedTags = Object.entries(tagCounts).sort((a,b) => b[1]-a[1]).slice(0,20);
  document.getElementById('tag-cloud').innerHTML = sortedTags.length
    ? sortedTags.map(([tag,count]) => `<span>#${escapeHtml(tag)} · ${count}</span>`).join('')
    : '<span class="empty-hint">No tags used yet</span>';

  renderHeatmap();
}

function renderHeatmap(){
  const heatmap = document.getElementById('heatmap');
  heatmap.innerHTML = '';
  const dateSet = new Set(state.entries.map(e => e.date));
  const today = new Date();
  const weeks = 12;

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (weeks * 7 - 1));

  for(let w = 0; w < weeks; w++){
    const weekEl = document.createElement('div');
    weekEl.className = 'heatmap-week';
    for(let d = 0; d < 7; d++){
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + w*7 + d);
      const iso = cellDate.toISOString().slice(0,10);
      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';
      cell.title = iso;
      if(dateSet.has(iso)){
        cell.style.background = 'linear-gradient(135deg, var(--sage), var(--blue))';
      }
      if(cellDate > today){
        cell.style.opacity = '0.3';
      }
      weekEl.appendChild(cell);
    }
    heatmap.appendChild(weekEl);
  }
}

// ---------------------------------------------------------
// HELPERS
// ---------------------------------------------------------
function formatDate(iso){
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday:'short', year:'numeric', month:'short', day:'numeric' });
}

function wordCount(text){
  const trimmed = (text || '').trim();
  return trimmed.length ? trimmed.split(/\s+/).length : 0;
}

function readingTime(text){
  return Math.max(1, Math.round(wordCount(text) / 200));
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

let toastTimer = null;
function showToast(msg){
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2500);
}
