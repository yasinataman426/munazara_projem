export let serverTimeOffset = 0;

export const syncServerTime = async () => {
  try {
    const start = Date.now();
    // Fetch the current page to get the server's Date header
    const res = await fetch(window.location.href, { method: 'HEAD', cache: 'no-store' });
    const dateHeader = res.headers.get('Date');
    
    if (dateHeader) {
      const serverTime = new Date(dateHeader).getTime();
      const latency = (Date.now() - start) / 2;
      // Calculate offset so we can add it to local Date.now() to get real server time
      serverTimeOffset = serverTime + latency - Date.now();
      console.log(`[TimeSync] Clock synced. Offset: ${serverTimeOffset}ms`);
    }
  } catch (err) {
    console.warn("[TimeSync] Failed to sync server time:", err);
  }
};

export const getSyncedNow = () => Date.now() + serverTimeOffset;
