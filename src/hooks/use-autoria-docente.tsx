import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { docentesService } from '@/services/docentes'
import type {
  ColunaRegistro,
  VinculoDocenteRegistro,
  criarServicoVinculosDocentes,
} from '@/services/vinculos-docentes-registro'
import { registrosVisiveisAoDocente } from '@/lib/registros/visibilidade'
import { SeletorDocentesAutores } from '@/components/publicacoes/SeletorDocentesAutores'
import type { FieldDef } from '@/components/crud/types'
import type { Docente } from '@/types/database'

type ServicoVinculos = ReturnType<typeof criarServicoVinculosDocentes>

/**
 * Autoria por docente em Patentes e Produção Técnica (D-27).
 * - Docente: vê e mexe só nos registros vinculados a ele; ao criar, o vínculo dele é gravado.
 * - Coordenação: vê tudo e escolhe os docentes autores no formulário.
 */
export function useAutoriaDocente(servico: ServicoVinculos, coluna: ColunaRegistro) {
  const { role, profile } = useAuth()
  const isDocente = role === 'docente'
  const docenteIdLogado = profile?.docente_id ?? null
  const [vinculos, setVinculos] = useState<VinculoDocenteRegistro[]>([])
  const [docentes, setDocentes] = useState<Docente[]>([])

  const recarregar = useCallback(async () => {
    try {
      setVinculos(await servico.listarTodos())
      if (!isDocente) setDocentes(await docentesService.list())
    } catch (err) {
      console.error('Erro ao carregar os vínculos de docentes:', err)
    }
  }, [servico, isDocente])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  /** Aplica a visão restrita do docente a uma lista de registros. */
  const filtrarLista = useCallback(
    async <T extends { id: number }>(todos: T[]): Promise<T[]> => {
      if (!isDocente) return todos
      return registrosVisiveisAoDocente(todos, docenteIdLogado, await servico.listarTodos(), coluna)
    },
    [isDocente, docenteIdLogado, servico, coluna],
  )

  /**
   * Grava os vínculos depois de criar/editar o registro. Deve rodar ANTES dos impactos sociais,
   * porque a RLS deles depende do vínculo. `idsDoFormulario` undefined = a coordenação não mexeu.
   */
  const salvarVinculos = useCallback(
    async (registroId: number, idsDoFormulario: number[] | undefined, criando: boolean) => {
      if (isDocente) {
        if (criando && docenteIdLogado) {
          await servico.sincronizarDocentes(registroId, [], { somenteDocenteId: docenteIdLogado })
        }
      } else if (idsDoFormulario !== undefined) {
        await servico.sincronizarDocentes(registroId, idsDoFormulario)
      }
      await recarregar()
    },
    [isDocente, docenteIdLogado, servico, recarregar],
  )

  const docentesDoRegistro = useCallback(
    (registroId: number) =>
      vinculos.filter((v) => Number(v[coluna]) === Number(registroId)).map((v) => v.docente_id),
    [vinculos, coluna],
  )

  /** Campo do formulário para a coordenação escolher os docentes autores (docente não vê). */
  const campoDocentesAutores: FieldDef | null = isDocente
    ? null
    : {
        key: 'docentes_autores_ids',
        label: 'Docentes autores (vínculo)',
        type: 'text',
        customRender: ({ formData, setFormData }) => {
          const selecionados: number[] =
            formData.docentes_autores_ids ??
            (formData.id ? docentesDoRegistro(Number(formData.id)) : [])
          return (
            <SeletorDocentesAutores
              autoresTexto={formData.autores}
              docentes={docentes}
              docentesSelecionadosIds={selecionados}
              onChangeDocentesIds={(ids) => setFormData({ ...formData, docentes_autores_ids: ids })}
              canEdit
            />
          )
        },
      }

  return {
    isDocente,
    docenteIdLogado,
    filtrarLista,
    salvarVinculos,
    docentesDoRegistro,
    campoDocentesAutores,
  }
}
