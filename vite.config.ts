import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import stylex from '@stylexjs/unplugin';
export default defineConfig({base:'./',plugins:[stylex.vite({useCSSLayers:true}),react()],server:{port:5173,strictPort:true}});
