import { build } from 'esbuild'
import { cp, mkdir, rm } from 'node:fs/promises'

await rm('dist', { recursive: true, force: true })
await mkdir('dist', { recursive: true })

await build({
  entryPoints: {
    escuta: 'src/page/entrada.ts',
    content: 'src/content/main.ts',
    opcoes: 'src/opcoes/entrada.ts',
    fundo: 'src/fundo/entrada.ts',
    'escuta-vendedor': 'src/page/entrada-vendedor.ts',
    vendedor: 'src/vendedor/main.ts',
  },
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  outdir: 'dist',
  logLevel: 'info',
})

await cp('manifest.json', 'dist/manifest.json')
await cp('src/opcoes/opcoes.html', 'dist/opcoes.html')

// Prévia visual fora da extensão (não vai para dist/).
await rm('previa', { recursive: true, force: true })
await mkdir('previa', { recursive: true })
await build({
  entryPoints: { previa: 'src/previa/previa.ts', opcoes: 'src/previa/opcoes-previa.ts' },
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  outdir: 'previa',
  logLevel: 'info',
})
await cp('src/previa/index.html', 'previa/index.html')
await cp('src/opcoes/opcoes.html', 'previa/opcoes.html')
