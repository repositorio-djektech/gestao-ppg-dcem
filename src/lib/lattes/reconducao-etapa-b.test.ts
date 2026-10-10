import { describe, it, expect } from 'vitest'
import { parseLattesXml } from './parser'
import { converterLattesOrientacao } from './gravar'

describe('Etapa B - Recondução: Testes do Parser e Conversor de Orientações Lattes', () => {
  const xmlExemploConcluida = `<?xml version="1.0" encoding="ISO-8859-1"?>
<CURRICULO-VITAE NUMERO-IDENTIFICADOR="1234567890123456">
  <DADOS-GERAIS NOME-COMPLETO="Prof Teste Reconducao" />
  <OUTRA-PRODUCAO>
    <ORIENTACOES-CONCLUIDAS>
      <ORIENTACOES-CONCLUIDAS-PARA-MESTRADO>
        <DADOS-BASICOS-DE-ORIENTACOES-CONCLUIDAS-PARA-MESTRADO
          TITULO="Estudo de Novos Materiais Condutores"
          ANO="2026"
          DATA-DA-DEFESA="2026-04-10"
        />
        <DETALHAMENTO-DE-ORIENTACOES-CONCLUIDAS-PARA-MESTRADO
          NOME-DO-ORIENTANDO="Discente Concluido Silva"
          NOME-DA-INSTITUICAO="Universidade Federal de Sergipe"
          NOME-DO-CURSO="PPG-DCEM"
          TIPO-DE-ORIENTACAO="ORIENTADOR_PRINCIPAL"
        />
      </ORIENTACOES-CONCLUIDAS-PARA-MESTRADO>
      <ORIENTACOES-CONCLUIDAS-PARA-DOUTORADO>
        <DADOS-BASICOS-DE-ORIENTACOES-CONCLUIDAS-PARA-DOUTORADO
          TITULO="Tese de Doutorado em Nanotecnologia"
          ANO="2027"
        />
        <DETALHAMENTO-DE-ORIENTACOES-CONCLUIDAS-PARA-DOUTORADO
          NOME-DO-ORIENTANDO="Doutorando Pereira"
          NOME-DA-INSTITUICAO="UFS"
          NOME-DO-CURSO="DCEM"
          TIPO-DE-ORIENTACAO="CO_ORIENTADOR"
        />
      </ORIENTACOES-CONCLUIDAS-PARA-DOUTORADO>
    </ORIENTACOES-CONCLUIDAS>
    <ORIENTACOES-EM-ANDAMENTO>
      <ORIENTACAO-EM-ANDAMENTO-DE-MESTRADO>
        <DADOS-BASICOS-DA-ORIENTACAO-EM-ANDAMENTO-DE-MESTRADO
          TITULO="Síntese Verde de Nanopartículas"
          ANO="2025"
          ANO-DE-INICIO="2025"
        />
        <DETALHAMENTO-DA-ORIENTACAO-EM-ANDAMENTO-DE-MESTRADO
          NOME-DO-ORIENTANDO="Mestrando em Andamento Costa"
          NOME-DA-INSTITUICAO="UFS"
          NOME-DO-CURSO="PPG-DCEM"
          TIPO-DE-ORIENTACAO="ORIENTADOR_PRINCIPAL"
        />
      </ORIENTACAO-EM-ANDAMENTO-DE-MESTRADO>
    </ORIENTACOES-EM-ANDAMENTO>
  </OUTRA-PRODUCAO>
</CURRICULO-VITAE>`

  it('extrai orientação concluída com data_defesa formatada e flag_orientador_principal true', () => {
    const res = parseLattesXml(xmlExemploConcluida, 'teste.xml')
    expect(res.sucesso).toBe(true)

    const oriMestrado = res.orientacoes.find((o) => o.orientando === 'Discente Concluido Silva')
    expect(oriMestrado).toBeDefined()
    expect(oriMestrado?.situacao).toBe('CONCLUIDA')
    expect(oriMestrado?.status).toBe('concluido')
    expect(oriMestrado?.data_defesa).toBe('2026-04-10')
    expect(oriMestrado?.flag_orientador_principal).toBe(true)
    expect(oriMestrado?.tipo_orientacao).toBe('ORIENTADOR_PRINCIPAL')

    const conv = converterLattesOrientacao(oriMestrado!, { id_lattes: '123' })
    expect(conv.status).toBe('concluido')
    expect(conv.data_defesa).toBe('2026-04-10')
    expect(conv.flag_orientador_principal).toBe(true)
  })

  it('extrai orientação concluída sem data de defesa preenchendo AAAA-12-31 e co-orientador como flag false', () => {
    const res = parseLattesXml(xmlExemploConcluida, 'teste.xml')
    const oriDoutorado = res.orientacoes.find((o) => o.orientando === 'Doutorando Pereira')
    expect(oriDoutorado).toBeDefined()
    expect(oriDoutorado?.situacao).toBe('CONCLUIDA')
    expect(oriDoutorado?.status).toBe('concluido')
    // Sem DATA-DA-DEFESA explícita, recai sobre AAAA-12-31 do ano de conclusão
    expect(oriDoutorado?.data_defesa).toBe('2027-12-31')
    expect(oriDoutorado?.flag_orientador_principal).toBe(false)
    expect(oriDoutorado?.tipo_orientacao).toBe('CO_ORIENTADOR')

    const conv = converterLattesOrientacao(oriDoutorado!, { id_lattes: '123' })
    expect(conv.status).toBe('concluido')
    expect(conv.data_defesa).toBe('2027-12-31')
    expect(conv.flag_orientador_principal).toBe(false)
  })

  it('extrai orientação em andamento com status em_andamento e data_defesa nula', () => {
    const res = parseLattesXml(xmlExemploConcluida, 'teste.xml')
    const oriAndamento = res.orientacoes.find(
      (o) => o.orientando === 'Mestrando em Andamento Costa',
    )
    expect(oriAndamento).toBeDefined()
    expect(oriAndamento?.situacao).toBe('EM_ANDAMENTO')
    expect(oriAndamento?.status).toBe('em_andamento')
    expect(oriAndamento?.data_defesa).toBeNull()
    expect(oriAndamento?.flag_orientador_principal).toBe(true)

    const conv = converterLattesOrientacao(oriAndamento!, { id_lattes: '123' })
    expect(conv.status).toBe('em_andamento')
    expect(conv.data_defesa).toBeNull()
    expect(conv.flag_orientador_principal).toBe(true)
  })
})
