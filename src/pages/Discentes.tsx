import { useState, useEffect, useMemo } from 'react'
import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { discentesService } from '@/services/discentes'
import { docentesService } from '@/services/docentes'
import { projetosPesquisaService } from '@/services/projetos-pesquisa'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, Edit, Trash2 } from 'lucide-react'
import type { Discente, Docente, ProjetoPesquisa } from '@/types/database'
import { formatarCpf } from '@/lib/utils'
import { normalizarNomePessoa } from '@/lib/normalizacao'
import { DocenteNome } from '@/components/docentes/DocenteNome'
import { VisualizarDiscenteDialog } from '@/components/discentes/VisualizarDiscenteDialog'

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
  titulado: 'bg-blue-50 text-blue-700',
  desligado: 'bg-red-50 text-red-700',
}

export default function Discentes() {
  const [docentes, setDocentes] = useState<Docente[]>([])
  const [projetos, setProjetos] = useState<ProjetoPesquisa[]>([])
  const [discenteParaVisualizar, setDiscenteParaVisualizar] = useState<Discente | null>(null)
  const [dialogoVisualizarAberto, setDialogoVisualizarAberto] = useState(false)

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
        className: 'text-center',
        headerClassName: 'text-center font-semibold text-slate-700',
        render: (d) => (
          <div className="flex justify-center items-center">
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
        label: 'Data de Ingresso',
        type: 'date',
        required: true,
        helperText: 'Data de matrícula inicial no programa',
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        options: [
          { value: 'ativo', label: 'Ativo' },
          { value: 'titulado', label: 'Titulado' },
          { value: 'desligado', label: 'Desligado' },
        ],
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
        helperText: 'Ao escolher um docente, preenche automaticamente o campo texto abaixo',
        onValueChangeWithFormData: (val, currentData) => {
          const dId = val ? Number(val) : null
          const docente = dId ? docentes.find((d) => d.id === dId) : null
          let novoOrientadorTexto = currentData.orientador || ''
          if (docente) {
            if (!novoOrientadorTexto.trim()) {
              novoOrientadorTexto = docente.nome
            } else if (novoOrientadorTexto.trim() !== docente.nome) {
              const confirmar =
                typeof window === 'undefined' ||
                window.confirm(
                  `Deseja atualizar o campo de texto do orientador para "${docente.nome}"? (Texto atual: "${novoOrientadorTexto}")`,
                )
              if (confirmar) {
                novoOrientadorTexto = docente.nome
              }
            }
          }
          return {
            ...currentData,
            docente_orientador_id: val,
            orientador: novoOrientadorTexto,
          }
        },
      },
      {
        key: 'orientador',
        label: 'Orientador (texto livre / fallback)',
        type: 'text',
        placeholder: 'Nome do orientador do discente',
        helperText:
          'Nome para exibição e histórico (preenchido automaticamente ao vincular docente)',
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
        key: 'ano_conclusao',
        label: 'Ano de Conclusão',
        type: 'text',
        placeholder: 'Ex: 2026',
        helperText: 'Ano de defesa ou previsão de conclusão',
      },
      {
        key: 'link_lattes',
        label: 'Currículo Lattes',
        type: 'url',
        placeholder: 'http://lattes.cnpq.br/...',
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
    </>
  )
}
