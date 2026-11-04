import { useEffect, useState } from 'react'
import { Accessibility } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { PoliticasAfirmativasEditor } from '@/components/ppg/PoliticasAfirmativasEditor'
import { podeEditarTextoItem13 } from '@/services/permissoes'
import {
  obterTextoPoliticasAfirmativas,
  salvarTextoPoliticasAfirmativas,
} from '@/services/ppg-textos'
import { registrarLog } from '@/services/logs'
import { Skeleton } from '@/components/ui/skeleton'

/** Item 1.3 da ficha: texto das políticas afirmativas (D-12 / H-10). Sem cálculo. */
export default function PoliticasAfirmativas() {
  const { role } = useAuth()
  const [texto, setTexto] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const podeEditar = podeEditarTextoItem13(role)

  useEffect(() => {
    let ativo = true
    obterTextoPoliticasAfirmativas()
      .then((t) => ativo && setTexto(t))
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Erro ao carregar o texto.'))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [])

  const salvar = async (novoTexto: string) => {
    setSalvando(true)
    try {
      const res = await salvarTextoPoliticasAfirmativas({ role, texto: novoTexto })
      if (!('motivo' in res)) {
        setTexto(novoTexto.trim())
        toast.success('Texto salvo.')
        void registrarLog({
          acao: 'editar',
          entidade: 'ppg_textos',
          detalhes: { item: '1.3 — políticas afirmativas' },
        })
      } else if (res.motivo === 'erro') {
        toast.error((res as { mensagem: string }).mensagem)
      } else if (res.motivo === 'muito_longo') {
        toast.error('O texto passou do limite de caracteres.')
      } else {
        toast.error('Somente a coordenação edita este texto.')
      }
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Accessibility className="h-6 w-6 text-primary shrink-0" />
          <span>Políticas afirmativas (item 1.3)</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Políticas de inclusão, permanência e acessibilidade do programa. Item obrigatório na
          avaliação 2025–2028; neste momento é apenas um texto, sem indicador calculado.
        </p>
      </div>

      {carregando ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <PoliticasAfirmativasEditor
          texto={texto}
          podeEditar={podeEditar}
          salvando={salvando}
          onSalvar={salvar}
        />
      )}
    </div>
  )
}
