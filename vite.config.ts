import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The build is one self-contained HTML file (scripts and styles inlined),
// so it can be opened from disk or shared without a server.
// In development, /api goes to the account server in server/ (`dotnet run`), so the page and the
// API share one address and the session cookie just works.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: { target: 'es2022' },
  server: {
    proxy: { '/api': 'http://localhost:5137' },
    // dotnet rewrites and locks files there while building, which can crash the file watcher.
    watch: { ignored: ['**/server/**', '**/server.Tests/**'] },
  },
});
