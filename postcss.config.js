/* PostCSS Config file: https://postcss.org */
import fs from 'node:fs'
import path from 'node:path'

// Hook seguro para garantir cópia dos logos e geração de ícones se necessário
try {
  const srcAssets = path.resolve('src', 'assets')
  const pub = path.resolve('public')
  const logoP2cemSrc = path.join(srcAssets, 'logo-p2cem-66a5c.png')
  const p2cemUfsSrc = path.join(srcAssets, 'p2cem-ufs-69ef8.png')

  if (fs.existsSync(logoP2cemSrc)) {
    fs.copyFileSync(logoP2cemSrc, path.join(srcAssets, 'logo-p2cem.png'))
    fs.copyFileSync(logoP2cemSrc, path.join(pub, 'logo-p2cem.png'))
  }
  if (fs.existsSync(p2cemUfsSrc)) {
    fs.copyFileSync(p2cemUfsSrc, path.join(srcAssets, 'p2cem-ufs.png'))
    fs.copyFileSync(p2cemUfsSrc, path.join(pub, 'p2cem-ufs.png'))
  }
} catch {
  // no-op
}

export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
