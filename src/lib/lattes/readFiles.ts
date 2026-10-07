import JSZip from 'jszip'

export interface LattesArquivoLido {
  nomeArquivo: string
  tamanho: number
  xml: string
  origem: 'xml' | 'zip'
  zipArquivoPai?: string
}

/**
 * Decodifica um buffer/ArrayBuffer usando ISO-8859-1 explicitamente.
 */
export function decodificarIso88591(buffer: ArrayBuffer | Uint8Array): string {
  const decoder = new TextDecoder('iso-8859-1')
  return decoder.decode(buffer)
}

/**
 * Lê uma lista de arquivos File[] (XML ou ZIP contendo XMLs),
 * decodificando cada XML com ISO-8859-1.
 * Localiza arquivos .xml dentro do ZIP, inclusive em subpastas, ignorando arquivos de apoio não-XML.
 */
export async function readLattesFiles(files: File[] | FileList): Promise<LattesArquivoLido[]> {
  const listaArquivos = Array.from(files)
  const resultados: LattesArquivoLido[] = []

  for (const file of listaArquivos) {
    const nomeLower = file.name.toLowerCase()

    if (nomeLower.endsWith('.xml')) {
      const buffer = await file.arrayBuffer()
      const xml = decodificarIso88591(buffer)
      resultados.push({
        nomeArquivo: file.name,
        tamanho: file.size,
        xml,
        origem: 'xml',
      })
      continue
    }

    if (nomeLower.endsWith('.zip')) {
      const buffer = await file.arrayBuffer()
      const zip = await JSZip.loadAsync(buffer)

      // Varre todas as entradas do ZIP
      const promessas: Promise<void>[] = []

      zip.forEach((relativePath, zipEntry) => {
        // Ignora diretórios e arquivos de sistema ocultos (ex: __MACOSX)
        if (zipEntry.dir || relativePath.startsWith('__MACOSX') || relativePath.includes('/.')) {
          return
        }

        if (relativePath.toLowerCase().endsWith('.xml')) {
          promessas.push(
            (async () => {
              const u8 = await zipEntry.async('uint8array')
              const xml = decodificarIso88591(u8)
              resultados.push({
                nomeArquivo: zipEntry.name || relativePath,
                tamanho: u8.byteLength,
                xml,
                origem: 'zip',
                zipArquivoPai: file.name,
              })
            })(),
          )
        }
      })

      await Promise.all(promessas)
    }
  }

  return resultados
}
