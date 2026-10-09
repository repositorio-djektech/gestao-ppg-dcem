import { useEffect, useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  User,
  FileText,
  Users2,
  ClipboardList,
  FlaskConical,
  Award,
  Wrench,
  Lightbulb,
  Calendar,
  Plane,
  HeartHandshake,
  Loader2,
  Database,
  ExternalLink,
  ChevronDown,
  Printer,
  CheckSquare,
  Square,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import type {
  Docente,
  Publicacao,
  Orientacao,
  Banca,
  ProjetoPesquisa,
  Premicao as Premiacao,
  ProducaoTecnica,
  Patente,
  Evento,
  Mobilidade,
  ImpactoSocial,
} from '@/types/database'

export interface VisualizarDocenteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  docente: Docente | null
}

type TabKey =
  | 'geral'
  | 'publicacoes'
  | 'orientacoes'
  | 'bancas'
  | 'projetos'
  | 'premiacoes'
  | 'producao_tecnica'
  | 'patentes'
  | 'eventos'
  | 'mobilidade'
  | 'impacto_social'

interface DadosDocenteCompleto {
  docente: Docente | null
  publicacoes: Publicacao[]
  orientacoes: (Orientacao & { discente_nome?: string })[]
  bancas: (Banca & { discente_nome?: string })[]
  projetos: ProjetoPesquisa[]
  premiacoes: Premiacao[]
  producaoTecnica: ProducaoTecnica[]
  patentes: Patente[]
  eventos: Evento[]
  mobilidade: Mobilidade[]
  impactoSocial: ImpactoSocial[]
}

const ITENS_POR_PAGINA = 10

function textoSeguro(val: unknown): string {
  if (val === null || val === undefined) return '—'
  if (Array.isArray(val)) {
    const limpo = val.filter((x) => x !== null && x !== undefined && String(x).trim() !== '')
    return limpo.length > 0 ? limpo.join(', ') : '—'
  }
  const str = String(val).trim()
  return str.length > 0 ? str : '—'
}

// Extrai tokens relevantes do nome do docente (ex: ["ledjane", "silva", "barreto"])
function extrairTermosNome(nome: string): string[] {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(
      (p) =>
        p.length > 2 && !['dr', 'dra', 'prof', 'profa', 'dos', 'das', 'da', 'de', 'do'].includes(p),
    )
}

function docenteCorresponde(texto: string | null | undefined, termos: string[]): boolean {
  if (!texto) return false
  const norm = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (termos.length === 0) return false
  // Se contiver o primeiro ou o último sobrenome
  return termos.some((termo) => norm.includes(termo))
}

export function VisualizarDocenteDialog({
  open,
  onOpenChange,
  docente,
}: VisualizarDocenteDialogProps) {
  const [loading, setLoading] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState<TabKey>('geral')
  const [dados, setDados] = useState<DadosDocenteCompleto>({
    docente: null,
    publicacoes: [],
    orientacoes: [],
    bancas: [],
    projetos: [],
    premiacoes: [],
    producaoTecnica: [],
    patentes: [],
    eventos: [],
    mobilidade: [],
    impactoSocial: [],
  })

  // Estado do Modal de Seleção de Abas para Impressão
  const [modalImprimirAberto, setModalImprimirAberto] = useState(false)
  const [abasSelecionadasParaImprimir, setAbasSelecionadasParaImprimir] = useState<
    Record<TabKey, boolean>
  >({
    geral: true,
    publicacoes: true,
    orientacoes: true,
    bancas: true,
    projetos: true,
    premiacoes: true,
    producao_tecnica: true,
    patentes: true,
    eventos: true,
    mobilidade: true,
    impacto_social: true,
  })

  const todasAbasSelecionadas = useMemo(() => {
    return Object.values(abasSelecionadasParaImprimir).every(Boolean)
  }, [abasSelecionadasParaImprimir])

  const alternarTodasAbas = (marcar: boolean) => {
    setAbasSelecionadasParaImprimir({
      geral: marcar,
      publicacoes: marcar,
      orientacoes: marcar,
      bancas: marcar,
      projetos: marcar,
      premiacoes: marcar,
      producao_tecnica: marcar,
      patentes: marcar,
      eventos: marcar,
      mobilidade: marcar,
      impacto_social: marcar,
    })
  }

  const alternarAbaIndividual = (tab: TabKey, checked: boolean) => {
    setAbasSelecionadasParaImprimir((prev) => ({
      ...prev,
      [tab]: checked,
    }))
  }

  const totalAbasSelecionadas = useMemo(() => {
    return Object.values(abasSelecionadasParaImprimir).filter(Boolean).length
  }, [abasSelecionadasParaImprimir])

  const executarImpressao = () => {
    setModalImprimirAberto(false)
    // Timeout para o Radix dialog do modal de impressão desmontar seu overlay
    setTimeout(() => {
      window.print()
    }, 200)
  }

  const currentDateFormatted = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const renderDocumentoImpressao = () => {
    const doc = dados.docente || docente
    if (!doc) return null

    return (
      <div className="docente-print-document text-slate-900 p-0 m-0">
        {/* Cabeçalho Institucional ABNT */}
        <header className="print-header border-b-2 border-slate-900 pb-3 mb-5">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider font-bold text-slate-700">
                Programa de Pós-Graduação em Ciência e Engenharia de Materiais — PPG DCEM
              </p>
              <h1 className="text-xl font-bold text-slate-900 mt-1">
                Relatório Curricular Individual — {doc.nome}
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Dados cadastrais e produção acadêmica registrada no sistema de avaliação
              </p>
            </div>
            <div className="text-right text-xs text-slate-500 shrink-0">
              <p className="font-medium text-slate-700">Data de emissão:</p>
              <p>{currentDateFormatted}</p>
              <p className="mt-1 font-mono font-medium text-slate-800">
                {totalGeralRegistros} registro(s) associado(s)
              </p>
            </div>
          </div>
        </header>

        {/* 1. Aba Geral (Dados Cadastrais) se selecionada */}
        {abasSelecionadasParaImprimir.geral && (
          <section className="mb-6 page-break-inside-avoid">
            <h2 className="text-sm font-bold uppercase tracking-wide border-b border-slate-400 pb-1 mb-2 text-slate-900">
              1. Identificação e Índices Bibliométricos
            </h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs mb-4">
              <div>
                <span className="font-bold text-slate-700">Nome Completo:</span>{' '}
                <span>{textoSeguro(doc.nome)}</span>
              </div>
              <div>
                <span className="font-bold text-slate-700">ID Lattes (CNPq):</span>{' '}
                <span className="font-mono">{doc.id_lattes || '—'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-700">Scopus Author ID:</span>{' '}
                <span className="font-mono">{doc.scopus_id || '—'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-700">OpenAlex ID:</span>{' '}
                <span className="font-mono">{doc.openalex_id || '—'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-700">Índice-H:</span>{' '}
                <span className="font-mono font-bold">{doc.indice_h ?? 0}</span>
              </div>
              <div>
                <span className="font-bold text-slate-700">Bolsa Produtividade CNPq:</span>{' '}
                <span>{doc.bolsa_cnpq || '—'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-700">Jovem Doutor Pesquisador (JDP):</span>{' '}
                <span>{doc.jdp ? 'Sim' : 'Não'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-700">Licença:</span>{' '}
                <span>{doc.licenca || '—'}</span>
              </div>
            </div>
          </section>
        )}

        {/* 2. Publicações */}
        {abasSelecionadasParaImprimir.publicacoes && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wide border-b border-slate-400 pb-1 mb-2 text-slate-900">
              Publicações em Periódicos ({dados.publicacoes.length})
            </h2>
            {dados.publicacoes.length === 0 ? (
              <p className="text-xs text-slate-500 italic mb-3">Nenhuma publicação registrada.</p>
            ) : (
              <table className="w-full text-left border-collapse print-table mb-4">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-300 text-xs text-slate-900 uppercase">
                    <th className="py-1 px-2 w-12 text-center font-bold">Ano</th>
                    <th className="py-1 px-2 w-[45%] font-bold">Título</th>
                    <th className="py-1 px-2 w-[20%] font-bold">Periódico</th>
                    <th className="py-1 px-2 w-[25%] font-bold">Autores</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {dados.publicacoes.map((pub) => (
                    <tr key={pub.id}>
                      <td className="py-1 px-2 text-center font-mono font-semibold">
                        {pub.ano || '—'}
                      </td>
                      <td className="py-1 px-2 font-medium">
                        {pub.titulo}
                        {pub.doi && (
                          <span className="block text-[10px] text-slate-500 font-mono">
                            DOI: {pub.doi}
                          </span>
                        )}
                      </td>
                      <td className="py-1 px-2 text-slate-700">{pub.periodico || '—'}</td>
                      <td className="py-1 px-2 text-slate-600">{pub.autores || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {/* 3. Orientações */}
        {abasSelecionadasParaImprimir.orientacoes && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wide border-b border-slate-400 pb-1 mb-2 text-slate-900">
              Orientações e Supervisões ({dados.orientacoes.length})
            </h2>
            {dados.orientacoes.length === 0 ? (
              <p className="text-xs text-slate-500 italic mb-3">Nenhuma orientação registrada.</p>
            ) : (
              <table className="w-full text-left border-collapse print-table mb-4">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-300 text-xs text-slate-900 uppercase">
                    <th className="py-1 px-2 w-[18%] font-bold">Tipo</th>
                    <th className="py-1 px-2 w-[35%] font-bold">Discente</th>
                    <th className="py-1 px-2 w-[18%] font-bold">Período</th>
                    <th className="py-1 px-2 w-[14%] font-bold">Status</th>
                    <th className="py-1 px-2 font-bold">Observações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {dados.orientacoes.map((ori) => (
                    <tr key={ori.id}>
                      <td className="py-1 px-2 font-semibold">{ori.tipo || '—'}</td>
                      <td className="py-1 px-2 font-medium">{ori.discente_nome || '—'}</td>
                      <td className="py-1 px-2 font-mono">
                        {ori.inicio || '—'} {ori.fim ? `– ${ori.fim}` : ''}
                      </td>
                      <td className="py-1 px-2 capitalize">{ori.status || '—'}</td>
                      <td className="py-1 px-2 text-slate-600">{ori.observacoes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {/* 4. Bancas */}
        {abasSelecionadasParaImprimir.bancas && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wide border-b border-slate-400 pb-1 mb-2 text-slate-900">
              Bancas Examinadoras ({dados.bancas.length})
            </h2>
            {dados.bancas.length === 0 ? (
              <p className="text-xs text-slate-500 italic mb-3">Nenhuma banca registrada.</p>
            ) : (
              <table className="w-full text-left border-collapse print-table mb-4">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-300 text-xs text-slate-900 uppercase">
                    <th className="py-1 px-2 w-[15%] font-bold">Tipo</th>
                    <th className="py-1 px-2 w-[40%] font-bold">Trabalho</th>
                    <th className="py-1 px-2 w-[20%] font-bold">Candidato</th>
                    <th className="py-1 px-2 w-[12%] font-bold">Data</th>
                    <th className="py-1 px-2 font-bold">Membros</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {dados.bancas.map((banca) => (
                    <tr key={banca.id}>
                      <td className="py-1 px-2">{banca.tipo || '—'}</td>
                      <td className="py-1 px-2 font-medium">{banca.titulo_trabalho || '—'}</td>
                      <td className="py-1 px-2">{banca.discente_nome || '—'}</td>
                      <td className="py-1 px-2 font-mono">{banca.data || '—'}</td>
                      <td className="py-1 px-2 text-slate-600">{banca.membros || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {/* 5. Projetos */}
        {abasSelecionadasParaImprimir.projetos && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wide border-b border-slate-400 pb-1 mb-2 text-slate-900">
              Projetos de Pesquisa ({dados.projetos.length})
            </h2>
            {dados.projetos.length === 0 ? (
              <p className="text-xs text-slate-500 italic mb-3">Nenhum projeto registrado.</p>
            ) : (
              <table className="w-full text-left border-collapse print-table mb-4">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-300 text-xs text-slate-900 uppercase">
                    <th className="py-1 px-2 w-[40%] font-bold">Título</th>
                    <th className="py-1 px-2 w-[18%] font-bold">Período</th>
                    <th className="py-1 px-2 w-[18%] font-bold">Financiamento</th>
                    <th className="py-1 px-2 font-bold">Descrição</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {dados.projetos.map((proj) => (
                    <tr key={proj.id}>
                      <td className="py-1 px-2 font-medium">{proj.titulo}</td>
                      <td className="py-1 px-2 font-mono">
                        {proj.inicio || '—'} {proj.fim ? `– ${proj.fim}` : ''}
                      </td>
                      <td className="py-1 px-2">
                        {proj.financiamento ? `Sim (${proj.orgao_fomento || 'Fomento'})` : 'Não'}
                      </td>
                      <td className="py-1 px-2 text-slate-600">{proj.descricao || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {/* 6. Premiações */}
        {abasSelecionadasParaImprimir.premiacoes && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wide border-b border-slate-400 pb-1 mb-2 text-slate-900">
              Premiações e Distinções ({dados.premiacoes.length})
            </h2>
            {dados.premiacoes.length === 0 ? (
              <p className="text-xs text-slate-500 italic mb-3">Nenhuma premiação registrada.</p>
            ) : (
              <table className="w-full text-left border-collapse print-table mb-4">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-300 text-xs text-slate-900 uppercase">
                    <th className="py-1 px-2 w-16 text-center font-bold">Ano</th>
                    <th className="py-1 px-2 w-[50%] font-bold">Título</th>
                    <th className="py-1 px-2 font-bold">Entidade Promotora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {dados.premiacoes.map((prem) => (
                    <tr key={prem.id}>
                      <td className="py-1 px-2 text-center font-mono">{prem.ano ?? '—'}</td>
                      <td className="py-1 px-2 font-medium">{prem.titulo}</td>
                      <td className="py-1 px-2 text-slate-600">{prem.instituicao || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {/* 7. Produção Técnica */}
        {abasSelecionadasParaImprimir.producao_tecnica && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wide border-b border-slate-400 pb-1 mb-2 text-slate-900">
              Produção Técnica e Tecnológica ({dados.producaoTecnica.length})
            </h2>
            {dados.producaoTecnica.length === 0 ? (
              <p className="text-xs text-slate-500 italic mb-3">
                Nenhuma produção técnica registrada.
              </p>
            ) : (
              <table className="w-full text-left border-collapse print-table mb-4">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-300 text-xs text-slate-900 uppercase">
                    <th className="py-1 px-2 w-[15%] font-bold">Tipo</th>
                    <th className="py-1 px-2 w-14 text-center font-bold">Ano</th>
                    <th className="py-1 px-2 w-[45%] font-bold">Título</th>
                    <th className="py-1 px-2 font-bold">Autores</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {dados.producaoTecnica.map((pt) => (
                    <tr key={pt.id}>
                      <td className="py-1 px-2">{pt.tipo || '—'}</td>
                      <td className="py-1 px-2 text-center font-mono">{pt.ano ?? '—'}</td>
                      <td className="py-1 px-2 font-medium">{pt.titulo}</td>
                      <td className="py-1 px-2 text-slate-600">{pt.autores || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {/* 8. Patentes */}
        {abasSelecionadasParaImprimir.patentes && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wide border-b border-slate-400 pb-1 mb-2 text-slate-900">
              Patentes e Propriedade Intelectual ({dados.patentes.length})
            </h2>
            {dados.patentes.length === 0 ? (
              <p className="text-xs text-slate-500 italic mb-3">Nenhuma patente registrada.</p>
            ) : (
              <table className="w-full text-left border-collapse print-table mb-4">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-300 text-xs text-slate-900 uppercase">
                    <th className="py-1 px-2 w-[40%] font-bold">Título</th>
                    <th className="py-1 px-2 w-[20%] font-bold">Registro INPI</th>
                    <th className="py-1 px-2 w-[15%] font-bold">Status</th>
                    <th className="py-1 px-2 font-bold">Autores</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {dados.patentes.map((pat) => (
                    <tr key={pat.id}>
                      <td className="py-1 px-2 font-medium">{pat.titulo}</td>
                      <td className="py-1 px-2 font-mono">{pat.inpi || '—'}</td>
                      <td className="py-1 px-2">{pat.status || 'Pendente'}</td>
                      <td className="py-1 px-2 text-slate-600">{pat.autores || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {/* 9. Eventos */}
        {abasSelecionadasParaImprimir.eventos && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wide border-b border-slate-400 pb-1 mb-2 text-slate-900">
              Participação em Eventos ({dados.eventos.length})
            </h2>
            {dados.eventos.length === 0 ? (
              <p className="text-xs text-slate-500 italic mb-3">Nenhum evento registrado.</p>
            ) : (
              <table className="w-full text-left border-collapse print-table mb-4">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-300 text-xs text-slate-900 uppercase">
                    <th className="py-1 px-2 w-[35%] font-bold">Evento</th>
                    <th className="py-1 px-2 w-[20%] font-bold">Papel</th>
                    <th className="py-1 px-2 w-[20%] font-bold">Local / Data</th>
                    <th className="py-1 px-2 font-bold">Observações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {dados.eventos.map((eve) => (
                    <tr key={eve.id}>
                      <td className="py-1 px-2 font-medium">{eve.evento}</td>
                      <td className="py-1 px-2">{eve.papel || '—'}</td>
                      <td className="py-1 px-2">{eve.local_data || '—'}</td>
                      <td className="py-1 px-2 text-slate-600">{eve.observacoes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {/* 10. Mobilidade */}
        {abasSelecionadasParaImprimir.mobilidade && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wide border-b border-slate-400 pb-1 mb-2 text-slate-900">
              Mobilidade Acadêmica e Cooperação ({dados.mobilidade.length})
            </h2>
            {dados.mobilidade.length === 0 ? (
              <p className="text-xs text-slate-500 italic mb-3">Nenhum registro de mobilidade.</p>
            ) : (
              <table className="w-full text-left border-collapse print-table mb-4">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-300 text-xs text-slate-900 uppercase">
                    <th className="py-1 px-2 w-[18%] font-bold">Modalidade</th>
                    <th className="py-1 px-2 w-[35%] font-bold">Instituição</th>
                    <th className="py-1 px-2 w-[20%] font-bold">Período</th>
                    <th className="py-1 px-2 font-bold">Observações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {dados.mobilidade.map((mob) => (
                    <tr key={mob.id}>
                      <td className="py-1 px-2 capitalize">{mob.modalidade || '—'}</td>
                      <td className="py-1 px-2 font-medium">{mob.instituicao}</td>
                      <td className="py-1 px-2 font-mono">{mob.periodo || '—'}</td>
                      <td className="py-1 px-2 text-slate-600">{mob.observacoes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {/* 11. Impacto Social */}
        {abasSelecionadasParaImprimir.impacto_social && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wide border-b border-slate-400 pb-1 mb-2 text-slate-900">
              Impacto Social e Extensão ({dados.impactoSocial.length})
            </h2>
            {dados.impactoSocial.length === 0 ? (
              <p className="text-xs text-slate-500 italic mb-3">
                Nenhum registro de impacto social.
              </p>
            ) : (
              <table className="w-full text-left border-collapse print-table mb-4">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-300 text-xs text-slate-900 uppercase">
                    <th className="py-1 px-2 w-14 text-center font-bold">Ano</th>
                    <th className="py-1 px-2 w-[40%] font-bold">Título da Ação</th>
                    <th className="py-1 px-2 font-bold">Descrição e Impacto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {dados.impactoSocial.map((imp) => (
                    <tr key={imp.id}>
                      <td className="py-1 px-2 text-center font-mono">{imp.ano ?? '—'}</td>
                      <td className="py-1 px-2 font-medium">{imp.titulo}</td>
                      <td className="py-1 px-2 text-slate-600">{imp.descricao || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {/* Rodapé ABNT */}
        <footer className="print-footer mt-6 pt-3 border-t border-slate-300 flex justify-between items-center text-[10px] text-slate-500">
          <div>PPG-DCEM — Programa de Pós-Graduação em Ciência e Engenharia de Materiais / UFS</div>
          <div>Documento gerado automaticamente pelo Sistema Gestão PPG-DCEM</div>
        </footer>
      </div>
    )
  }

  const [limitesPaginacao, setLimitesPaginacao] = useState<Record<TabKey, number>>({
    geral: ITENS_POR_PAGINA,
    publicacoes: ITENS_POR_PAGINA,
    orientacoes: ITENS_POR_PAGINA,
    bancas: ITENS_POR_PAGINA,
    projetos: ITENS_POR_PAGINA,
    premiacoes: ITENS_POR_PAGINA,
    producao_tecnica: ITENS_POR_PAGINA,
    patentes: ITENS_POR_PAGINA,
    eventos: ITENS_POR_PAGINA,
    mobilidade: ITENS_POR_PAGINA,
    impacto_social: ITENS_POR_PAGINA,
  })

  useEffect(() => {
    if (!open || !docente) return

    setAbaAtiva('geral')
    setLimitesPaginacao({
      geral: ITENS_POR_PAGINA,
      publicacoes: ITENS_POR_PAGINA,
      orientacoes: ITENS_POR_PAGINA,
      bancas: ITENS_POR_PAGINA,
      projetos: ITENS_POR_PAGINA,
      premiacoes: ITENS_POR_PAGINA,
      producao_tecnica: ITENS_POR_PAGINA,
      patentes: ITENS_POR_PAGINA,
      eventos: ITENS_POR_PAGINA,
      mobilidade: ITENS_POR_PAGINA,
      impacto_social: ITENS_POR_PAGINA,
    })

    let ativo = true
    setLoading(true)

    async function carregarTodosDados() {
      if (!docente) return
      try {
        const termosNome = extrairTermosNome(docente.nome)

        // 1. Docente atualizado do banco
        const docentePromise = supabase
          .from('docentes')
          .select('*')
          .eq('id', docente.id)
          .maybeSingle()

        // 2. Orientações vinculadas diretamente ao docente_id com discente
        const orientacoesPromise = supabase
          .from('orientacoes')
          .select('*, discentes(id, nome)')
          .eq('docente_id', docente.id)
          .order('inicio', { ascending: false })

        // 3. Projetos de pesquisa coordenados pelo docente
        const projetosPromise = supabase
          .from('projetos_pesquisa')
          .select('*')
          .eq('coordenador_id', docente.id)
          .order('inicio', { ascending: false })

        // 4. Tabelas com texto (publicacoes, bancas, eventos, premiacoes, producao_tecnica, patentes, mobilidade, impacto_social)
        const publicacoesPromise = supabase
          .from('publicacoes')
          .select('*')
          .order('ano', { ascending: false })

        const bancasPromise = supabase
          .from('bancas')
          .select('*, discentes(id, nome)')
          .order('data', { ascending: false })

        const premiacoesPromise = supabase
          .from('premiacoes')
          .select('*')
          .order('ano', { ascending: false })

        const producaoTecnicaPromise = supabase
          .from('producao_tecnica')
          .select('*')
          .order('ano', { ascending: false })

        const patentesPromise = supabase
          .from('patentes')
          .select('*')
          .order('created_at', { ascending: false })

        const eventosPromise = supabase
          .from('eventos')
          .select('*')
          .order('created_at', { ascending: false })

        const mobilidadePromise = supabase
          .from('mobilidade_docente')
          .select('*')
          .order('created_at', { ascending: false })

        const impactoSocialPromise = supabase
          .from('impacto_social')
          .select('*')
          .order('ano', { ascending: false })

        const [
          resDocente,
          resOrientacoes,
          resProjetos,
          resPublicacoes,
          resBancas,
          resPremiacoes,
          resProducaoTecnica,
          resPatentes,
          resEventos,
          resMobilidade,
          resImpactoSocial,
        ] = await Promise.all([
          docentePromise,
          orientacoesPromise,
          projetosPromise,
          publicacoesPromise,
          bancasPromise,
          premiacoesPromise,
          producaoTecnicaPromise,
          patentesPromise,
          eventosPromise,
          mobilidadePromise,
          impactoSocialPromise,
        ])

        if (!ativo) return

        // Mapeia orientações com nome do discente
        const orientacoesFormatadas = ((resOrientacoes.data as any[]) || []).map((ori) => ({
          ...ori,
          discente_nome: ori.discentes?.nome || '—',
        }))

        // Filtra publicações pelo autor
        const publicacoesFiltradas = ((resPublicacoes.data as Publicacao[]) || []).filter((pub) =>
          docenteCorresponde(pub.autores, termosNome),
        )

        // Filtra bancas pelos membros
        const bancasFiltradas = ((resBancas.data as any[]) || [])
          .filter((banca) => docenteCorresponde(banca.membros, termosNome))
          .map((banca) => ({
            ...banca,
            discente_nome: banca.discentes?.nome || '—',
          }))

        // Filtra premiações pelo nome do premiado
        const premiacoesFiltradas = ((resPremiacoes.data as Premiacao[]) || []).filter((prem) =>
          docenteCorresponde(prem.nome_premiado, termosNome),
        )

        // Filtra produção técnica pelos autores
        const producaoTecnicaFiltrada = (
          (resProducaoTecnica.data as ProducaoTecnica[]) || []
        ).filter((pt) => docenteCorresponde(pt.autores, termosNome))

        // Filtra patentes pelos autores
        const patentesFiltradas = ((resPatentes.data as Patente[]) || []).filter((pat) =>
          docenteCorresponde(pat.autores, termosNome),
        )

        // Filtra eventos pelo docente
        const eventosFiltrados = ((resEventos.data as Evento[]) || []).filter((eve) =>
          docenteCorresponde(eve.docente, termosNome),
        )

        // Filtra mobilidade pelo nome
        const mobilidadeFiltrada = ((resMobilidade.data as Mobilidade[]) || []).filter((mob) =>
          docenteCorresponde(mob.nome, termosNome),
        )

        // Impacto social: projetos com impacto ou menção ao docente
        const impactoSocialFiltrado = ((resImpactoSocial.data as ImpactoSocial[]) || []).filter(
          (imp) =>
            docenteCorresponde(imp.descricao, termosNome) ||
            docenteCorresponde(imp.titulo, termosNome),
        )

        setDados({
          docente: (resDocente.data as Docente) || docente,
          publicacoes: publicacoesFiltradas,
          orientacoes: orientacoesFormatadas,
          bancas: bancasFiltradas,
          projetos: (resProjetos.data as ProjetoPesquisa[]) || [],
          premiacoes: premiacoesFiltradas,
          producaoTecnica: producaoTecnicaFiltrada,
          patentes: patentesFiltradas,
          eventos: eventosFiltrados,
          mobilidade: mobilidadeFiltrada,
          impactoSocial: impactoSocialFiltrado,
        })
      } catch (err) {
        console.error('Erro ao carregar dados completos do docente:', err)
      } finally {
        if (ativo) setLoading(false)
      }
    }

    carregarTodosDados()

    return () => {
      ativo = false
    }
  }, [open, docente])

  const abasDefinicao: Array<{
    id: TabKey
    rotulo: string
    icone: React.ComponentType<{ className?: string }>
    total: number
  }> = useMemo(
    () => [
      { id: 'geral', rotulo: 'Dados Cadastrais', icone: User, total: 1 },
      {
        id: 'publicacoes',
        rotulo: 'Publicações',
        icone: FileText,
        total: dados.publicacoes.length,
      },
      { id: 'orientacoes', rotulo: 'Orientações', icone: Users2, total: dados.orientacoes.length },
      { id: 'bancas', rotulo: 'Bancas', icone: ClipboardList, total: dados.bancas.length },
      { id: 'projetos', rotulo: 'Projetos', icone: FlaskConical, total: dados.projetos.length },
      { id: 'premiacoes', rotulo: 'Premiações', icone: Award, total: dados.premiacoes.length },
      {
        id: 'producao_tecnica',
        rotulo: 'Produção Técnica',
        icone: Wrench,
        total: dados.producaoTecnica.length,
      },
      { id: 'patentes', rotulo: 'Patentes', icone: Lightbulb, total: dados.patentes.length },
      { id: 'eventos', rotulo: 'Eventos', icone: Calendar, total: dados.eventos.length },
      { id: 'mobilidade', rotulo: 'Mobilidade', icone: Plane, total: dados.mobilidade.length },
      {
        id: 'impacto_social',
        rotulo: 'Impacto Social',
        icone: HeartHandshake,
        total: dados.impactoSocial.length,
      },
    ],
    [dados],
  )

  const totalGeralRegistros = useMemo(
    () =>
      dados.publicacoes.length +
      dados.orientacoes.length +
      dados.bancas.length +
      dados.projetos.length +
      dados.premiacoes.length +
      dados.producaoTecnica.length +
      dados.patentes.length +
      dados.eventos.length +
      dados.mobilidade.length +
      dados.impactoSocial.length,
    [dados],
  )

  const carregarMais = (tab: TabKey) => {
    setLimitesPaginacao((prev) => ({
      ...prev,
      [tab]: prev[tab] + ITENS_POR_PAGINA,
    }))
  }

  const renderAbaGeral = () => {
    const doc = dados.docente || docente
    if (!doc) return null

    return (
      <div className="space-y-4 p-4 overflow-y-auto max-h-full">
        <div className="bg-slate-50 dark:bg-neutral-800/60 rounded-lg p-4 border border-slate-200 dark:border-neutral-700">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-neutral-100 mb-3 flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Identificação e Índices Bibliométricos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-500 dark:text-neutral-400 font-medium block">
                Nome Completo:
              </span>
              <span className="text-slate-900 dark:text-neutral-100 font-semibold text-sm">
                {textoSeguro(doc.nome)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-neutral-400 font-medium block">
                ID Lattes (CNPq):
              </span>
              {doc.id_lattes ? (
                <a
                  href={`http://lattes.cnpq.br/${doc.id_lattes}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-primary hover:underline inline-flex items-center gap-1 font-semibold"
                >
                  {doc.id_lattes}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </div>
            <div>
              <span className="text-slate-500 dark:text-neutral-400 font-medium block">
                Scopus Author ID:
              </span>
              {doc.scopus_id ? (
                <a
                  href={`https://www.scopus.com/authid/detail.uri?authorId=${doc.scopus_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-semibold"
                >
                  {doc.scopus_id}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </div>
            <div>
              <span className="text-slate-500 dark:text-neutral-400 font-medium block">
                OpenAlex ID:
              </span>
              {doc.openalex_id ? (
                <a
                  href={`https://openalex.org/${doc.openalex_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-indigo-700 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-semibold"
                >
                  {doc.openalex_id}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </div>
            <div>
              <span className="text-slate-500 dark:text-neutral-400 font-medium block">
                Índice-H:
              </span>
              <Badge
                variant="outline"
                className="font-mono font-bold text-slate-800 dark:text-neutral-200 mt-0.5"
              >
                {doc.indice_h ?? 0}
              </Badge>
            </div>
            <div>
              <span className="text-slate-500 dark:text-neutral-400 font-medium block">
                Bolsa Produtividade CNPq:
              </span>
              {doc.bolsa_cnpq ? (
                <Badge
                  variant="secondary"
                  className="bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-medium mt-0.5"
                >
                  {doc.bolsa_cnpq}
                </Badge>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </div>
            <div>
              <span className="text-slate-500 dark:text-neutral-400 font-medium block">
                Jovem Doutor Pesquisador (JDP):
              </span>
              {doc.jdp ? (
                <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-0 mt-0.5">
                  Sim
                </Badge>
              ) : (
                <span className="text-slate-400">Não</span>
              )}
            </div>
            <div className="md:col-span-2">
              <span className="text-slate-500 dark:text-neutral-400 font-medium block">
                Licença Saúde / Parental:
              </span>
              {doc.licenca ? (
                <span className="text-amber-700 dark:text-amber-400 font-medium">
                  {doc.licenca}
                </span>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-neutral-800/60 rounded-lg p-4 border border-slate-200 dark:border-neutral-700">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-neutral-100 mb-3 flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            Resumo dos Registros Associados no Banco
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {abasDefinicao
              .filter((a) => a.id !== 'geral')
              .map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setAbaAtiva(item.id)}
                  className="p-2.5 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-left hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400 mb-1">
                    <span className="truncate">{item.rotulo}</span>
                    <item.icone className="h-3.5 w-3.5 text-primary shrink-0" />
                  </div>
                  <div className="text-base font-bold text-slate-900 dark:text-neutral-100 font-mono">
                    {item.total}
                  </div>
                </button>
              ))}
          </div>
        </div>
      </div>
    )
  }

  const renderAbaPublicacoes = () => {
    const itens = dados.publicacoes
    const limite = limitesPaginacao.publicacoes
    const visiveis = itens.slice(0, limite)

    if (itens.length === 0) {
      return renderEstadoVazio('Nenhuma publicação encontrada para este docente.')
    }

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto border rounded-md bg-white dark:bg-neutral-900">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-neutral-800 sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[10%]">Ano</TableHead>
                <TableHead className="w-[45%]">Título</TableHead>
                <TableHead className="w-[20%]">Periódico</TableHead>
                <TableHead className="w-[25%]">Autores</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.map((pub) => (
                <TableRow key={pub.id}>
                  <TableCell className="font-mono text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    {pub.ano || '—'}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900 dark:text-neutral-100">
                    <div>{pub.titulo}</div>
                    {pub.doi && (
                      <a
                        href={pub.doi.startsWith('http') ? pub.doi : `https://doi.org/${pub.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-mono text-primary hover:underline inline-flex items-center gap-1 mt-0.5"
                      >
                        DOI: {pub.doi}
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 dark:text-neutral-400">
                    {pub.periodico || '—'}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 dark:text-neutral-400">
                    {pub.autores || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {renderPaginacao(itens.length, limite, () => carregarMais('publicacoes'))}
      </div>
    )
  }

  const renderAbaOrientacoes = () => {
    const itens = dados.orientacoes
    const limite = limitesPaginacao.orientacoes
    const visiveis = itens.slice(0, limite)

    if (itens.length === 0) {
      return renderEstadoVazio('Nenhuma orientação encontrada para este docente.')
    }

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto border rounded-md bg-white dark:bg-neutral-900">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-neutral-800 sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[15%]">Nível / Tipo</TableHead>
                <TableHead className="w-[30%]">Orientando (Discente)</TableHead>
                <TableHead className="w-[15%]">Período</TableHead>
                <TableHead className="w-[15%]">Status</TableHead>
                <TableHead className="w-[25%]">Detalhes / Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.map((ori) => (
                <TableRow key={ori.id}>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="text-xs font-semibold bg-slate-50 dark:bg-neutral-800"
                    >
                      {ori.tipo || '—'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-slate-900 dark:text-neutral-100">
                    {ori.discente_nome || '—'}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-600 dark:text-neutral-400">
                    {ori.inicio || '—'} {ori.fim ? `– ${ori.fim}` : ''}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] capitalize ${
                        ori.status === 'concluido'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : ori.status === 'ativo'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                      }`}
                    >
                      {ori.status || '—'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 dark:text-neutral-400">
                    {ori.observacoes || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {renderPaginacao(itens.length, limite, () => carregarMais('orientacoes'))}
      </div>
    )
  }

  const renderAbaBancas = () => {
    const itens = dados.bancas
    const limite = limitesPaginacao.bancas
    const visiveis = itens.slice(0, limite)

    if (itens.length === 0) {
      return renderEstadoVazio('Nenhuma banca de defesa ou qualificação encontrada.')
    }

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto border rounded-md bg-white dark:bg-neutral-900">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-neutral-800 sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[12%]">Tipo</TableHead>
                <TableHead className="w-[40%]">Título do Trabalho</TableHead>
                <TableHead className="w-[18%]">Candidato / Discente</TableHead>
                <TableHead className="w-[12%]">Data / Ano</TableHead>
                <TableHead className="w-[18%]">Membros</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.map((banca) => (
                <TableRow key={banca.id}>
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-semibold">
                      {banca.tipo || '—'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-slate-900 dark:text-neutral-100">
                    {banca.titulo_trabalho || '—'}
                  </TableCell>
                  <TableCell className="text-xs text-slate-700 dark:text-neutral-300">
                    {banca.discente_nome || '—'}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-600 dark:text-neutral-400">
                    {banca.data || '—'}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 dark:text-neutral-400">
                    {banca.membros || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {renderPaginacao(itens.length, limite, () => carregarMais('bancas'))}
      </div>
    )
  }

  const renderAbaProjetos = () => {
    const itens = dados.projetos
    const limite = limitesPaginacao.projetos
    const visiveis = itens.slice(0, limite)

    if (itens.length === 0) {
      return renderEstadoVazio('Nenhum projeto de pesquisa coordenado encontrado.')
    }

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto border rounded-md bg-white dark:bg-neutral-900">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-neutral-800 sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[40%]">Título do Projeto</TableHead>
                <TableHead className="w-[15%]">Período</TableHead>
                <TableHead className="w-[15%]">Financiamento</TableHead>
                <TableHead className="w-[15%]">Órgão de Fomento</TableHead>
                <TableHead className="w-[15%]">Descrição</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.map((proj) => (
                <TableRow key={proj.id}>
                  <TableCell className="font-medium text-slate-900 dark:text-neutral-100">
                    {proj.titulo}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-600 dark:text-neutral-400">
                    {proj.inicio || '—'} {proj.fim ? `– ${proj.fim}` : ''}
                  </TableCell>
                  <TableCell>
                    {proj.financiamento ? (
                      <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-0 text-xs">
                        Sim
                      </Badge>
                    ) : (
                      <span className="text-slate-400 text-xs">Não</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 dark:text-neutral-400">
                    {proj.orgao_fomento || '—'}
                  </TableCell>
                  <TableCell
                    className="text-xs text-slate-500 dark:text-neutral-400 max-w-xs truncate"
                    title={proj.descricao || ''}
                  >
                    {proj.descricao || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {renderPaginacao(itens.length, limite, () => carregarMais('projetos'))}
      </div>
    )
  }

  const renderAbaPremiacoes = () => {
    const itens = dados.premiacoes
    const limite = limitesPaginacao.premiacoes
    const visiveis = itens.slice(0, limite)

    if (itens.length === 0) {
      return renderEstadoVazio('Nenhuma premiação ou título honorífico registrado.')
    }

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto border rounded-md bg-white dark:bg-neutral-900">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-neutral-800 sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[12%]">Ano</TableHead>
                <TableHead className="w-[48%]">Título / Premiação</TableHead>
                <TableHead className="w-[40%]">Entidade Promotora</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.map((prem) => (
                <TableRow key={prem.id}>
                  <TableCell className="font-mono text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    {prem.ano ?? '—'}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900 dark:text-neutral-100">
                    {prem.titulo}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 dark:text-neutral-400">
                    {prem.instituicao || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {renderPaginacao(itens.length, limite, () => carregarMais('premiacoes'))}
      </div>
    )
  }

  const renderAbaProducaoTecnica = () => {
    const itens = dados.producaoTecnica
    const limite = limitesPaginacao.producao_tecnica
    const visiveis = itens.slice(0, limite)

    if (itens.length === 0) {
      return renderEstadoVazio('Nenhuma produção técnica registrada.')
    }

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto border rounded-md bg-white dark:bg-neutral-900">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-neutral-800 sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[15%]">Tipo</TableHead>
                <TableHead className="w-[10%]">Ano</TableHead>
                <TableHead className="w-[45%]">Título da Produção Técnica</TableHead>
                <TableHead className="w-[30%]">Autores / Equipe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.map((pt) => (
                <TableRow key={pt.id}>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {pt.tipo || 'Software'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-700 dark:text-neutral-300">
                    {pt.ano ?? '—'}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900 dark:text-neutral-100">
                    {pt.titulo}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 dark:text-neutral-400">
                    {pt.autores || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {renderPaginacao(itens.length, limite, () => carregarMais('producao_tecnica'))}
      </div>
    )
  }

  const renderAbaPatentes = () => {
    const itens = dados.patentes
    const limite = limitesPaginacao.patentes
    const visiveis = itens.slice(0, limite)

    if (itens.length === 0) {
      return renderEstadoVazio('Nenhuma patente registrada.')
    }

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto border rounded-md bg-white dark:bg-neutral-900">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-neutral-800 sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[40%]">Título da Patente</TableHead>
                <TableHead className="w-[18%]">Registro INPI</TableHead>
                <TableHead className="w-[15%]">Status</TableHead>
                <TableHead className="w-[27%]">Autores / Inventores</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.map((pat) => (
                <TableRow key={pat.id}>
                  <TableCell className="font-medium text-slate-900 dark:text-neutral-100">
                    {pat.titulo}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-700 dark:text-neutral-300">
                    {pat.inpi || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${
                        pat.status === 'Concessão'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : pat.status === 'Licenciamento'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {pat.status || 'Pendente'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 dark:text-neutral-400">
                    {pat.autores || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {renderPaginacao(itens.length, limite, () => carregarMais('patentes'))}
      </div>
    )
  }

  const renderAbaEventos = () => {
    const itens = dados.eventos
    const limite = limitesPaginacao.eventos
    const visiveis = itens.slice(0, limite)

    if (itens.length === 0) {
      return renderEstadoVazio('Nenhum evento registrado.')
    }

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto border rounded-md bg-white dark:bg-neutral-900">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-neutral-800 sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[35%]">Nome do Evento</TableHead>
                <TableHead className="w-[20%]">Papel / Participação</TableHead>
                <TableHead className="w-[20%]">Local e Data</TableHead>
                <TableHead className="w-[25%]">Observações / Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.map((eve) => (
                <TableRow key={eve.id}>
                  <TableCell className="font-medium text-slate-900 dark:text-neutral-100">
                    {eve.evento}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {eve.papel || 'Participante'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 dark:text-neutral-400">
                    {eve.local_data || '—'}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 dark:text-neutral-400">
                    {eve.observacoes || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {renderPaginacao(itens.length, limite, () => carregarMais('eventos'))}
      </div>
    )
  }

  const renderAbaMobilidade = () => {
    const itens = dados.mobilidade
    const limite = limitesPaginacao.mobilidade
    const visiveis = itens.slice(0, limite)

    if (itens.length === 0) {
      return renderEstadoVazio('Nenhum registro de mobilidade acadêmica encontrado.')
    }

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto border rounded-md bg-white dark:bg-neutral-900">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-neutral-800 sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[15%]">Modalidade</TableHead>
                <TableHead className="w-[35%]">Instituição de Destino</TableHead>
                <TableHead className="w-[20%]">Período</TableHead>
                <TableHead className="w-[30%]">Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.map((mob) => (
                <TableRow key={mob.id}>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">
                      {mob.modalidade || 'Nacional'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-slate-900 dark:text-neutral-100">
                    {mob.instituicao}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-600 dark:text-neutral-400">
                    {mob.periodo || '—'}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 dark:text-neutral-400">
                    {mob.observacoes || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {renderPaginacao(itens.length, limite, () => carregarMais('mobilidade'))}
      </div>
    )
  }

  const renderAbaImpactoSocial = () => {
    const itens = dados.impactoSocial
    const limite = limitesPaginacao.impacto_social
    const visiveis = itens.slice(0, limite)

    if (itens.length === 0) {
      return renderEstadoVazio('Nenhum registro de impacto social relacionado.')
    }

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto border rounded-md bg-white dark:bg-neutral-900">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-neutral-800 sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[10%]">Ano</TableHead>
                <TableHead className="w-[45%]">Título da Ação / Projeto</TableHead>
                <TableHead className="w-[45%]">Descrição e Impacto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.map((imp) => (
                <TableRow key={imp.id}>
                  <TableCell className="font-mono text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    {imp.ano ?? '—'}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900 dark:text-neutral-100">
                    {imp.titulo}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 dark:text-neutral-400">
                    {imp.descricao || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {renderPaginacao(itens.length, limite, () => carregarMais('impacto_social'))}
      </div>
    )
  }

  const renderEstadoVazio = (mensagem: string) => (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 dark:text-neutral-400">
      <Database className="h-8 w-8 text-slate-300 dark:text-neutral-600 mb-2" />
      <p className="text-sm font-medium">{mensagem}</p>
      <p className="text-xs text-slate-400 dark:text-neutral-500 mt-1 max-w-sm">
        Não constam registros associados para este docente nesta categoria no banco de dados.
      </p>
    </div>
  )

  const renderPaginacao = (total: number, limite: number, onMais: () => void) => {
    if (total <= ITENS_POR_PAGINA) return null
    return (
      <div className="pt-2.5 flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400 shrink-0">
        <span>
          Exibindo {Math.min(limite, total)} de {total} registros
        </span>
        {total > limite && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onMais}
            className="h-7 text-xs gap-1.5"
          >
            <ChevronDown className="h-3 w-3" />
            Carregar mais 10
          </Button>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[92vh] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-neutral-900">
        {/* Cabeçalho */}
        <DialogHeader className="p-5 pb-3 border-b bg-slate-50/80 dark:bg-neutral-900/80 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 text-xl text-slate-900 dark:text-neutral-100 truncate">
                <User className="h-5 w-5 text-primary shrink-0" />
                <span className="truncate">{docente?.nome ?? 'Visualização do Docente'}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600 dark:text-neutral-400 mt-1">
                Visualização somente-leitura dos dados curriculares e registros acadêmicos
                integrados no sistema.
              </DialogDescription>
            </div>

            {/* Badges de Resumo */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Badge
                variant="outline"
                className="bg-primary/10 text-primary border-primary/25 text-xs px-2.5 py-1 font-mono font-medium"
              >
                <strong>{totalGeralRegistros}</strong> registros totais
              </Badge>
              {docente?.id_lattes && (
                <Badge
                  variant="outline"
                  className="bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800 text-xs px-2 py-0.5 font-mono"
                  title="Currículo Lattes Vinculado"
                >
                  Lattes: {docente.id_lattes}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Corpo principal com Abas — Fundo claro destacado entre cabeçalho e rodapé */}
        <div className="flex-1 overflow-hidden p-5 flex flex-col min-h-0 bg-white dark:bg-neutral-900">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm font-medium">Carregando dados curriculares do docente...</p>
            </div>
          ) : (
            <Tabs
              value={abaAtiva}
              onValueChange={(val) => setAbaAtiva(val as TabKey)}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {/* Barra de Abas em Múltiplas Linhas */}
              <div className="pb-2 shrink-0 border-b">
                <TabsList className="bg-slate-100 dark:bg-neutral-800 p-1.5 h-auto flex flex-wrap w-full justify-start gap-1.5 rounded-lg">
                  {abasDefinicao.map(({ id, rotulo, icone: Icone, total }) => {
                    const ativo = abaAtiva === id
                    return (
                      <TabsTrigger
                        key={id}
                        value={id}
                        className={`text-xs px-2.5 py-1.5 gap-1.5 flex items-center rounded-md transition-colors ${
                          ativo
                            ? 'bg-white dark:bg-neutral-900 text-primary font-semibold shadow-xs ring-1 ring-slate-200 dark:ring-neutral-700'
                            : 'hover:bg-slate-200/60 dark:hover:bg-neutral-700/60 text-slate-700 dark:text-neutral-300'
                        }`}
                      >
                        <Icone className="h-3.5 w-3.5" />
                        <span>{rotulo}</span>
                        {id !== 'geral' && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                              total > 0
                                ? 'bg-primary/10 text-primary font-bold'
                                : 'bg-slate-200 dark:bg-neutral-700 text-slate-600 dark:text-neutral-400'
                            }`}
                          >
                            {total}
                          </span>
                        )}
                      </TabsTrigger>
                    )
                  })}
                </TabsList>
              </div>

              {/* Conteúdo das Abas */}
              <TabsContent
                value="geral"
                className="flex-1 flex flex-col overflow-hidden mt-3 p-0 data-[state=inactive]:hidden min-h-0"
              >
                {renderAbaGeral()}
              </TabsContent>

              <TabsContent
                value="publicacoes"
                className="flex-1 flex flex-col overflow-hidden mt-3 p-0 data-[state=inactive]:hidden min-h-0"
              >
                {renderAbaPublicacoes()}
              </TabsContent>

              <TabsContent
                value="orientacoes"
                className="flex-1 flex flex-col overflow-hidden mt-3 p-0 data-[state=inactive]:hidden min-h-0"
              >
                {renderAbaOrientacoes()}
              </TabsContent>

              <TabsContent
                value="bancas"
                className="flex-1 flex flex-col overflow-hidden mt-3 p-0 data-[state=inactive]:hidden min-h-0"
              >
                {renderAbaBancas()}
              </TabsContent>

              <TabsContent
                value="projetos"
                className="flex-1 flex flex-col overflow-hidden mt-3 p-0 data-[state=inactive]:hidden min-h-0"
              >
                {renderAbaProjetos()}
              </TabsContent>

              <TabsContent
                value="premiacoes"
                className="flex-1 flex flex-col overflow-hidden mt-3 p-0 data-[state=inactive]:hidden min-h-0"
              >
                {renderAbaPremiacoes()}
              </TabsContent>

              <TabsContent
                value="producao_tecnica"
                className="flex-1 flex flex-col overflow-hidden mt-3 p-0 data-[state=inactive]:hidden min-h-0"
              >
                {renderAbaProducaoTecnica()}
              </TabsContent>

              <TabsContent
                value="patentes"
                className="flex-1 flex flex-col overflow-hidden mt-3 p-0 data-[state=inactive]:hidden min-h-0"
              >
                {renderAbaPatentes()}
              </TabsContent>

              <TabsContent
                value="eventos"
                className="flex-1 flex flex-col overflow-hidden mt-3 p-0 data-[state=inactive]:hidden min-h-0"
              >
                {renderAbaEventos()}
              </TabsContent>

              <TabsContent
                value="mobilidade"
                className="flex-1 flex flex-col overflow-hidden mt-3 p-0 data-[state=inactive]:hidden min-h-0"
              >
                {renderAbaMobilidade()}
              </TabsContent>

              <TabsContent
                value="impacto_social"
                className="flex-1 flex flex-col overflow-hidden mt-3 p-0 data-[state=inactive]:hidden min-h-0"
              >
                {renderAbaImpactoSocial()}
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* Rodapé Somente-Leitura */}
        <DialogFooter className="p-4 border-t bg-slate-50/80 dark:bg-neutral-900/80 shrink-0 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-neutral-400">
            <span>Visualização de registros vinculados no banco de dados.</span>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setModalImprimirAberto(true)}
              className="gap-1.5"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Modal de Seleção de Abas para Impressão */}
      <Dialog open={modalImprimirAberto} onOpenChange={setModalImprimirAberto}>
        <DialogContent className="max-w-md w-[92vw] p-5 gap-4">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="flex items-center gap-2 text-base text-slate-900 dark:text-neutral-100">
              <Printer className="h-4 w-4 text-primary" />
              <span>Imprimir Dados do Docente</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-neutral-400">
              Selecione as abas que deseja incluir no relatório de impressão formatado.
            </DialogDescription>
          </DialogHeader>

          {/* Opção Selecionar Todas */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-neutral-800">
            <label
              htmlFor="select-all-tabs"
              className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-neutral-200 cursor-pointer select-none"
            >
              <Checkbox
                id="select-all-tabs"
                checked={todasAbasSelecionadas}
                onCheckedChange={(checked) => alternarTodasAbas(Boolean(checked))}
              />
              <span>Selecionar todas as abas</span>
            </label>
            <span className="text-[11px] font-mono text-slate-500">
              {totalAbasSelecionadas} de {abasDefinicao.length} selecionadas
            </span>
          </div>

          {/* Lista de Checkboxes por Aba */}
          <div className="grid grid-cols-1 gap-2 max-h-[48vh] overflow-y-auto pr-1">
            {abasDefinicao.map(({ id, rotulo, icone: Icone, total }) => {
              const selecionada = !!abasSelecionadasParaImprimir[id]
              return (
                <label
                  key={id}
                  htmlFor={`tab-print-${id}`}
                  className={`flex items-center justify-between p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                    selecionada
                      ? 'bg-primary/5 border-primary/30 text-slate-900 dark:text-neutral-100'
                      : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Checkbox
                      id={`tab-print-${id}`}
                      checked={selecionada}
                      onCheckedChange={(checked) => alternarAbaIndividual(id, Boolean(checked))}
                    />
                    <Icone className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="truncate font-medium">{rotulo}</span>
                  </div>
                  {id !== 'geral' ? (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                        total > 0
                          ? 'bg-primary/10 text-primary font-bold'
                          : 'bg-slate-100 dark:bg-neutral-800 text-slate-500'
                      }`}
                    >
                      {total}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">Cadastral</span>
                  )}
                </label>
              )
            })}
          </div>

          <DialogFooter className="pt-2 flex flex-row items-center justify-between gap-2 border-t border-slate-200 dark:border-neutral-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalImprimirAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={totalAbasSelecionadas === 0}
              onClick={executarImpressao}
              className="gap-1.5"
            >
              <Printer className="h-4 w-4" />
              <span>Gerar Impressão</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Relatório Oculto na Tela / Visível na Impressão contendo apenas as abas selecionadas */}
      <div className="hidden print:block docente-print-container bg-white text-slate-900">
        {renderDocumentoImpressao()}
      </div>
    </Dialog>
  )
}
