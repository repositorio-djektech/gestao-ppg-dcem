import { useState, useEffect, useMemo } from 'react'
import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { discentesService } from '@/services/discentes'
import { docentesService } from '@/services/docentes'
import { projetosPesquisaService } from '@/services/projetos-pesquisa'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRef } from 'react'
import {
  Eye,
  Edit,
  Trash2,
  Upload,
  Loader2,
  FileCode,
  FileArchive,
  Info,
  CheckCircle2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { Discente, Docente, ProjetoPesquisa } from '@/types/database'
import { formatarCpf } from '@/lib/utils'
import { normalizarNomePessoa } from '@/lib/normalizacao'
import { DocenteNome } from '@/components/docentes/DocenteNome'
import { VisualizarDiscenteDialog } from '@/components/discentes/VisualizarDiscenteDialog'
import { readLattesFiles } from '@/lib/lattes/readFiles'

const emptyForm = {
  nome: '',
  cpf: '',
  data_ingresso: '',
  status: 'ativo',
  link_lattes: '',
  link_comprovacao: '',
  observacoes: '',
  orientador: '',
  ano_conclusao: '',
  tipo_curso: 'Mestrado',
  projeto_id: '',
  docente_orientador_id: '',
}

const statusColors: Record<string, string> = {
  ativo: 'bg-emerald-50 text-emerald-700',
  concluido: 'bg-indigo-50 text-indigo-700',
  titulado: 'bg-blue-50 text-blue-700',
  desligado: 'bg-red-50 text-red-700',
}

export default function Discentes() {
  const [docentes, setDocentes] = useState<Docente[]>([])
  const [projetos, setProjetos] = useState<ProjetoPesquisa[]>([])
  const [discenteParaVisualizar, setDiscenteParaVisualizar] = useState<Discente | null>(null)
  const [dialogoVisualizarAberto, setDialogoVisualizarAberto] = useState(false)
  const [importandoLattes, setImportandoLattes] = useState(false)
  const [dialogoLattesAberto, setDialogoLattesAberto] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null)
  const modalFileInputRef = useRef<HTMLInputElement>(null)
  const formStateRef = useRef<{
    isEditing: boolean
    formData: any
    setFormData: React.Dispatch<React.SetStateAction<any>>
  } | null>(null)

  useEffect(() => {
    Promise.all([docentesService.list(), projetosPesquisaService.list()])
      .then(([docList, projList]) => {
        setDocentes(docList)
        setProjetos(projList)
      })
      .catch(console.error)
  }, [])

  const docenteObjMap = useMemo(() => {
    const m = new Map<number, Docente>()
    docentes.forEach((d) => m.set(d.id, d))
    return m
  }, [docentes])

  const projetoMap = useMemo(() => {
    const m = new Map<number, string>()
    projetos.forEach((p) => m.set(p.id, p.titulo))
    return m
  }, [projetos])

  const handleVisualizarDiscente = (d: Discente) => {
    setDiscenteParaVisualizar(d)
    setDialogoVisualizarAberto(true)
  }

  const validarEProcessarArquivoLattes = async (arquivoParaProcessar: File) => {
    const context = formStateRef.current
    if (!context) return

    setImportandoLattes(true)
    try {
      const arquivosLidos = await readLattesFiles([arquivoParaProcessar])
      if (arquivosLidos.length === 0) {
        toast.error('Nenhum arquivo XML válido encontrado.')
        return
      }

      const arquivo = arquivosLidos[0]
      const parser = new DOMParser()
      const doc = parser.parseFromString(arquivo.xml, 'text/xml')

      const parserError = doc.querySelector('parsererror')
      if (parserError) {
        toast.error('Erro ao ler a estrutura do arquivo XML.')
        return
      }

      const raiz = doc.querySelector('CURRICULO-VITAE')
      if (!raiz) {
        toast.error('XML não contém a raiz <CURRICULO-VITAE> oficial do Lattes.')
        return
      }

      const idLattes = (raiz.getAttribute('NUMERO-IDENTIFICADOR') || '').trim()

      const dadosGeraisEl = raiz.querySelector('DADOS-GERAIS')
      const nomeCompletoBruto = dadosGeraisEl?.getAttribute('NOME-COMPLETO') || ''
      const nomeCompleto = normalizarNomePessoa(nomeCompletoBruto)

      const nacionalidade =
        dadosGeraisEl?.getAttribute('PAIS-DE-NACIONALIDADE') ||
        dadosGeraisEl?.getAttribute('PAIS-DE-NASCIMENTO') ||
        dadosGeraisEl?.getAttribute('NACIONALIDADE') ||
        ''

      // Extração de MESTRADO ou DOUTORADO mais recente de FORMACAO-ACADEMICA-TITULACAO
      const formacaoEl = raiz.querySelector('FORMACAO-ACADEMICA-TITULACAO')
      let tipoCursoExtraido: string | null = null
      let anoConclusaoExtraido: string | null = null

      if (formacaoEl) {
        const itensFormacao: {
          tipo: string
          anoConclusao: string | null
          anoInicio: number
          order: number
        }[] = []
        formacaoEl.querySelectorAll('DOUTORADO, MESTRADO').forEach((el) => {
          const tag = el.tagName.toUpperCase()
          const tipo = tag === 'DOUTORADO' ? 'Doutorado' : 'Mestrado'
          const anoFim =
            el.getAttribute('ANO-DE-CONCLUSAO') ||
            el.getAttribute('ANO-DE-OBTENCAO-DO-TITULO') ||
            ''
          const anoIni = parseInt(el.getAttribute('ANO-DE-INICIO') || '0', 10) || 0
          const anoNum = parseInt(anoFim, 10) || 0
          itensFormacao.push({
            tipo,
            anoConclusao: anoFim.trim() || null,
            anoInicio: anoIni,
            order: anoNum * 100 + (tag === 'DOUTORADO' ? 2 : 1),
          })
        })

        if (itensFormacao.length > 0) {
          // Ordenar pelo mais recente (maior anoConclusao ou maior anoInicio)
          itensFormacao.sort((a, b) => b.order - a.order || b.anoInicio - a.anoInicio)
          tipoCursoExtraido = itensFormacao[0].tipo
          if (itensFormacao[0].anoConclusao) {
            anoConclusaoExtraido = itensFormacao[0].anoConclusao
          }
        }
      }

      // Validação no modo EDITAR: se nome do XML divergir claramente do discente aberto
      if (context.isEditing && context.formData.nome && context.formData.nome.trim()) {
        const nomeAtualNorm = normalizarNomePessoa(context.formData.nome).toLowerCase()
        const nomeLattesNorm = nomeCompleto.toLowerCase()

        if (nomeAtualNorm && nomeLattesNorm && nomeAtualNorm !== nomeLattesNorm) {
          const confirmou = window.confirm(
            `Atenção: O currículo Lattes importado pertence a "${nomeCompleto}", mas o registro atual é de "${context.formData.nome}".\n\nDeseja realmente aplicar os dados deste currículo ao discente selecionado?`,
          )
          if (!confirmou) {
            toast.info('Importação cancelada pelo usuário.')
            return
          }
        }
      }

      // Aplica os dados extraídos no formData
      context.setFormData((prev: any) => {
        const atualizado = { ...prev }

        if (nomeCompleto) {
          atualizado.nome = nomeCompleto
        }
        if (idLattes) {
          atualizado.id_lattes = idLattes
          // Preenche link_lattes caso não tenha
          if (!atualizado.link_lattes) {
            atualizado.link_lattes = `http://lattes.cnpq.br/${idLattes}`
          }
        }
        if (tipoCursoExtraido) {
          atualizado.tipo_curso = tipoCursoExtraido
        }
        if (anoConclusaoExtraido) {
          // Extrai apenas os 4 dígitos do ano para alimentar o picker de ano
          const matchAno = anoConclusaoExtraido.match(/\b(19\d{2}|20\d{2})\b/)
          atualizado.ano_conclusao = matchAno ? matchAno[1] : anoConclusaoExtraido
        }
        if (nacionalidade && 'nacionalidade' in atualizado) {
          atualizado.nacionalidade = nacionalidade
        }

        return atualizado
      })

      toast.success(
        `Dados do Lattes importados com sucesso! Revise e clique em Salvar para gravar.`,
      )
      setDialogoLattesAberto(false)
      setArquivoSelecionado(null)
    } catch (err: any) {
      console.error('Erro ao importar Lattes:', err)
      toast.error(`Falha ao ler arquivo Lattes: ${err?.message || 'erro desconhecido'}`)
    } finally {
      setImportandoLattes(false)
      if (modalFileInputRef.current) {
        modalFileInputRef.current.value = ''
      }
    }
  }

  const handleValidarArquivos = (files: FileList | File[]) => {
    const list = Array.from(files)
    const valid = list.find((f) => {
      const ext = f.name.toLowerCase()
      return ext.endsWith('.xml') || ext.endsWith('.zip')
    })
    if (!valid) {
      toast.error('Selecione um arquivo .xml ou .zip válido exportado da Plataforma Lattes.')
      return
    }
    setArquivoSelecionado(valid)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleValidarArquivos(e.dataTransfer.files)
    }
  }

  // Definição de colunas conforme os Pedidos 2 e 4:
  // - Coluna Nome: rótulo "Nome", alinhamento à esquerda (cabeçalho e dados)
  // - Demais colunas: centralizadas (cabeçalho e dados)
  // - Coluna "Orientador": mostra docente vinculado (com suporte à cor laranja se status=false) ou fallback texto livre
  // - Coluna "Conclusão": ano de conclusão (vazio se nulo)
  const columns: ColumnDef<Discente>[] = useMemo(
    () => [
      {
        key: 'nome',
        label: 'Nome',
        mobileTitle: true,
        className: 'text-left font-medium text-slate-900',
        headerClassName: 'text-left font-semibold text-slate-700',
        render: (d) => {
          const tituloProjeto =
            d.projeto_id && projetoMap.has(d.projeto_id) ? projetoMap.get(d.projeto_id) : null

          return (
            <div className="flex flex-col items-start gap-0.5">
              <span>{normalizarNomePessoa(d.nome)}</span>
              {(d.tipo_curso || tituloProjeto) && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 font-normal">
                  {d.tipo_curso && (
                    <span className="font-medium text-primary bg-primary/10 px-1.5 py-0.2 rounded">
                      {d.tipo_curso}
                    </span>
                  )}
                  {tituloProjeto && (
                    <span className="text-blue-700 line-clamp-1" title={tituloProjeto}>
                      • Projeto:{' '}
                      {tituloProjeto.length > 40 ? `${tituloProjeto.slice(0, 40)}…` : tituloProjeto}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        },
      },
      {
        key: 'cpf',
        label: 'CPF',
        desktopOnly: true,
        className: 'text-center',
        headerClassName: 'text-center font-semibold text-slate-700',
        render: (d) =>
          d.cpf ? (
            <span className="font-mono text-xs">{formatarCpf(d.cpf)}</span>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
      {
        key: 'data_ingresso',
        label: 'Ingresso',
        mobileSupport: true,
        className: 'text-center',
        headerClassName: 'text-center font-semibold text-slate-700',
        render: (d) =>
          d.data_ingresso ? (
            <span className="font-mono text-xs">{d.data_ingresso}</span>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
      {
        key: 'status',
        label: 'Status',
        mobileSupport: true,
        className: 'text-center',
        headerClassName: 'text-center font-semibold text-slate-700',
        render: (d) => (
          <div className="flex justify-start md:justify-center items-center">
            <Badge
              variant="secondary"
              className={`border-0 capitalize ${statusColors[d.status] ?? ''}`}
            >
              {d.status}
            </Badge>
          </div>
        ),
      },
      {
        key: 'orientador' as any,
        label: 'Orientador',
        mobileSupport: true,
        className: 'text-center',
        headerClassName: 'text-center font-semibold text-slate-700',
        render: (d) => {
          const docenteVinculado =
            d.docente_orientador_id && docenteObjMap.has(d.docente_orientador_id)
              ? docenteObjMap.get(d.docente_orientador_id)
              : null

          if (docenteVinculado) {
            return (
              <div className="flex justify-center items-center gap-1.5 flex-wrap">
                <DocenteNome
                  nome={docenteVinculado.nome}
                  status={docenteVinculado.status}
                  className="font-medium text-xs"
                />
                <Badge
                  variant="outline"
                  className="text-[10px] px-1 py-0 bg-emerald-50 text-emerald-700 border-emerald-300 font-normal"
                >
                  vinculado
                </Badge>
              </div>
            )
          }

          if (d.orientador && d.orientador.trim()) {
            return (
              <span className="text-xs text-slate-700 font-medium">
                {normalizarNomePessoa(d.orientador)}
              </span>
            )
          }

          return <span className="text-slate-400 text-xs">—</span>
        },
      },
      {
        key: 'ano_conclusao' as any,
        label: 'Conclusão',
        mobileSupport: true,
        className: 'text-center',
        headerClassName: 'text-center font-semibold text-slate-700',
        render: (d) => {
          if (d.ano_conclusao && String(d.ano_conclusao).trim()) {
            return <span className="font-semibold text-slate-800 text-xs">{d.ano_conclusao}</span>
          }
          return <span className="text-slate-400 text-xs">—</span>
        },
      },
    ],
    [docenteObjMap, projetoMap],
  )

  const fields: FieldDef[] = useMemo(
    () => [
      {
        key: 'nome',
        label: 'Nome Completo',
        type: 'text',
        required: true,
        placeholder: 'Nome completo do aluno',
      },
      {
        key: 'cpf',
        label: 'CPF',
        type: 'text',
        placeholder: '000.000.000-00',
        helperText: 'Apenas números ou formatado',
      },
      {
        key: 'data_ingresso',
        label: 'Ano de Ingresso',
        type: 'year',
        required: true,
        placeholder: 'Selecione o ano de ingresso...',
        helperText: 'Ano de matrícula inicial no programa',
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        options: [
          { value: 'ativo', label: 'Ativo' },
          { value: 'concluido', label: 'Concluído' },
          { value: 'titulado', label: 'Titulado' },
          { value: 'desligado', label: 'Desligado' },
        ],
      },
      {
        key: 'ano_conclusao',
        label: 'Ano de Conclusão',
        type: 'year',
        placeholder: 'Selecione o ano de conclusão...',
        helperText: 'Ano de defesa ou previsão de conclusão',
      },
      {
        key: 'tipo_curso',
        label: 'Tipo do Curso',
        type: 'select',
        options: [
          { value: 'Mestrado', label: 'Mestrado' },
          { value: 'Doutorado', label: 'Doutorado' },
          { value: 'Pós-Doutorado', label: 'Pós-Doutorado' },
        ],
        placeholder: 'Selecione o nível...',
      },
      {
        key: 'docente_orientador_id',
        label: 'Orientador (docente)',
        type: 'select',
        options: docentes.map((d) => ({
          value: String(d.id),
          label: d.nome,
        })),
        placeholder: 'Selecione o docente orientador...',
        helperText: 'Docente vinculado que orienta o discente',
        onValueChangeWithFormData: (val, currentData) => {
          const dId = val ? Number(val) : null
          const docente = dId ? docentes.find((d) => d.id === dId) : null
          return {
            ...currentData,
            docente_orientador_id: val,
            orientador: docente ? docente.nome : currentData.orientador || '',
          }
        },
      },
      {
        key: 'projeto_id',
        label: 'Projeto',
        type: 'select',
        options: projetos.map((p) => ({
          value: String(p.id),
          label: `${p.titulo.slice(0, 70)}${p.titulo.length > 70 ? '…' : ''}`,
        })),
        placeholder: 'Selecione o projeto vinculado...',
        helperText: 'Projeto de pesquisa institucional ou individual em que o discente atua',
      },
      {
        key: 'link_comprovacao',
        label: 'Link de Comprovação',
        type: 'url',
        placeholder: 'https://...',
        helperText: 'Ficha de matrícula ou documento comprobatório',
      },
      { key: 'observacoes', label: 'Observações', type: 'textarea', rows: 2 },
    ],
    [docentes, projetos],
  )

  return (
    <>
      <CrudPage
        title="Discentes"
        description="Gerencie os discentes do programa de pós-graduação."
        service={discentesService}
        columns={columns}
        fields={fields}
        emptyForm={emptyForm}
        searchKey="nome"
        entityName="Discente"
        printModule="discentes"
        tableHeaderClassName="bg-[#e9effc] sticky top-0 z-10"
        tableHeaderRowClassName="bg-[#e9effc] hover:bg-[#e9effc]"
        actionsHeaderClassName="text-center font-semibold text-slate-700"
        formHeaderActions={(ctx) => {
          formStateRef.current = ctx
          return (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={importandoLattes}
              onClick={() => {
                formStateRef.current = ctx
                setArquivoSelecionado(null)
                setDialogoLattesAberto(true)
              }}
              className="gap-1.5 h-8 text-xs font-medium border-primary/30 text-primary hover:bg-primary/10 hover:text-primary bg-white shadow-none"
              title="Importar dados do currículo Lattes (.xml ou .zip)"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Importar Lattes</span>
            </Button>
          )
        }}
        renderCustomActions={(item, { openEdit, openDelete }) => (
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleVisualizarDiscente(item)}
              className="h-8 w-8 text-slate-600 hover:text-primary hover:bg-primary/10"
              title="Visualizar Discente"
              aria-label="Visualizar Discente"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={openEdit}
              className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
              title="Editar Discente"
            >
              <Edit className="h-4 w-4 text-primary" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={openDelete}
              title="Excluir Discente"
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        )}
      />

      <VisualizarDiscenteDialog
        open={dialogoVisualizarAberto}
        onOpenChange={setDialogoVisualizarAberto}
        discente={discenteParaVisualizar}
        docentes={docentes}
        projetos={projetos}
      />

      {/* Modal de Importação Lattes com Drag-and-Drop (mesma estrutura de Docentes / ImportarLattesDialog) */}
      <Dialog
        open={dialogoLattesAberto}
        onOpenChange={(aberto) => {
          if (!importandoLattes) {
            setDialogoLattesAberto(aberto)
            if (!aberto) setArquivoSelecionado(null)
          }
        }}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-primary font-bold">
              <Upload className="h-5 w-5 text-primary" />
              Importar Currículo Lattes do Discente (XML / ZIP)
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Arraste ou selecione o arquivo <strong>.xml</strong> ou <strong>.zip</strong>{' '}
              exportado da Plataforma Lattes. O sistema extrairá nome, ID Lattes, nível de curso e
              ano de conclusão para pré-preencher o formulário do discente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Área Drag and Drop */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => modalFileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/5 scale-[0.99]'
                  : 'border-slate-300 hover:border-primary/60 hover:bg-slate-50'
              }`}
            >
              <input
                ref={modalFileInputRef}
                type="file"
                accept=".xml,.zip"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleValidarArquivos(e.target.files)
                  }
                }}
              />
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="p-3 bg-primary/10 rounded-full text-primary">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-slate-800">
                  Arraste e solte o arquivo aqui ou{' '}
                  <span className="text-primary underline">clique para procurar</span>
                </p>
                <p className="text-xs text-slate-500">
                  Formatos aceitos: <strong>.xml</strong> ou <strong>.zip</strong> oficial do Lattes
                  (CNPq).
                </p>
              </div>
            </div>

            {/* Aviso explicativo */}
            <div className="flex items-start gap-2.5 p-3 rounded-md bg-amber-50 text-amber-900 border border-amber-200/70 text-xs">
              <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-950">Aviso sobre o preenchimento:</p>
                <p className="mt-0.5 text-amber-800">
                  A importação apenas pré-preenche os campos do formulário atual (nome, ID Lattes,
                  tipo de curso e ano de conclusão). A gravação no banco só ocorre ao clicar em{' '}
                  <strong>Salvar</strong>.
                </p>
              </div>
            </div>

            {/* Arquivo selecionado */}
            {arquivoSelecionado && (
              <div className="space-y-1.5 border rounded-md p-3 bg-slate-50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    Arquivo selecionado
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setArquivoSelecionado(null)
                      if (modalFileInputRef.current) modalFileInputRef.current.value = ''
                    }}
                    disabled={importandoLattes}
                    className="text-xs text-rose-600 hover:underline disabled:opacity-40"
                  >
                    Trocar arquivo
                  </button>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-white border border-slate-200 text-xs">
                  <div className="flex items-center gap-2 overflow-hidden mr-2">
                    {arquivoSelecionado.name.toLowerCase().endsWith('.zip') ? (
                      <FileArchive className="h-4 w-4 text-amber-600 shrink-0" />
                    ) : (
                      <FileCode className="h-4 w-4 text-sky-600 shrink-0" />
                    )}
                    <span
                      className="font-medium text-slate-800 truncate"
                      title={arquivoSelecionado.name}
                    >
                      {arquivoSelecionado.name}
                    </span>
                    <span className="text-slate-400 text-[11px] shrink-0">
                      ({(arquivoSelecionado.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={importandoLattes}
              onClick={() => {
                setDialogoLattesAberto(false)
                setArquivoSelecionado(null)
              }}
              className="bg-white hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!arquivoSelecionado || importandoLattes}
              onClick={() => {
                if (arquivoSelecionado) {
                  validarEProcessarArquivoLattes(arquivoSelecionado)
                }
              }}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              {importandoLattes ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando Lattes...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Aplicar dados ao formulário
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
