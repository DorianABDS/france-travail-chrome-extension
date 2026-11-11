// Faux `chrome.*` minimal pour tester content.js hors extension (stockage dans localStorage).
(function () {
    const KEY = 'mockChromeStorage';
    const listeners = [];
    const read = () => JSON.parse(localStorage.getItem(KEY) || '{}');

    window.chrome = {
        storage: {
            local: {
                async get(keys) {
                    const all = read();
                    const list = typeof keys === 'string' ? [keys] : keys;
                    return Object.fromEntries(list.filter((k) => k in all).map((k) => [k, all[k]]));
                },
                async set(items) {
                    const all = read();
                    const changes = {};
                    for (const [k, v] of Object.entries(items)) changes[k] = { oldValue: all[k], newValue: v };
                    localStorage.setItem(KEY, JSON.stringify({ ...all, ...items }));
                    listeners.forEach((fn) => fn(changes, 'local'));
                },
            },
            onChanged: { addListener: (fn) => listeners.push(fn) },
        },
        runtime: {
            getURL: (p) => `/${p.replace(/^\//, '')}`,
            getManifest: () => ({ version: 'test' }),
        },
        tabs: {
            query: async () => [{ url: 'https://example.com/' }],
            create: async ({ url }) => console.log('tabs.create', url),
        },
    };
})();
