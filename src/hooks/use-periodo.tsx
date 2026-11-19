import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react'
import { useAuth } from '@/hooks/use-auth'
import { listarPeriodos, obterConfiguracao } from '@/services/periodos'
import {
  CONFIGURACAO_PADRAO,
  PERIODO_PADRAO,
  janelaLattes,
  type ConfiguracaoPpg,
  type PeriodoAvaliacao,
} from '@/lib/periodos/periodo'
import type { JanelaAnos } from '@/lib/lattes/quadrienio'

/**
 * Período de avaliação ativo e janela do Lattes (D-32), disponíveis para as telas.
 * Sem provider (testes) ou se a leitura falhar, vale o padrão: 2025–2028 e Lattes desde 2020.
 */
export interface PeriodoContextType {
  /** Período de avaliação ativo. */
  periodo: PeriodoAvaliacao
  /** Todos os períodos cadastrados, do mais recente ao mais antigo. */
  periodos: PeriodoAvaliacao[]
  configuracao: ConfiguracaoPpg
  /** Janela padrão do import do Lattes. */
  janelaLattes: JanelaAnos
  carregando: boolean
  recarregar: () => Promise<void>
}

function valorPadrao(): PeriodoContextType {
  return {
    periodo: PERIODO_PADRAO,
    periodos: [PERIODO_PADRAO],
    configuracao: CONFIGURACAO_PADRAO,
    janelaLattes: janelaLattes(CONFIGURACAO_PADRAO, PERIODO_PADRAO),
    carregando: false,
    recarregar: async () => {},
  }
}

const PeriodoContext = createContext<PeriodoContextType>(valorPadrao())

export function PeriodoProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [periodos, setPeriodos] = useState<PeriodoAvaliacao[]>([])
  const [configuracao, setConfiguracao] = useState<ConfiguracaoPpg>(CONFIGURACAO_PADRAO)
  const [carregando, setCarregando] = useState(false)

  const recarregar = useCallback(async () => {
    setCarregando(true)
    try {
      const [lista, config] = await Promise.all([listarPeriodos(), obterConfiguracao()])
      setPeriodos(lista)
      setConfiguracao(config)
    } catch (err) {
      // Sem leitura (rede, RLS ou migração ainda não aplicada): segue com o padrão
      console.warn('Não foi possível ler os períodos de avaliação; usando o padrão.', err)
      setPeriodos([])
      setConfiguracao(CONFIGURACAO_PADRAO)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    if (user) void recarregar()
  }, [user?.id, recarregar])

  const valor = useMemo<PeriodoContextType>(() => {
    const periodo = periodos.find((p) => p.ativo) ?? PERIODO_PADRAO
    return {
      periodo,
      periodos: periodos.length > 0 ? periodos : [PERIODO_PADRAO],
      configuracao,
      janelaLattes: janelaLattes(configuracao, periodo),
      carregando,
      recarregar,
    }
  }, [periodos, configuracao, carregando, recarregar])

  return <PeriodoContext.Provider value={valor}>{children}</PeriodoContext.Provider>
}

export function usePeriodo(): PeriodoContextType {
  return useContext(PeriodoContext)
}
