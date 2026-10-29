import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins:[react()], root:'client', server:{host:'0.0.0.0',allowedHosts:true,proxy:{'/api':'http://127.0.0.1:3001'}}, build:{outDir:'../dist',emptyOutDir:true} });
