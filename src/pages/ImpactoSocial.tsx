import { useState, useEffect, useMemo, useCallback } from 'react'
import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { impactoSocialService } from '@/services/impacto-social'
import { producaoTecnicaService } from '@/services/producao-tecnica'
import { patentesService } from '@/services/patentes'
import { premiacoesService } from '@/services/premiacoes'
import { impactosVinculosService } from '@/services/impactos-vinculos'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, Edit, Trash2, Layers, Sparkles, HeartHandshake } from 'lucide-react'
import type {
  ImpactoSocial,
  ImpactoVinculo,
  ProducaoTecnica,
  Patente,
  Premicao,
} from '@/types/database'
import { DetalhesImpactoModal } from '@/components/impacto-social/DetalhesImpactoModal'

const emptyForm = {
  titulo: '',
  descricao: '',
  ano: null,
  link_comprovacao: '',
  observacoes: '',
}

const fields: FieldDef[] = [
  {
    key: 'titulo',
    label: 'Título da Ação de Impacto Social',
    type: 'text',
    required: true,
    placeholder: 'Ex: Programa de divulgação científica em escolas públicas...',
  },
  {
    key: 'descricao',
    label: 'Descrição Detalhada',
    type: 'textarea',
    required: true,
    rows: 4,
    placeholder:
      'Descreva os objetivos, público beneficiado, resultados e relevância social para a avaliação da CAPES...',
    helperText: 'Descrição do impacto social gerado na comunidade ou setor produtivo',
  },
  {
    key: 'ano',
    label: 'Ano de Realização',
    type: 'number',
    required: true,
    min: 2020,
    max: 2035,
    placeholder: 'Ex: 2025',
  },
  {
    key: 'link_comprovacao',
    label: 'Link de Comprovação',
    type: 'url',
    placeholder: 'https://...',
    helperText: 'Notícia institucional, relatório ou certificado comprobatório',
  },
  { key: 'observacoes', label: 'Observações', type: 'textarea', rows: 2 },
]

export default function ImpactoSocialPage() {
  const [vinculos, setVinculos] = useState<ImpactoVinculo[]>([])
  const [producoesTecnicas, setProducoesTecnicas] = useState<ProducaoTecnica[]>([])
  const [patentes, setPatentes] = useState<Patente[]>([])
  const [premiacoes, setPremiacoes] = useState<Premicao[]>([])

  const [impactoSelecionado, setImpactoSelecionado] = useState<ImpactoSocial | null>(null)
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false)

  const carregarDadosCompletos = useCallback(async () => {
    try {
      const [vincList, ptList, patList, premList] = await Promise.all([
        impactosVinculosService.listarTodos(),
        producaoTecnicaService.list(),
        patentesService.list(),
        premiacoesService.list(),
      ])
      setVinculos(vincList || [])
      setProducoesTecnicas(ptList || [])
      setPatentes(patList || [])
      setPremiacoes(premList || [])
    } catch (err) {
      console.error('Erro ao carregar vínculos inversos de impacto social:', err)
    }
  }, [])

  useEffect(() => {
    carregarDadosCompletos()
  }, [carregarDadosCompletos])

  // Mapas para busca rápida por id
  const ptMap = useMemo(() => {
    const map = new Map<number, ProducaoTecnica>()
    producoesTecnicas.forEach((p) => map.set(p.id, p))
    return map
  }, [producoesTecnicas])

  const patMap = useMemo(() => {
    const map = new Map<number, Patente>()
    patentes.forEach((p) => map.set(p.id, p))
    return map
  }, [patentes])

  const premMap = useMemo(() => {
    const map = new Map<number, Premicao>()
    premiacoes.forEach((p) => map.set(p.id, p))
    return map
  }, [premiacoes])

  // Contagem de vínculos por impacto_social_id
  const contagemPorImpacto = useMemo(() => {
    const count: Record<number, number> = {}
    vinculos.forEach((v) => {
      const impId = Number(v.impacto_social_id)
      count[impId] = (count[impId] || 0) + 1
    })
    return count
  }, [vinculos])

  // Obter detalhes de vínculos para o modal aberto
  const dadosModalImpacto = useMemo(() => {
    if (!impactoSelecionado) {
      return {
        producoesTecnicas: [] as ProducaoTecnica[],
        patentes: [] as Patente[],
        premiacoes: [] as Premicao[],
        total: 0,
      }
    }

    const vincDoImpacto = vinculos.filter(
      (v) => Number(v.impacto_social_id) === Number(impactoSelecionado.id),
    )

    const pts: ProducaoTecnica[] = []
    const pats: Patente[] = []
    const prems: Premicao[] = []

    vincDoImpacto.forEach((v) => {
      const regId = Number(v.entidade_id)
      if (v.entidade === 'producao_tecnica') {
        const item = ptMap.get(regId)
        if (item) pts.push(item)
      } else if (v.entidade === 'patentes') {
        const item = patMap.get(regId)
        if (item) pats.push(item)
      } else if (v.entidade === 'premiacoes') {
        const item = premMap.get(regId)
        if (item) prems.push(item)
      }
    })

    return {
      producoesTecnicas: pts,
      patentes: pats,
      premiacoes: prems,
      total: vincDoImpacto.length,
    }
  }, [impactoSelecionado, vinculos, ptMap, patMap, premMap])

  const abrirVisualizacao = (item: ImpactoSocial) => {
    setImpactoSelecionado(item)
    setModalDetalhesAberto(true)
  }

  const columns: ColumnDef<ImpactoSocial>[] = [
    {
      key: 'titulo',
      label: 'Título',
      className: 'font-medium text-slate-900',
      render: (i) => (
        <button
          type="button"
          onClick={() => abrirVisualizacao(i)}
          className="text-left font-medium text-slate-900 hover:text-primary hover:underline transition-colors flex items-center gap-1.5"
          title="Clique para visualizar detalhes e registros vinculados"
        >
          <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span>{i.titulo}</span>
        </button>
      ),
    },
    {
      key: 'descricao',
      label: 'Descrição',
      render: (i) => (
        <span className="text-sm text-slate-600 line-clamp-2">{i.descricao || '-'}</span>
      ),
    },
    { key: 'ano', label: 'Ano' },
    {
      key: 'vinculos' as any,
      label: 'Registros Vinculados',
      render: (i) => {
        const total = contagemPorImpacto[i.id] || 0
        if (total === 0) {
          return <span className="text-slate-400 text-xs">Nenhum</span>
        }
        return (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => abrirVisualizacao(i)}
            className="h-7 px-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 hover:text-emerald-900 border border-emerald-200/70 gap-1 rounded-full"
            title="Ver produções técnicas, patentes e premiações vinculadas"
          >
            <Layers className="h-3 w-3 text-emerald-600" />
            <span>
              {total} vinculado{total > 1 ? 's' : ''}
            </span>
          </Button>
        )
      },
    },
  ]

  return (
    <>
      <CrudPage
        title="Impacto Social"
        icon={<HeartHandshake className="h-6 w-6 text-primary shrink-0" />}
        description="Gerencie os registros de impacto social do programa e visualize as produções vinculadas."
        service={impactoSocialService}
        columns={columns}
        fields={fields}
        emptyForm={emptyForm}
        searchKey="titulo"
        entityName="Impacto Social"
        tableName="impacto_social"
        printModule="impacto-social"
        renderCustomActions={(item, { openEdit, openDelete, canEditItem, canDeleteItem }) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => abrirVisualizacao(item)}
              className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
              title="Visualizar Impacto e Registros Vinculados"
            >
              <Eye className="h-4 w-4 text-emerald-600" />
            </Button>
            {canEditItem && (
              <Button
                variant="ghost"
                size="icon"
                onClick={openEdit}
                className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                title="Editar"
              >
                <Edit className="h-4 w-4 text-primary" />
              </Button>
            )}
            {canDeleteItem && (
              <Button
                variant="ghost"
                size="icon"
                onClick={openDelete}
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                title="Excluir"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            )}
          </div>
        )}
      />

      <DetalhesImpactoModal
        open={modalDetalhesAberto}
        onOpenChange={setModalDetalhesAberto}
        impacto={impactoSelecionado}
        producoesTecnicas={dadosModalImpacto.producoesTecnicas}
        patentes={dadosModalImpacto.patentes}
        premiacoes={dadosModalImpacto.premiacoes}
        totalVinculos={dadosModalImpacto.total}
      />
    </>
  )
}
