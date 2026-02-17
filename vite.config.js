import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('index.html', import.meta.url)),
        referenzen: fileURLToPath(new URL('referenzen.html', import.meta.url)),
        dienstleistungen: fileURLToPath(new URL('dienstleistungen.html', import.meta.url)),
        kontakt: fileURLToPath(new URL('kontakt.html', import.meta.url)),
        kostenloses_erstgespraech: fileURLToPath(new URL('kostenloses-erstgespr\u00e4ch.html', import.meta.url)),
        impressum: fileURLToPath(new URL('impressum.html', import.meta.url)),
        datenschutzerklaerung: fileURLToPath(new URL('datenschutzerkl\u00e4rung.html', import.meta.url))
      }
    }
  },
  server: {
    port: 5173
  }
});
