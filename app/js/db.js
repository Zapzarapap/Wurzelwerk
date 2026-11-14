// Minimaler IndexedDB-Wrapper (Promise-basiert).

const DB_NAME = 'wurzelwerk';
const DB_VERSION = 1;
export const STORES = ['tags', 'sessions', 'plants', 'kv'];

let dbp = null;

function req(r) {
  return new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export function openDB() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('tags')) db.createObjectStore('tags', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('sessions')) db.createObjectStore('sessions', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('plants')) db.createObjectStore('plants', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv', { keyPath: 'key' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.onblocked = () => rej(new Error('Datenbank blockiert – andere Tabs schließen.'));
  });
  return dbp;
}

export async function getAll(store) {
  const db = await openDB();
  return req(db.transaction(store).objectStore(store).getAll());
}

export async function get(store, key) {
  const db = await openDB();
  return req(db.transaction(store).objectStore(store).get(key));
}

/**
 * Mehrere Schreiboperationen atomar.
 * ops: [{store, put: obj} | {store, del: key} | {store, clear: true}]
 */
export async function write(ops) {
  const db = await openDB();
  const names = [...new Set(ops.map((o) => o.store))];
  return new Promise((res, rej) => {
    const tx = db.transaction(names, 'readwrite');
    for (const o of ops) {
      const st = tx.objectStore(o.store);
      if (o.clear) st.clear();
      else if (o.del !== undefined) st.delete(o.del);
      else st.put(o.put);
    }
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error || new Error('Transaktion abgebrochen'));
  });
}

export const put = (store, obj) => write([{ store, put: obj }]);
export const del = (store, key) => write([{ store, del: key }]);
