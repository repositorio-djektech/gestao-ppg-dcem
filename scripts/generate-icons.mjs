import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

// Criação de PNGs 100% conformes com a especificação PNG pura em Node.js (sem dependências externas)
// Usamos chunk IHDR, IDAT (deflated raw scanlines), IEND.

function createCrcTable() {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1)
      } else {
        c = c >>> 1
      }
    }
    table[n] = c
  }
  return table
}

const crcTable = createCrcTable()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function makeChunk(typeStr, dataBuf) {
  const typeBuf = Buffer.from(typeStr, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(dataBuf.length, 0)
  const toCrc = Buffer.concat([typeBuf, dataBuf])
  const crc = crc32(toCrc)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc, 0)
  return Buffer.concat([lenBuf, typeBuf, dataBuf, crcBuf])
}

function encodeRGBAtoPNG(width, height, rgbaBuffer) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR: width(4), height(4), bitDepth(1)=8, colorType(1)=6(RGBA), comp(1)=0, filter(1)=0, interlace(1)=0
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData[8] = 8
  ihdrData[9] = 6
  ihdrData[10] = 0
  ihdrData[11] = 0
  ihdrData[12] = 0
  const ihdrChunk = makeChunk('IHDR', ihdrData)

  // Scanlines with filter byte 0
  const scanlines = Buffer.alloc(height * (1 + width * 4))
  let rawIdx = 0
  let scanIdx = 0
  for (let y = 0; y < height; y++) {
    scanlines[scanIdx++] = 0 // filter: None
    for (let x = 0; x < width; x++) {
      scanlines[scanIdx++] = rgbaBuffer[rawIdx++] // R
      scanlines[scanIdx++] = rgbaBuffer[rawIdx++] // G
      scanlines[scanIdx++] = rgbaBuffer[rawIdx++] // B
      scanlines[scanIdx++] = rgbaBuffer[rawIdx++] // A
    }
  }

  const deflated = zlib.deflateSync(scanlines, { level: 9 })
  const idatChunk = makeChunk('IDAT', deflated)
  const iendChunk = makeChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk])
}

// Renderizador procedural dos ícones com gradiente azul #2563eb / #1d4ed8,
// emblema de capelo acadêmico estilizado e sigla PPG-DCEM
function renderIcon(size, isMaskable = false) {
  const buf = Buffer.alloc(size * size * 4)

  const center = size / 2
  const cornerRadius = isMaskable ? 0 : size * 0.22

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4

      // Checar arredondamento de cantos (se não for maskable)
      let inside = true
      let alpha = 255
      if (!isMaskable) {
        let dx = 0
        let dy = 0
        if (x < cornerRadius) dx = cornerRadius - x
        else if (x > size - 1 - cornerRadius) dx = x - (size - 1 - cornerRadius)
        if (y < cornerRadius) dy = cornerRadius - y
        else if (y > size - 1 - cornerRadius) dy = y - (size - 1 - cornerRadius)

        if (dx > 0 && dy > 0) {
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > cornerRadius) {
            inside = false
            alpha = 0
          } else if (dist > cornerRadius - 1) {
            alpha = Math.floor((cornerRadius - dist) * 255)
          }
        }
      }

      if (!inside || alpha === 0) {
        buf[idx] = 0
        buf[idx + 1] = 0
        buf[idx + 2] = 0
        buf[idx + 3] = 0
        continue
      }

      // Gradiente azul PPG-DCEM: (#2563EB -> #1D4ED8)
      // t varia de 0 (topo-esquerdo) a 1 (inferior-direito)
      const t = (x + y) / (2 * size)
      let r = Math.round(37 * (1 - t) + 29 * t)
      let g = Math.round(99 * (1 - t) + 78 * t)
      let b = Math.round(235 * (1 - t) + 216 * t)

      // Se for maskable, adiciona um anel muito suave de zona segura
      if (isMaskable) {
        const dCenter = Math.sqrt((x - center) ** 2 + (y - center) ** 2)
        if (dCenter < size * 0.4) {
          r = Math.min(255, r + 4)
          g = Math.min(255, g + 8)
          b = Math.min(255, b + 12)
        }
      }

      // Normalização de coordenadas para escala central:
      // no maskable, o emblema é 80% do tamanho para respeitar a safe zone
      const scale = isMaskable ? 0.78 : 1.0
      const nx = (x - center) / (center * scale) // de -1 a +1
      const ny = (y - center) / (center * scale) // de -1 a +1

      // 1. Capelo acadêmico superior (losango)
      // Centro em ny = -0.3, largura 0.6, altura 0.25
      const capY = ny - -0.28
      const capDist = Math.abs(nx) / 0.65 + Math.abs(capY) / 0.22
      if (capDist <= 1.0) {
        // Losango do capelo branco #ffffff com leve relevo
        const light = 1 - Math.max(0, capDist) * 0.08
        r = Math.round(255 * light)
        g = Math.round(255 * light)
        b = Math.round(255 * light)
      } else if (capDist <= 1.06) {
        // Borda sutil do capelo
        r = 233
        g = 239
        b = 252
      }

      // 2. Base do capelo / arco inferior
      // nx entre -0.38 e +0.38, ny entre -0.15 e +0.12
      if (Math.abs(nx) <= 0.38 && ny >= -0.16 && ny <= 0.12) {
        const bottomCurve = 0.12 - nx * nx * 0.4
        if (ny <= bottomCurve) {
          // Tom azul claro característico (#e9effc)
          r = 233
          g = 239
          b = 252
        }
      }

      // 3. Tassel / cordão dourado/ciano pendente à direita
      // nx por volta de 0.45, ny de -0.22 até 0.05
      const tasselDistX = Math.abs(nx - 0.42)
      if (tasselDistX <= 0.025 && ny >= -0.22 && ny <= 0.04) {
        r = 147
        g = 197
        b = 253 // azul claro vivo
      }
      // Pompom do tassel
      const pompomDist = Math.sqrt((nx - 0.42) ** 2 + (ny - 0.06) ** 2)
      if (pompomDist <= 0.04) {
        r = 224
        g = 242
        b = 254
      }

      // 4. Faixa de fundo da sigla (pílula horizontal)
      // nx entre -0.6 e +0.6, ny entre 0.32 e 0.52
      const barY = ny - 0.42
      const barX = Math.abs(nx)
      let inBar = false
      if (barX <= 0.52 && Math.abs(barY) <= 0.08) {
        inBar = true
      } else if (barX > 0.52 && barX <= 0.6) {
        const edgeX = barX - 0.52
        if (Math.sqrt(edgeX * edgeX + barY * barY) <= 0.08) {
          inBar = true
        }
      }
      if (inBar) {
        // Brilho translúcido branco sobre o fundo azul
        r = Math.min(255, Math.round(r * 0.75 + 255 * 0.25))
        g = Math.min(255, Math.round(g * 0.75 + 255 * 0.25))
        b = Math.min(255, Math.round(b * 0.75 + 255 * 0.25))
      }

      // 5. Letras de bloco simples "DCEM" desenhadas na faixa (nx entre -0.45 e +0.45)
      // Pixel grid simplificado da sigla para que nos PNGs pequenos e grandes fique legível
      const ly = (ny - 0.38) / 0.08 // 0 topo a 1 base
      if (ly >= 0 && ly <= 1.0) {
        // Letra P (-0.38..-0.28)
        const lxP = (nx - -0.38) / 0.09
        let isLetter = false
        if (lxP >= 0 && lxP <= 1) {
          if (lxP <= 0.3) isLetter = true
          else if ((ly <= 0.25 || (ly >= 0.45 && ly <= 0.65)) && lxP <= 0.9) isLetter = true
          else if (ly <= 0.6 && lxP >= 0.7) isLetter = true
        }

        // Letra P (-0.26..-0.16)
        const lxP2 = (nx - -0.25) / 0.09
        if (lxP2 >= 0 && lxP2 <= 1) {
          if (lxP2 <= 0.3) isLetter = true
          else if ((ly <= 0.25 || (ly >= 0.45 && ly <= 0.65)) && lxP2 <= 0.9) isLetter = true
          else if (ly <= 0.6 && lxP2 >= 0.7) isLetter = true
        }

        // Letra G (-0.13..-0.03)
        const lxG = (nx - -0.12) / 0.09
        if (lxG >= 0 && lxG <= 1) {
          if (lxG <= 0.3) isLetter = true
          else if (ly <= 0.25 || ly >= 0.75) isLetter = true
          else if (ly >= 0.5 && lxG >= 0.7) isLetter = true
          else if (ly >= 0.5 && ly <= 0.7 && lxG >= 0.4) isLetter = true
        }

        // Hífen central (-0.01..0.04)
        if (nx >= -0.01 && nx <= 0.04 && ly >= 0.42 && ly <= 0.58) {
          isLetter = true
        }

        // Letra U / D (+0.07..+0.16) - D
        const lxD = (nx - 0.07) / 0.09
        if (lxD >= 0 && lxD <= 1) {
          if (lxD <= 0.3) isLetter = true
          else if ((ly <= 0.25 || ly >= 0.75) && lxD <= 0.7) isLetter = true
          else if (ly >= 0.2 && ly <= 0.8 && lxD >= 0.7) isLetter = true
        }

        // Letra C (+0.19..+0.28)
        const lxC = (nx - 0.19) / 0.09
        if (lxC >= 0 && lxC <= 1) {
          if (lxC <= 0.3) isLetter = true
          else if ((ly <= 0.25 || ly >= 0.75) && lxC <= 0.9) isLetter = true
        }

        // Letra E (+0.31..+0.40)
        const lxE = (nx - 0.31) / 0.09
        if (lxE >= 0 && lxE <= 1) {
          if (lxE <= 0.3) isLetter = true
          else if ((ly <= 0.25 || (ly >= 0.42 && ly <= 0.58) || ly >= 0.75) && lxE <= 0.9)
            isLetter = true
        }

        if (isLetter) {
          r = 255
          g = 255
          b = 255
        }
      }

      buf[idx] = r
      buf[idx + 1] = g
      buf[idx + 2] = b
      buf[idx + 3] = alpha
    }
  }

  return encodeRGBAtoPNG(size, size, buf)
}

const iconsDir = path.resolve('public', 'icons')
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

const targets = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon-180.png', size: 180, maskable: false },
]

for (const t of targets) {
  const pngBuf = renderIcon(t.size, t.maskable)
  const fullPath = path.join(iconsDir, t.file)
  fs.writeFileSync(fullPath, pngBuf)
  console.log(`Generated ${t.file} (${pngBuf.length} bytes, ${t.size}x${t.size})`)
}
