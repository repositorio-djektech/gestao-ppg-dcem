import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { docentesService } from '@/services/docentes'
import { discentesService } from '@/services/discentes'
import { egressosService } from '@/services/egressos'
import { bancasService } from '@/services/bancas'
import { orientacoesService } from '@/services/orientacoes'
import { disciplinasService } from '@/services/disciplinas'
import { projetosPesquisaService } from '@/services/projetos-pesquisa'
import { publicacoesService } from '@/services/publicacoes'
import { producaoTecnicaService } from '@/services/producao-tecnica'
import { patentesService } from '@/services/patentes'
import { eventosService } from '@/services/eventos'
import { mobilidadeService } from '@/services/mobilidade'
import { impactoSocialService } from '@/services/impacto-social'
import { premiacoesService } from '@/services/premiacoes'

interface ModuleConfig {
  title: string
  subtitle: string
  service: { list: () => Promise<any[]> }
  columns: { key: string; label: string; render?: (item: any) => string | React.ReactNode }[]
}

export default function PrintView() {
  const { modulo } = useParams<{ modulo: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [docentesMap, setDocentesMap] = useState<Record<string, string>>({})
  const [discentesMap, setDiscentesMap] = useState<Record<string, string>>({})

  useEffect(() => {
    // Carregar mapas de docentes e discentes para relacionamentos (bancas, orientações, projetos)
    Promise.all([
      docentesService.list().catch(() => []),
      discentesService.list().catch(() => []),
    ]).then(([docentes, discentes]) => {
      const docMap: Record<string, string> = {}
      docentes.forEach((d) => {
        docMap[d.id] = d.nome
      })
      setDocentesMap(docMap)

      const discMap: Record<string, string> = {}
      discentes.forEach((d) => {
        discMap[d.id] = d.nome
      })
      setDiscentesMap(discMap)
    })
  }, [])

  const modulesConfig: Record<string, ModuleConfig> = {
    docentes: {
      title: 'Corpo Docente',
      subtitle: 'Docentes permanentes do programa, índices bibliométricos e bolsas CNPq',
      service: docentesService,
      columns: [
        { key: 'nome', label: 'Nome do Docente' },
        { key: 'scopus_id', label: 'Scopus ID', render: (d) => d.scopus_id || '—' },
        { key: 'indice_h', label: 'Índice-H', render: (d) => String(d.indice_h ?? 0) },
        { key: 'bolsa_cnpq', label: 'Bolsa CNPq', render: (d) => d.bolsa_cnpq || '—' },
        { key: 'jdp', label: 'JDP', render: (d) => (d.jdp ? 'Sim' : 'Não') },
        { key: 'licenca', label: 'Licença', render: (d) => d.licenca || '—' },
      ],
    },
    discentes: {
      title: 'Corpo Discente',
      subtitle: 'Alunos regulares de mestrado e doutorado matriculados no programa',
      service: discentesService,
      columns: [
        { key: 'nome', label: 'Nome' },
        { key: 'cpf', label: 'CPF', render: (d) => d.cpf || '—' },
        { key: 'data_ingresso', label: 'Data de Ingresso', render: (d) => d.data_ingresso || '—' },
        { key: 'status', label: 'Status', render: (d) => String(d.status || '—').toUpperCase() },
        { key: 'link_lattes', label: 'Currículo Lattes', render: (d) => d.link_lattes || '—' },
      ],
    },
    egressos: {
      title: 'Egressos',
      subtitle: 'Acompanhamento de titulados pelo programa e sua inserção profissional',
      service: egressosService,
      columns: [
        { key: 'nome', label: 'Nome do Egresso' },
        { key: 'ano_titulacao', label: 'Ano Titulação', render: (e) => e.ano_titulacao ?? '—' },
        {
          key: 'atuacao_profissional',
          label: 'Atuação Profissional Atual',
          render: (e) => e.atuacao_profissional || '—',
        },
        { key: 'link_lattes', label: 'Lattes / Perfil', render: (e) => e.link_lattes || '—' },
      ],
    },
    bancas: {
      title: 'Bancas Examinadoras',
      subtitle: 'Bancas de qualificação e defesa de dissertações e teses',
      service: bancasService,
      columns: [
        { key: 'titulo_trabalho', label: 'Título do Trabalho' },
        { key: 'tipo', label: 'Tipo' },
        {
          key: 'discente_id',
          label: 'Discente',
          render: (b) => discentesMap[b.discente_id] || '—',
        },
        { key: 'data', label: 'Data', render: (b) => b.data || '—' },
        { key: 'membros', label: 'Membros da Banca', render: (b) => b.membros || '—' },
      ],
    },
    orientacoes: {
      title: 'Orientações e Supervisões',
      subtitle: 'Relação de orientações em andamento e concluídas',
      service: orientacoesService,
      columns: [
        { key: 'tipo', label: 'Nível / Tipo' },
        {
          key: 'docente_id',
          label: 'Docente Orientador',
          render: (o) => docentesMap[o.docente_id] || '—',
        },
        {
          key: 'discente_id',
          label: 'Discente Orientando',
          render: (o) => discentesMap[o.discente_id] || '—',
        },
        { key: 'inicio', label: 'Início', render: (o) => o.inicio || '—' },
        { key: 'fim', label: 'Término', render: (o) => o.fim || '—' },
        { key: 'status', label: 'Status', render: (o) => String(o.status || '—').toUpperCase() },
      ],
    },
    disciplinas: {
      title: 'Disciplinas Oferecidas',
      subtitle: 'Grade curricular e disciplinas ofertadas no programa',
      service: disciplinasService,
      columns: [
        { key: 'codigo', label: 'Código', render: (d) => d.codigo || '—' },
        { key: 'nome', label: 'Nome da Disciplina' },
        { key: 'creditos', label: 'Créditos', render: (d) => String(d.creditos ?? '—') },
        { key: 'ano_semestre', label: 'Ano/Semestre', render: (d) => d.ano_semestre || '—' },
      ],
    },
    'projetos-pesquisa': {
      title: 'Projetos de Pesquisa',
      subtitle: 'Projetos institucionais vinculados às linhas de pesquisa do programa',
      service: projetosPesquisaService,
      columns: [
        { key: 'titulo', label: 'Título do Projeto' },
        {
          key: 'coordenador_id',
          label: 'Coordenador',
          render: (p) => docentesMap[p.coordenador_id] || '—',
        },
        { key: 'inicio', label: 'Início', render: (p) => p.inicio || '—' },
        { key: 'fim', label: 'Término', render: (p) => p.fim || '—' },
        {
          key: 'financiamento',
          label: 'Financiamento',
          render: (p) => (p.financiamento ? `Sim (${p.orgao_fomento || 'Fomento'})` : 'Não'),
        },
      ],
    },
    publicacoes: {
      title: 'Produção Bibliográfica — Publicações',
      subtitle: 'Artigos completos publicados em periódicos científicos do quadriênio',
      service: publicacoesService,
      columns: [
        { key: 'titulo', label: 'Título do Artigo' },
        { key: 'autores', label: 'Autores' },
        { key: 'periodico', label: 'Periódico' },
        { key: 'ano', label: 'Ano', render: (p) => String(p.ano ?? '—') },
        { key: 'doi', label: 'DOI', render: (p) => p.doi || '—' },
      ],
    },
    'producao-tecnica': {
      title: 'Produção Técnica e Tecnológica',
      subtitle: 'Softwares, relatórios técnicos, patentes aplicadas e produtos tecnológicos',
      service: producaoTecnicaService,
      columns: [
        { key: 'titulo', label: 'Título' },
        { key: 'tipo', label: 'Tipo' },
        { key: 'autores', label: 'Autores/Desenvolvedores', render: (p) => p.autores || '—' },
        { key: 'ano', label: 'Ano', render: (p) => String(p.ano ?? '—') },
      ],
    },
    patentes: {
      title: 'Propriedade Intelectual — Patentes',
      subtitle: 'Patentes registradas, concedidas ou licenciadas no INPI',
      service: patentesService,
      columns: [
        { key: 'titulo', label: 'Título da Patente' },
        { key: 'status', label: 'Status' },
        { key: 'inpi', label: 'Registro INPI', render: (p) => p.inpi || '—' },
        { key: 'autores', label: 'Inventores / Autores' },
      ],
    },
    eventos: {
      title: 'Participação em Eventos Científicos',
      subtitle: 'Congressos, simpósios, conferências e palestras ministeradas',
      service: eventosService,
      columns: [
        { key: 'evento', label: 'Evento' },
        { key: 'docente', label: 'Docente Participante' },
        { key: 'papel', label: 'Papel Desempenhado' },
        { key: 'local_data', label: 'Local e Data' },
      ],
    },
    mobilidade: {
      title: 'Mobilidade Acadêmica e Cooperação',
      subtitle: 'Missões de estudo e pesquisa nacionais e internacionais',
      service: mobilidadeService,
      columns: [
        { key: 'nome', label: 'Participante' },
        { key: 'tipo', label: 'Categoria', render: (m) => String(m.tipo || '—').toUpperCase() },
        { key: 'instituicao', label: 'Instituição Parceira' },
        {
          key: 'modalidade',
          label: 'Modalidade',
          render: (m) => String(m.modalidade || '—').toUpperCase(),
        },
        { key: 'periodo', label: 'Período' },
      ],
    },
    'impacto-social': {
      title: 'Impacto Social e Difusão',
      subtitle: 'Ações de extensão, transferência de conhecimento e impacto social',
      service: impactoSocialService,
      columns: [
        { key: 'titulo', label: 'Título da Ação' },
        { key: 'ano', label: 'Ano', render: (i) => String(i.ano ?? '—') },
        { key: 'descricao', label: 'Descrição do Impacto' },
      ],
    },
    premiacoes: {
      title: 'Premiações e Distinções',
      subtitle: 'Prêmios recebidos pelo corpo docente, discentes e egressos',
      service: premiacoesService,
      columns: [
        { key: 'titulo', label: 'Prêmio / Distinção' },
        { key: 'nome_premiado', label: 'Premiado' },
        { key: 'instituicao', label: 'Instituição Concedente' },
        { key: 'ano', label: 'Ano', render: (p) => String(p.ano ?? '—') },
      ],
    },
  }

  const currentModule = modulo ? modulesConfig[modulo] : undefined

  useEffect(() => {
    if (!currentModule) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    currentModule.service
      .list()
      .then((items) => {
        setData(items)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setError('Não foi possível carregar os dados para impressão.')
        setLoading(false)
      })
  }, [modulo])

  const handlePrint = () => {
    window.print()
  }

  const currentDateFormatted = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  if (!currentModule) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Módulo de impressão não encontrado</h2>
        <p className="text-slate-600">
          O módulo informado "{modulo}" não possui modelo de impressão cadastrado.
        </p>
        <Button onClick={() => navigate(-1)} variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 p-6 md:p-10 print-container">
      {/* Barra de Ações (visível apenas na tela, escondida na impressão) */}
      <div className="no-print mb-8 p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-2 bg-white"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <div>
            <h2 className="font-semibold text-slate-900 text-sm">Versão para Impressão / PDF</h2>
            <p className="text-xs text-slate-500">
              Otimizada para papel A4 e exportação via navegador (Ctrl+P / Imprimir)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrint}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Printer className="h-4 w-4" /> Imprimir / Salvar em PDF
          </Button>
        </div>
      </div>

      {/* Cabeçalho do Documento para Impressão */}
      <header className="border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs uppercase tracking-widest font-bold text-slate-600">
              Programa de Pós-Graduação em Ciência e Engenharia de Materiais — PPG DCEM
            </p>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">{currentModule.title}</h1>
            <p className="text-sm text-slate-600 mt-0.5">{currentModule.subtitle}</p>
          </div>
          <div className="text-right text-xs text-slate-500 shrink-0">
            <p className="font-medium text-slate-700">Data de emissão:</p>
            <p>{currentDateFormatted}</p>
            <p className="mt-1 font-mono">Total: {data.length} registro(s)</p>
          </div>
        </div>
      </header>

      {/* Conteúdo da Tabela de Impressão */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 space-y-3">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary" />
          <p className="text-sm">Carregando dados para impressão...</p>
        </div>
      ) : error ? (
        <div className="py-12 text-center text-destructive space-y-2">
          <p className="font-medium">{error}</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        </div>
      ) : data.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-slate-300 rounded-lg text-slate-500">
          Nenhum registro encontrado neste módulo para exibição.
        </div>
      ) : (
        <div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-300 text-xs text-slate-800 uppercase tracking-wider">
                <th className="py-2.5 px-3 w-12 text-center font-bold">#</th>
                {currentModule.columns.map((col) => (
                  <th key={col.key} className="py-2.5 px-3 font-bold">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {data.map((item, index) => (
                <tr key={item.id ?? index} className="hover:bg-slate-50/50">
                  <td className="py-2 px-3 text-center text-slate-500 font-mono">{index + 1}</td>
                  {currentModule.columns.map((col) => (
                    <td key={col.key} className="py-2 px-3 text-slate-800 align-top">
                      {col.render ? col.render(item) : String(item[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Rodapé institucional para impressão */}
          <footer className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-center text-[11px] text-slate-500">
            <div>
              <span>Sistema de Gestão PPG DCEM — Relatório Oficial para Avaliação e Sucupira</span>
            </div>
            <div>
              <span>Documento gerado em {currentDateFormatted}</span>
            </div>
          </footer>
        </div>
      )}
    </div>
  )
}
