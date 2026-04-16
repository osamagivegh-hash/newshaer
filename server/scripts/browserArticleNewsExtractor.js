/*
 * Browser-side extractor for articles/news recovery.
 *
 * Usage:
 * 1. Open the site in the browser profile you want to inspect.
 * 2. Open DevTools Console.
 * 3. Paste this script and run it.
 * 4. A JSON file download will be created with anything recoverable from:
 *    - localStorage
 *    - sessionStorage
 *    - Cache Storage
 *    - IndexedDB
 */

(async () => {
  const KEY_PATTERN = /(article|articles|news|section|sections|post|posts)/i;
  const URL_PATTERN = /\/api\/(news|sections|articles)|article|articles|news/i;
  const MAX_CACHE_ENTRIES = 100;
  const MAX_IDB_RECORDS = 100;

  const safeJsonParse = (value) => {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch (_error) {
      return value;
    }
  };

  const storageEntries = (storage, storageName) => {
    const entries = [];

    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      const rawValue = storage.getItem(key);
      const shouldKeep = KEY_PATTERN.test(key) || KEY_PATTERN.test(rawValue || '');

      if (!shouldKeep) continue;

      entries.push({
        key,
        value: safeJsonParse(rawValue),
        storage: storageName
      });
    }

    return entries;
  };

  const collectCacheStorage = async () => {
    if (!('caches' in window)) return [];

    const cacheNames = await caches.keys();
    const recovered = [];

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();

      for (const request of requests) {
        if (recovered.length >= MAX_CACHE_ENTRIES) break;
        if (!URL_PATTERN.test(request.url)) continue;

        try {
          const response = await cache.match(request);
          const text = response ? await response.clone().text() : '';
          recovered.push({
            cacheName,
            url: request.url,
            status: response ? response.status : null,
            body: safeJsonParse(text)
          });
        } catch (error) {
          recovered.push({
            cacheName,
            url: request.url,
            error: error.message
          });
        }
      }
    }

    return recovered;
  };

  const openDatabase = (name, version) => new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error(`Failed to open ${name}`));
  });

  const readStoreRecords = (db, storeName) => new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const results = [];
      const request = store.openCursor();

      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor || results.length >= MAX_IDB_RECORDS) {
          resolve(results);
          return;
        }

        results.push({
          key: cursor.key,
          value: cursor.value
        });
        cursor.continue();
      };

      request.onerror = () => reject(request.error || new Error(`Failed reading ${storeName}`));
    } catch (error) {
      reject(error);
    }
  });

  const collectIndexedDb = async () => {
    if (!('indexedDB' in window) || typeof indexedDB.databases !== 'function') {
      return [];
    }

    const dbs = await indexedDB.databases();
    const recovered = [];

    for (const dbInfo of dbs) {
      if (!dbInfo.name) continue;

      let db;
      try {
        db = await openDatabase(dbInfo.name, dbInfo.version);
        const storeNames = Array.from(db.objectStoreNames);
        const matchingStores = storeNames.filter((name) => KEY_PATTERN.test(name));

        for (const storeName of matchingStores) {
          const records = await readStoreRecords(db, storeName);
          recovered.push({
            database: dbInfo.name,
            version: dbInfo.version,
            storeName,
            records
          });
        }
      } catch (error) {
        recovered.push({
          database: dbInfo.name,
          version: dbInfo.version,
          error: error.message
        });
      } finally {
        if (db) db.close();
      }
    }

    return recovered;
  };

  const payload = {
    exportedAt: new Date().toISOString(),
    location: window.location.href,
    localStorage: storageEntries(window.localStorage, 'localStorage'),
    sessionStorage: storageEntries(window.sessionStorage, 'sessionStorage'),
    cacheStorage: await collectCacheStorage(),
    indexedDB: await collectIndexedDb()
  };

  const fileName = `article-news-browser-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);

  console.log(`Browser export complete: ${fileName}`);
  return payload;
})();
