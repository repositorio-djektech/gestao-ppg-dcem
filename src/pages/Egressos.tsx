import { useState, useEffect, useMemo } from 'react'
import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { egressosService } from '@/services/egressos'
import { docentesService } from '@/services/docentes'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, Edit, Trash2 } from 'lucide-react'
import type { Egresso, Docente } from '@/types/database'
import { normalizarNomePessoa } from '@/lib/normalizacao'
import { DocenteNome } from '@/components/docentes/DocenteNome'
import { VisualizarEgressoDialog } from '@/components/egressos/VisualizarEgressoDialog'

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
}

export default function Egressos() {
  const [docentes, setDocentes] = useState<Docente[]>([])
  const [egressoParaVisualizar, setEgressoParaVisualizar] = useState<Egresso | null>(null)
  const [dialogoVisualizarAberto, setDialogoVisualizarAberto] = useState(false)
  const [funcaoAbrirEdicao, setFuncaoAbrirEdicao] = useState<((egresso: Egresso) => void) | null>(
    null,
  )

  useEffect(() => {
    docentesService
      .list()
      .then((docList) => setDocentes(docList))
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
        className: 'text-left font-medium text-slate-900',
        headerClassName: 'text-left font-semibold text-slate-700',
        render: (e) => (
          <div className="flex flex-col items-start gap-0.5">
            <span>{normalizarNomePessoa(e.nome)}</span>
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
        className: 'text-center',
        headerClassName: 'text-center font-semibold text-slate-700',
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
        className: 'text-center',
        headerClassName: 'text-center font-semibold text-slate-700',
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
        className: 'text-center',
        headerClassName: 'text-center font-semibold text-slate-700',
        render: (e) => {
          const docenteVinculado =
            e.docente_orientador_id && docenteObjMap.has(e.docente_orientador_id)
              ? docenteObjMap.get(e.docente_orientador_id)
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

          if (e.orientador && e.orientador.trim()) {
            return (
              <span className="text-xs text-slate-700 font-medium">
                {normalizarNomePessoa(e.orientador)}
              </span>
            )
          }

          return <span className="text-slate-400 text-xs">—</span>
        },
      },
      {
        key: 'atuacao_profissional',
        label: 'Atuação Profissional',
        className: 'text-center',
        headerClassName: 'text-center font-semibold text-slate-700',
        render: (e) => (
          <span className="text-xs text-slate-600 line-clamp-1 max-w-xs mx-auto">
            {e.atuacao_profissional || '—'}
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
        label: 'Orientador (docente)',
        type: 'select',
        options: docentes.map((d) => ({
          value: String(d.id),
          label: d.nome,
        })),
        placeholder: 'Selecione o docente orientador...',
        helperText: 'Docente vinculado responsável pela orientação',
        onValueChangeWithFormData: (val, currentData) => {
          const dId = val ? Number(val) : null
          const docente = dId ? docentes.find((d) => d.id === dId) : null
          return {
            ...currentData,
            docente_orientador_id: val,
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
        description="Gerencie os egressos do programa de pós-graduação."
        service={egressosService}
        columns={columns}
        fields={fields}
        emptyForm={emptyForm}
        searchKey="nome"
        entityName="Egresso"
        printModule="egressos"
        tableHeaderClassName="bg-[#e9effc] sticky top-0 z-10"
        tableHeaderRowClassName="bg-[#e9effc] hover:bg-[#e9effc]"
        actionsHeaderClassName="text-center font-semibold text-slate-700"
        renderCustomActions={(item, { openEdit, openDelete }) => {
          // Salva referência do openEdit para o rodapé do modal de visualização
          if (funcaoAbrirEdicao !== openEdit) {
            setFuncaoAbrirEdicao(() => openEdit)
          }

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
              <Button
                variant="ghost"
                size="icon"
                onClick={openEdit}
                className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                title="Editar Egresso"
              >
                <Edit className="h-4 w-4 text-primary" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={openDelete}
                title="Excluir Egresso"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          )
        }}
      />

      <VisualizarEgressoDialog
        open={dialogoVisualizarAberto}
        onOpenChange={setDialogoVisualizarAberto}
        egresso={egressoParaVisualizar}
        docentes={docentes}
        onEditar={
          funcaoAbrirEdicao
            ? (eg) => {
                setDialogoVisualizarAberto(false)
                funcaoAbrirEdicao(eg)
              }
            : undefined
        }
      />
    </>
  )
}
