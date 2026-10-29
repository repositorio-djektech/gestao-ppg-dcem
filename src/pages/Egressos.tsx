import { useState, useEffect, useMemo, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { egressosService } from '@/services/egressos'
import { docentesService } from '@/services/docentes'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  AlertCircle,
  UserCheck,
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
import type { Egresso, Docente } from '@/types/database'
import { normalizarNomePessoa } from '@/lib/normalizacao'
import { toTitleCase } from '@/lib/titleCase'
import { DocenteNome } from '@/components/docentes/DocenteNome'
import { VisualizarEgressoDialog } from '@/components/egressos/VisualizarEgressoDialog'
import { readLattesFiles } from '@/lib/lattes/readFiles'
import { extrairDadosLattesEgresso } from '@/lib/lattes/egressos-parser'

const emptyForm = {
  nome: '',
  ano_ingresso: '',
  ano_titulacao: null,
  tipo_curso: '',
  docente_orientador_id: '',
  orientador: '',
  atuacao_profissional: '',
  link_lattes: '',
  link_comprovacao: '',
  observacoes: '',
  lattes_id: '',
}

export default function Egressos() {
  const { role, profile } = useAuth()
  const isCapes = role === 'capes'
  const podeExcluir = !isCapes && (role === 'suporte' || role === 'coordenador')
  const isDocente = role === 'docente'
  const docenteIdLogado = profile?.docente_id
  const [docentes, setDocentes] = useState<Docente[]>([])
  const [egressosExistentes, setEgressosExistentes] = useState<Egresso[]>([])
  const [egressoParaVisualizar, setEgressoParaVisualizar] = useState<Egresso | null>(null)
  const [dialogoVisualizarAberto, setDialogoVisualizarAberto] = useState(false)
  const edicaoRef = useRef<((egresso: Egresso) => void) | null>(null)

  // Estado para Importação Lattes
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
    Promise.all([docentesService.list(), egressosService.list()])
      .then(([docList, egList]) => {
        setDocentes(docList)
        setEgressosExistentes(egList)
      })
      .catch(console.error)
  }, [])

  const docenteObjMap = useMemo(() => {
    const m = new Map<number, Docente>()
    docentes.forEach((d) => m.set(d.id, d))
    return m
  }, [docentes])

  const handleVisualizarEgresso = (egresso: Egresso) => {
    setEgressoParaVisualizar(egresso)
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
      const dadosExtraidos = extrairDadosLattesEgresso(arquivo.xml, docentes)

      // Regra do Concluinte: avisar se nenhuma formação concluída foi localizada no XML
      if (!dadosExtraidos.tipoCurso && dadosExtraidos.formacoesConcluidas.length === 0) {
        toast.warning(
          'Regra do Concluinte: nenhuma formação concluída (Graduação, Mestrado ou Doutorado) foi encontrada neste currículo. Formações em andamento não geram egresso.',
          { duration: 6000 },
        )
      }

      // Idempotência / Dedupe por lattes_id:
      // Se estamos no modo NOVO e já existe um egresso com este mesmo lattes_id cadastrado
      if (!context.isEditing && dadosExtraidos.lattesId) {
        const egressoExistente = egressosExistentes.find(
          (e) =>
            e.lattes_id === dadosExtraidos.lattesId ||
            (e.link_lattes && e.link_lattes.includes(dadosExtraidos.lattesId)),
        )
        if (egressoExistente) {
          toast.info(
            `Já existe um egresso cadastrado com este Lattes ID (${egressoExistente.nome}, ID #${egressoExistente.id}). Os dados serão preenchidos para revisão.`,
            { duration: 6000 },
          )
        }
      }

      // Validação no modo EDITAR: se o nome do XML divergir claramente do egresso aberto
      if (context.isEditing && context.formData.nome && String(context.formData.nome).trim()) {
        const nomeAtualNorm = normalizarNomePessoa(context.formData.nome).toLowerCase()
        const nomeLattesNorm = dadosExtraidos.nomeCompleto.toLowerCase()

        if (nomeAtualNorm && nomeLattesNorm && nomeAtualNorm !== nomeLattesNorm) {
          const confirmou = window.confirm(
            `Atenção: O currículo Lattes importado pertence a "${dadosExtraidos.nomeCompleto}", mas o registro atual é de "${context.formData.nome}".\n\nDeseja realmente aplicar os dados deste currículo ao egresso selecionado?`,
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

        if (dadosExtraidos.nomeCompleto) {
          atualizado.nome = dadosExtraidos.nomeCompleto
        }

        if (dadosExtraidos.lattesId) {
          atualizado.lattes_id = dadosExtraidos.lattesId
          if (!atualizado.link_lattes) {
            atualizado.link_lattes = dadosExtraidos.linkLattes
          }
        }

        if (dadosExtraidos.tipoCurso) {
          atualizado.tipo_curso = dadosExtraidos.tipoCurso
        }

        if (dadosExtraidos.anoTitulacao) {
          atualizado.ano_titulacao = dadosExtraidos.anoTitulacao
        }

        if (dadosExtraidos.anoIngresso && !atualizado.ano_ingresso) {
          atualizado.ano_ingresso = dadosExtraidos.anoIngresso
        }

        // Resolução do Orientador conforme Especificação:
        // - Se há confiança alta: preenche docente_orientador_id + texto orientador
        // - Se há dúvida ou sem docente vinculado: apenas pré-preenche texto orientador para o usuário confirmar no dropdown
        if (dadosExtraidos.sugestaoOrientador && dadosExtraidos.sugestaoOrientador.altaConfianca) {
          atualizado.docente_orientador_id = String(dadosExtraidos.sugestaoOrientador.docenteId)
          atualizado.orientador = dadosExtraidos.sugestaoOrientador.docenteNome
        } else if (dadosExtraidos.nomeOrientadorCitado) {
          atualizado.orientador = dadosExtraidos.nomeOrientadorCitado
        }

        return atualizado
      })

      // Mensagem informativa ao usuário
      if (dadosExtraidos.sugestaoOrientador && dadosExtraidos.sugestaoOrientador.altaConfianca) {
        toast.success(
          `Lattes importado! Orientador vinculado: "${dadosExtraidos.sugestaoOrientador.docenteNome}". Revise e clique em Salvar para gravar.`,
        )
      } else if (dadosExtraidos.nomeOrientadorCitado) {
        toast.info(
          `Lattes importado! Orientador citado ("${dadosExtraidos.nomeOrientadorCitado}") requer confirmação no seletor de docentes. Revise e clique em Salvar.`,
        )
      } else {
        toast.success(
          'Dados do Lattes importados com sucesso! Revise e clique em Salvar para gravar.',
        )
      }

      setDialogoLattesAberto(false)
      setArquivoSelecionado(null)
    } catch (err: any) {
      console.error('Erro ao importar Lattes para Egresso:', err)
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

  // Definição de colunas conforme os requisitos E1:
  // - Cabeçalho com fundo #e9effc;
  // - Rótulos e células centralizados;
  // - Coluna Nome à esquerda (com badge do tipo de curso);
  // - Colunas novas: "Ano Ingresso" e "Orientador" (nome do docente vinculado; laranja se o docente estiver inativo; fallback ao texto antigo quando não há vínculo);
  // - Coluna Ações com ícone olho laranja
  const columns: ColumnDef<Egresso>[] = useMemo(
    () => [
      {
        key: 'nome',
        label: 'Nome',
        mobileTitle: true,
        className: 'text-left font-medium text-slate-900',
        headerClassName: 'text-left font-semibold text-slate-700',
        render: (e) => (
          <div className="flex flex-col items-start gap-0.5">
            <span>{toTitleCase(e.nome) || normalizarNomePessoa(e.nome)}</span>
            {e.tipo_curso && (
              <span className="font-medium text-primary bg-primary/10 px-1.5 py-0.2 rounded text-[11px]">
                {e.tipo_curso}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'ano_ingresso' as any,
        label: 'Ano Ingresso',
        mobileSupport: true,
        className: 'text-center',
        headerClassName: 'text-left font-semibold text-slate-700',
        render: (e) =>
          e.ano_ingresso ? (
            <span className="font-mono text-xs">{e.ano_ingresso}</span>
          ) : (
            <span className="text-slate-400 text-xs">—</span>
          ),
      },
      {
        key: 'ano_titulacao',
        label: 'Ano Titulação',
        mobileSupport: true,
        className: 'text-center',
        headerClassName: 'text-left font-semibold text-slate-700',
        render: (e) =>
          e.ano_titulacao ? (
            <span className="font-semibold text-slate-800 text-xs">{e.ano_titulacao}</span>
          ) : (
            <span className="text-slate-400 text-xs">—</span>
          ),
      },
      {
        key: 'orientador' as any,
        label: 'Orientador',
        mobileSupport: true,
        className: 'text-center',
        headerClassName: 'text-left font-semibold text-slate-700',
        render: (e) => {
          const docenteVinculado =
            e.docente_orientador_id && docenteObjMap.has(e.docente_orientador_id)
              ? docenteObjMap.get(e.docente_orientador_id)
              : null

          if (docenteVinculado) {
            return (
              <div className="flex justify-center items-center gap-1.5 flex-wrap">
                <DocenteNome
                  nome={toTitleCase(docenteVinculado.nome)}
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

          if (e.orientador && e.orientador.trim()) {
            return (
              <span className="text-xs text-slate-700 font-medium">
                {toTitleCase(e.orientador) || normalizarNomePessoa(e.orientador)}
              </span>
            )
          }

          return <span className="text-slate-400 text-xs">—</span>
        },
      },
      {
        key: 'atuacao_profissional',
        label: 'Atuação Profissional',
        mobileSupport: true,
        className: 'text-center',
        headerClassName: 'text-left font-semibold text-slate-700',
        render: (e) => (
          <span className="text-xs text-slate-600 line-clamp-1 max-w-xs mx-auto">
            {e.atuacao_profissional ? toTitleCase(e.atuacao_profissional) : '—'}
          </span>
        ),
      },
    ],
    [docenteObjMap],
  )

  // Campos do formulário:
  // - Nome
  // - Ano de Ingresso (type 'year')
  // - Ano de Titulação/Conclusão (type 'year')
  // - Tipo de curso (dropdown: Graduação / Mestrado / Doutorado / vazio)
  // - Orientador (docente) SOMENTE via dropdown de docentes (preenche docente_orientador_id + texto orientador automaticamente)
  // - Atuação profissional
  // - Links de comprovação
  // - Observações
  const docentesOpcoes = useMemo(() => {
    if (isDocente && docenteIdLogado) {
      return docentes
        .filter((d) => d.id === docenteIdLogado)
        .map((d) => ({
          value: String(d.id),
          label: `${d.nome} (Você)`,
        }))
    }
    return docentes.map((d) => ({
      value: String(d.id),
      label: d.nome,
    }))
  }, [docentes, isDocente, docenteIdLogado])

  const initialEmptyForm = useMemo(() => {
    if (isDocente && docenteIdLogado) {
      const meuDocente = docentes.find((d) => d.id === docenteIdLogado)
      return {
        ...emptyForm,
        docente_orientador_id: String(docenteIdLogado),
        orientador: meuDocente ? meuDocente.nome : '',
      }
    }
    return emptyForm
  }, [isDocente, docenteIdLogado, docentes])

  const fields: FieldDef[] = useMemo(
    () => [
      {
        key: 'nome',
        label: 'Nome Completo',
        type: 'text',
        required: true,
        placeholder: 'Nome do egresso',
      },
      {
        key: 'ano_ingresso',
        label: 'Ano de Ingresso',
        type: 'year',
        placeholder: 'Selecione o ano de ingresso...',
        helperText: 'Ano em que iniciou o curso',
      },
      {
        key: 'ano_titulacao',
        label: 'Ano de Titulação / Conclusão',
        type: 'year',
        placeholder: 'Selecione o ano de titulação...',
        helperText: 'Ano em que concluiu o curso e obteve a titulação',
      },
      {
        key: 'tipo_curso',
        label: 'Tipo do Curso',
        type: 'select',
        options: [
          { value: 'Graduação', label: 'Graduação' },
          { value: 'Mestrado', label: 'Mestrado' },
          { value: 'Doutorado', label: 'Doutorado' },
        ],
        placeholder: 'Selecione o nível do curso...',
      },
      {
        key: 'docente_orientador_id',
        label: isDocente ? 'Orientador (Você)' : 'Orientador (docente)',
        type: 'select',
        required: isDocente,
        options: docentesOpcoes,
        placeholder: 'Selecione o docente orientador...',
        helperText: isDocente
          ? 'Como docente, você só pode vincular orientações a si mesmo.'
          : 'Docente vinculado responsável pela orientação',
        onValueChangeWithFormData: (val, currentData) => {
          const finalVal = isDocente && docenteIdLogado ? String(docenteIdLogado) : val
          const dId = finalVal ? Number(finalVal) : null
          const docente = dId ? docentes.find((d) => d.id === dId) : null
          return {
            ...currentData,
            docente_orientador_id: finalVal,
            orientador: docente ? docente.nome : '',
          }
        },
      },
      {
        key: 'atuacao_profissional',
        label: 'Atuação Profissional Atual',
        type: 'textarea',
        rows: 3,
        placeholder: 'Ex: Pesquisador na EMBRAPA, Professor na UFSC, Engenheiro...',
        helperText: 'Cargo, empresa ou instituição atual de atuação',
      },
      {
        key: 'link_lattes',
        label: 'Currículo Lattes / LinkedIn',
        type: 'url',
        placeholder: 'http://lattes.cnpq.br/...',
      },
      {
        key: 'link_comprovacao',
        label: 'Link de Comprovação',
        type: 'url',
        placeholder: 'https://...',
        helperText: 'Ata de defesa, diploma ou comprovante',
      },
      { key: 'observacoes', label: 'Observações', type: 'textarea', rows: 2 },
    ],
    [docentes],
  )

  return (
    <>
      <CrudPage
        title="Egressos"
        icon={<UserCheck className="h-6 w-6 text-primary shrink-0" />}
        service={egressosService}
        columns={columns}
        fields={fields}
        emptyForm={initialEmptyForm}
        searchKey="nome"
        entityName="Egresso"
        printModule="egressos"
        tableHeaderClassName="bg-[#e9effc] sticky top-0 z-10"
        tableHeaderRowClassName="bg-[#e9effc] hover:bg-[#e9effc]"
        actionsHeaderClassName="text-left font-semibold text-slate-700"
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
        tableName="egressos"
        renderCustomActions={(item, { openEdit, openDelete, canEditItem, canDeleteItem }) => {
          // Salva referência do openEdit para o rodapé do modal de visualização
          edicaoRef.current = openEdit

          return (
            <div className="flex items-center justify-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleVisualizarEgresso(item)}
                className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                title="Visualizar Egresso"
                aria-label="Visualizar Egresso"
              >
                <Eye className="h-4 w-4 text-amber-500" />
              </Button>
              {canEditItem && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={openEdit}
                  className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                  title="Editar Egresso"
                >
                  <Edit className="h-4 w-4 text-primary" />
                </Button>
              )}
              {canDeleteItem && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={openDelete}
                  title="Excluir Egresso"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              )}
            </div>
          )
        }}
      />

      <VisualizarEgressoDialog
        open={dialogoVisualizarAberto}
        onOpenChange={setDialogoVisualizarAberto}
        egresso={egressoParaVisualizar}
        docentes={docentes}
        onEditar={(eg) => {
          setDialogoVisualizarAberto(false)
          edicaoRef.current?.(eg)
        }}
      />

      {/* Modal de Importação Lattes com Drag-and-Drop (mesma estrutura de Docentes e Discentes) */}
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
              Importar Currículo Lattes do Egresso (XML / ZIP)
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Arraste ou selecione o arquivo <strong>.xml</strong> ou <strong>.zip</strong>{' '}
              exportado da Plataforma Lattes. O sistema extrairá nome, ID Lattes, titulação
              concluída mais alta (Graduação, Mestrado ou Doutorado), anos e orientador para
              pré-preencher o formulário.
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

            {/* Aviso explicativo das Regras */}
            <div className="space-y-2">
              <div className="flex items-start gap-2.5 p-3 rounded-md bg-amber-50 text-amber-900 border border-amber-200/70 text-xs">
                <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-950">Aviso sobre o preenchimento:</p>
                  <p className="mt-0.5 text-amber-800">
                    A importação apenas pré-preenche os campos do formulário atual (nome, ID Lattes,
                    nível, ano de titulação e orientador). A gravação no banco só ocorre ao clicar
                    em <strong>Salvar</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-md bg-slate-50 text-slate-700 border border-slate-200 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" />
                <p>
                  <strong>Regra do Concluinte:</strong> apenas formações concluídas de Graduação,
                  Mestrado ou Doutorado são consideradas. Cursos em andamento não geram egresso. Em
                  caso de múltiplas titulações, prevalece a titulação mais alta concluída.
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
