import { build } from 'esbuild'
import { cp, mkdir, rm } from 'node:fs/promises'

await rm('dist', { recursive: true, force: true })
await mkdir('dist', { recursive: true })

await build({
  entryPoints: {
    escuta: 'src/page/entrada.ts',
    content: 'src/content/main.ts',
    opcoes: 'src/opcoes/entrada.ts',
  },
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  outdir: 'dist',
  logLevel: 'info',
})

await cp('manifest.json', 'dist/manifest.json')
await cp('src/opcoes/opcoes.html', 'dist/opcoes.html')
