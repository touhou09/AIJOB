import { createPluginBundlerPresets } from '@paperclipai/plugin-sdk/bundlers';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const presets = createPluginBundlerPresets({
  manifestEntry: 'src/manifest.ts',
  workerEntry: 'src/worker/index.ts',
  uiEntry: 'src/ui/index.tsx',
  outdir: 'dist',
  sourcemap: true,
});

export default defineConfig(({ mode }) => {
  const buildTarget = mode === 'worker' || mode === 'manifest' || mode === 'ui' ? mode : 'ui';

  if (buildTarget === 'worker') {
    return {
      build: {
        outDir: presets.rollup.worker.output.dir,
        emptyOutDir: true,
        sourcemap: true,
        lib: {
          entry: presets.rollup.worker.input,
          formats: ['es'],
          fileName: () => 'worker.js',
        },
        rollupOptions: {
          external: [...(presets.rollup.worker.external ?? []), '@paperclipai/plugin-sdk', /^node:/],
        },
      },
    };
  }

  if (buildTarget === 'manifest') {
    return {
      build: {
        outDir: presets.rollup.manifest.output.dir,
        emptyOutDir: false,
        sourcemap: true,
        lib: {
          entry: presets.rollup.manifest.input,
          formats: ['es'],
          fileName: () => 'manifest.js',
        },
        rollupOptions: {
          external: presets.rollup.manifest.external,
        },
      },
    };
  }

  return {
    plugins: [react(), tailwindcss()],
    build: {
      outDir: presets.rollup.ui?.output.dir ?? 'dist/ui',
      emptyOutDir: false,
      sourcemap: true,
      lib: {
        entry: presets.rollup.ui?.input ?? 'src/ui/index.tsx',
        formats: ['es'],
        fileName: () => 'index.js',
      },
      rollupOptions: {
        external: presets.rollup.ui?.external,
      },
    },
  };
});
