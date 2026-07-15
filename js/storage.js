/* =========================================================
   storage.js
   -------------------------------------------------------
   This file is the ONLY place that talks to localStorage.
   It stands in for the old backend + database: every
   function here used to be an Express route hitting
   MongoDB. Now it just reads/writes JSON in the browser.

   Storage layout:
     journal_users            -> array of {id, name, username, password}
     journal_session          -> {userId} | null
     journal_entries_<userId> -> array of entry objects
   ========================================================= */

const DB = {
  KEYS: {
    USERS: 'journal_users',
    SESSION: 'journal_session',
    entries(userId){ return `journal_entries_${userId}`; }
  },

  _read(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(e){
      console.error('DB read error for', key, e);
      return fallback;
    }
  },

  _write(key, value){
    try{
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    }catch(e){
      console.error('DB write error for', key, e);
      return false;
    }
  },

  // ---------------- USERS ----------------
  getUsers(){ return this._read(this.KEYS.USERS, []); },

  saveUsers(users){ return this._write(this.KEYS.USERS, users); },

  findUserByUsername(username){
    return this.getUsers().find(u => u.username.toLowerCase() === username.toLowerCase());
  },

  createUser({ name, username, password }){
    const users = this.getUsers();
    const newUser = {
      id: 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7),
      name, username, password, // NOTE: demo-only plaintext storage, local device only
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    this.saveUsers(users);
    return newUser;
  },

  // ---------------- SESSION ----------------
  getSession(){ return this._read(this.KEYS.SESSION, null); },
  setSession(userId){ return this._write(this.KEYS.SESSION, { userId }); },
  clearSession(){ localStorage.removeItem(this.KEYS.SESSION); },

  getCurrentUser(){
    const session = this.getSession();
    if(!session) return null;
    return this.getUsers().find(u => u.id === session.userId) || null;
  },

  // ---------------- ENTRIES ----------------
  getEntries(userId){
    return this._read(this.KEYS.entries(userId), []);
  },

  saveEntries(userId, entries){
    return this._write(this.KEYS.entries(userId), entries);
  },

  createEntry(userId, entry){
    const entries = this.getEntries(userId);
    const newEntry = {
      id: 'e_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...entry
    };
    entries.push(newEntry);
    this.saveEntries(userId, entries);
    return newEntry;
  },

  updateEntry(userId, entryId, updates){
    const entries = this.getEntries(userId);
    const idx = entries.findIndex(e => e.id === entryId);
    if(idx === -1) return null;
    entries[idx] = { ...entries[idx], ...updates, updatedAt: new Date().toISOString() };
    this.saveEntries(userId, entries);
    return entries[idx];
  },

  deleteEntry(userId, entryId){
    const entries = this.getEntries(userId);
    const filtered = entries.filter(e => e.id !== entryId);
    this.saveEntries(userId, filtered);
    return filtered;
  },

  importEntries(userId, importedEntries){
    const entries = this.getEntries(userId);
    const existingIds = new Set(entries.map(e => e.id));
    let addedCount = 0;
    importedEntries.forEach(imp => {
      if(!imp || !imp.title || !imp.content) return;
      if(imp.id && existingIds.has(imp.id)) return;
      entries.push({
        id: imp.id || ('e_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7)),
        title: imp.title,
        content: imp.content,
        mood: imp.mood || 'neutral',
        tags: Array.isArray(imp.tags) ? imp.tags : [],
        date: imp.date || new Date().toISOString().slice(0,10),
        image: imp.image || null,
        createdAt: imp.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      addedCount++;
    });
    this.saveEntries(userId, entries);
    return addedCount;
  }
};
