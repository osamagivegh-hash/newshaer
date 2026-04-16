/*
 * Browser cache extractor for forensic recovery.
 *
 * Usage:
 * 1. Open the deployed site or any browser profile that previously loaded the family tree.
 * 2. Open DevTools Console.
 * 3. Paste this entire script and run it.
 * 4. A JSON file download will be created locally in the browser.
 *
 * The script only reads localStorage and does not send data anywhere.
 */

(() => {
  const CACHE_KEY = 'familyTreeData_v3';
  const VERSION_KEY = 'familyTreeVersion';
  const TIMESTAMP_KEY = 'familyTreeTimestamp';

  function safeParse(raw) {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      return { parseError: error.message, raw };
    }
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    location: window.location.href,
    keys: {
      data: CACHE_KEY,
      version: VERSION_KEY,
      timestamp: TIMESTAMP_KEY
    },
    data: safeParse(localStorage.getItem(CACHE_KEY)),
    version: localStorage.getItem(VERSION_KEY),
    timestamp: localStorage.getItem(TIMESTAMP_KEY)
  };

  if (!payload.data) {
    console.warn('No family tree cache found under familyTreeData_v3.');
    return payload;
  }

  const fileName = `familyTree-browser-cache-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);

  console.log(`Browser cache export complete: ${fileName}`);
  return payload;
})();
