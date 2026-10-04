import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The build is one self-contained HTML file (scripts and styles inlined),
// so it can be opened from disk or shared without a server.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: { target: 'es2022' },
});
