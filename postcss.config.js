/* PostCSS Config file: https://postcss.org */

import fs from 'fs'
throw new Error(`ASSET_SIZES: back=${fs.statSync('src/assets/back-img-signin-d8e70.webp').size} logo=${fs.statSync('src/assets/dcem-logo11zon-195ee.webp').size} captura=${fs.statSync('src/assets/captura-de-tela-2026-10-06-as-10.03.29-7a784.png').size}`)

export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
