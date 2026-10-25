import { useState, useEffect, useMemo, useCallback } from 'react'
import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { producaoTecnicaService } from '@/services/producao-tecnica'
import { impactoSocialService } from '@/services/impacto-social'
import { impactosVinculosService } from '@/services/impactos-vinculos'
import { Badge } from '@/components/ui/badge'
import type { ProducaoTecnica, ImpactoSocial } from '@/types/database'
import {
  SeletorImpactos,
  BadgesImpactosListagem,
} from '@/components/impacto-social/SeletorImpactos'

const emptyForm = {
  titulo: '',
  ano: null,
  autores: '',
  tipo: 'Software',
  link_comprovacao: '',
  observacoes: '',
  impactos_vinculados_ids: [] as number[],
}

const tipoColors: Record<string, string> = {
  Software: 'bg-violet-50 text-violet-700',
  Patente: 'bg-amber-50 text-amber-700',
  Relatório: 'bg-cyan-50 text-cyan-700',
}

export default function ProducaoTecnicaPage() {
  const [impactos, setImpactos] = useState<ImpactoSocial[]>([])
  const [vinculosPorRegistro, setVinculosPorRegistro] = useState<Record<number, number[]>>({})

  const impactosMap = useMemo(() => {
    const map: Record<number, ImpactoSocial> = {}
    impactos.forEach((imp) => {
      map[imp.id] = imp
    })
    return map
  }, [impactos])

  const carregarDadosVinculos = useCallback(async () => {
    try {
      const [listaImpactos, vinculos] = await Promise.all([
        impactoSocialService.list(),
        impactosVinculosService.listarPorEntidade('producao_tecnica'),
      ])
      setImpactos(listaImpactos || [])

      const porRegistro: Record<number, number[]> = {}
      ;(vinculos || []).forEach((v) => {
        const rId = Number(v.entidade_id)
        if (!porRegistro[rId]) porRegistro[rId] = []
        porRegistro[rId].push(Number(v.impacto_social_id))
      })
      setVinculosPorRegistro(porRegistro)
    } catch (err) {
      console.error('Erro ao carregar impactos e vínculos de produção técnica:', err)
    }
  }, [])

  useEffect(() => {
    carregarDadosVinculos()
  }, [carregarDadosVinculos])

  const customService = useMemo(() => {
    return {
      ...producaoTecnicaService,
      create: async (item: Partial<ProducaoTecnica>) => {
        const itemAny = item as any
        const impactosIds: number[] = itemAny.impactos_vinculados_ids || []
        const payload = { ...item }
        delete (payload as any).impactos_vinculados_ids

        const novo = await producaoTecnicaService.create(payload)
        if (novo?.id) {
          await impactosVinculosService.sincronizarVinculosRegistro(
            'producao_tecnica',
            Number(novo.id),
            impactosIds,
          )
          await carregarDadosVinculos()
        }
        return novo
      },
      update: async (id: number | string, item: Partial<ProducaoTecnica>) => {
        const itemAny = item as any
        const impactosIds: number[] = itemAny.impactos_vinculados_ids || []
        const payload = { ...item }
        delete (payload as any).impactos_vinculados_ids

        const atualizado = await producaoTecnicaService.update(id, payload)
        await impactosVinculosService.sincronizarVinculosRegistro(
          'producao_tecnica',
          Number(id),
          impactosIds,
        )
        await carregarDadosVinculos()
        return atualizado
      },
      remove: async (id: number | string) => {
        await producaoTecnicaService.remove(id)
        await impactosVinculosService.sincronizarVinculosRegistro(
          'producao_tecnica',
          Number(id),
          [],
        )
        await carregarDadosVinculos()
      },
    }
  }, [carregarDadosVinculos])

  const columns: ColumnDef<ProducaoTecnica>[] = [
    { key: 'titulo', label: 'Título', className: 'font-medium text-slate-900' },
    {
      key: 'tipo',
      label: 'Tipo',
      render: (p) => (
        <Badge variant="secondary" className={`border-0 ${tipoColors[p.tipo] ?? ''}`}>
          {p.tipo}
        </Badge>
      ),
    },
    { key: 'ano', label: 'Ano' },
    {
      key: 'autores',
      label: 'Autores',
      render: (p) => (
        <span className="text-sm text-slate-600 line-clamp-1">{p.autores || '-'}</span>
      ),
    },
    {
      key: 'impactos' as any,
      label: 'Impacto',
      render: (p) => (
        <BadgesImpactosListagem impactosIds={vinculosPorRegistro[p.id]} impactosMap={impactosMap} />
      ),
    },
  ]

  const fields: FieldDef[] = [
    {
      key: 'titulo',
      label: 'Título do Produto / Produção Técnica',
      type: 'text',
      required: true,
      placeholder: 'Ex: Sistema de monitoramento térmico...',
    },
    {
      key: 'tipo',
      label: 'Tipo de Produção',
      type: 'select',
      required: true,
      options: [
        { value: 'Software', label: 'Software' },
        { value: 'Patente', label: 'Patente / Propriedade Intelectual' },
        { value: 'Relatório', label: 'Relatório Técnico Conclusivo' },
        { value: 'Manual/Protocolo', label: 'Manual ou Protocolo Tecnológico' },
        { value: 'Curso/Treinamento', label: 'Curso ou Treinamento Técnico' },
      ],
    },
    {
      key: 'autores',
      label: 'Autores / Desenvolvedores',
      type: 'text',
      required: true,
      placeholder: 'Ex: Silva, J.; Mendes, A.',
    },
    {
      key: 'ano',
      label: 'Ano de Conclusão / Registro',
      type: 'number',
      required: true,
      min: 2000,
      max: 2035,
      placeholder: 'Ex: 2025',
    },
    {
      key: 'link_comprovacao',
      label: 'Link de Comprovação (Repositório / Documento)',
      type: 'url',
      placeholder: 'https://...',
      helperText: 'Link para repositório público, registro ou comprovante',
    },
    {
      key: 'impactos_vinculados_ids',
      label: 'Impactos Sociais Vinculados',
      type: 'text',
      customRender: ({ formData, setFormData, submitting }) => {
        // Inicializa com os vínculos existentes se for edição e o campo ainda não estiver setado
        let selecionados: number[] = formData.impactos_vinculados_ids
        if (selecionados === undefined && formData.id) {
          selecionados = vinculosPorRegistro[formData.id] || []
        }
        selecionados = selecionados || []

        return (
          <SeletorImpactos
            impactosDisponiveis={impactos}
            impactosSelecionadosIds={selecionados}
            disabled={submitting}
            onChange={(novosIds) => {
              setFormData({
                ...formData,
                impactos_vinculados_ids: novosIds,
              })
            }}
          />
        )
      },
    },
    { key: 'observacoes', label: 'Observações', type: 'textarea', rows: 2 },
  ]

  return (
    <CrudPage
      title="Produção Técnica"
      description="Gerencie a produção técnica do programa."
      service={customService}
      columns={columns}
      fields={fields}
      emptyForm={emptyForm}
      searchKey="titulo"
      entityName="Produção Técnica"
      tableName="producao_tecnica"
      printModule="producao-tecnica"
    />
  )
}
