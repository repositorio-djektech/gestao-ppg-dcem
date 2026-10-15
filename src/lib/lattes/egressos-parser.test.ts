import { describe, it, expect } from 'vitest'
import { extrairDadosLattesEgresso } from './egressos-parser'

describe('extrairDadosLattesEgresso - Etapa E2 Egressos', () => {
  const docentesExemplo = [
    { id: 1, nome: 'Ledjane Silva Barreto', id_lattes: '1111111111111111' },
    { id: 2, nome: 'Carlos Alberto Santos', id_lattes: '2222222222222222' },
  ]

  it('extrai lattes_id (16 dígitos), nome, nacionalidade e formação mais alta concluída', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <CURRICULO-VITAE NUMERO-IDENTIFICADOR="1234567890123456" DATA-ATUALIZACAO="10102024">
      <DADOS-GERAIS NOME-COMPLETO="João da Silva Pereira" PAIS-DE-NACIONALIDADE="Brasil">
      </DADOS-GERAIS>
      <FORMACAO-ACADEMICA-TITULACAO>
        <GRADUACAO ANO-DE-INICIO="2015" ANO-DE-CONCLUSAO="2019" NOME-CURSO="Engenharia de Materiais" NOME-INSTITUICAO="UFS">
        </GRADUACAO>
        <MESTRADO ANO-DE-INICIO="2020" ANO-DE-CONCLUSAO="2022" NOME-CURSO="Ciência e Engenharia de Materiais" NOME-INSTITUICAO="UFS" NOME-COMPLETO-DO-ORIENTADOR="Ledjane Silva Barreto">
        </MESTRADO>
      </FORMACAO-ACADEMICA-TITULACAO>
    </CURRICULO-VITAE>`

    const res = extrairDadosLattesEgresso(xml, docentesExemplo)

    expect(res.lattesId).toBe('1234567890123456')
    expect(res.nomeCompleto).toBe('João da Silva Pereira')
    expect(res.nacionalidade).toBe('Brasil')
    expect(res.tipoCurso).toBe('Mestrado')
    expect(res.anoTitulacao).toBe('2022')
    expect(res.anoIngresso).toBe('2020')
    expect(res.nomeOrientadorCitado).toBe('Ledjane Silva Barreto')
    expect(res.sugestaoOrientador).not.toBeNull()
    expect(res.sugestaoOrientador?.docenteId).toBe(1)
    expect(res.sugestaoOrientador?.altaConfianca).toBe(true)
  })

  it('regra do concluinte: ignora formação em andamento (não gera egresso a partir dela)', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <CURRICULO-VITAE NUMERO-IDENTIFICADOR="9876543210987654">
      <DADOS-GERAIS NOME-COMPLETO="Maria Oliveira Santos">
      </DADOS-GERAIS>
      <FORMACAO-ACADEMICA-TITULACAO>
        <GRADUACAO ANO-DE-INICIO="2016" ANO-DE-CONCLUSAO="2020" NOME-CURSO="Química">
        </GRADUACAO>
        <MESTRADO ANO-DE-INICIO="2021" STATUS-DO-CURSO="EM_ANDAMENTO" NOME-CURSO="Ciência de Materiais">
        </MESTRADO>
      </FORMACAO-ACADEMICA-TITULACAO>
    </CURRICULO-VITAE>`

    const res = extrairDadosLattesEgresso(xml, docentesExemplo)

    // Mestrado em andamento é ignorado. A maior titulação CONCLUÍDA é Graduação (2020)
    expect(res.tipoCurso).toBe('Graduação')
    expect(res.anoTitulacao).toBe('2020')
    expect(res.anoIngresso).toBe('2016')
  })

  it('prevalece a titulação mais alta concluída: Doutorado > Mestrado > Graduação', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <CURRICULO-VITAE NUMERO-IDENTIFICADOR="5555555555555555">
      <DADOS-GERAIS NOME-COMPLETO="Carlos Eduardo Lima">
      </DADOS-GERAIS>
      <FORMACAO-ACADEMICA-TITULACAO>
        <GRADUACAO ANO-DE-INICIO="2010" ANO-DE-CONCLUSAO="2014" NOME-CURSO="Física" />
        <MESTRADO ANO-DE-INICIO="2015" ANO-DE-CONCLUSAO="2017" NOME-CURSO="Física da Matéria Condensada" />
        <DOUTORADO ANO-DE-INICIO="2018" ANO-DE-CONCLUSAO="2022" NOME-CURSO="Ciência e Engenharia de Materiais" NOME-ORIENTADOR-DOUT="Carlos Alberto Santos" />
      </FORMACAO-ACADEMICA-TITULACAO>
    </CURRICULO-VITAE>`

    const res = extrairDadosLattesEgresso(xml, docentesExemplo)

    expect(res.tipoCurso).toBe('Doutorado')
    expect(res.anoTitulacao).toBe('2022')
    expect(res.anoIngresso).toBe('2018')
    expect(res.nomeOrientadorCitado).toBe('Carlos Alberto Santos')
    expect(res.sugestaoOrientador?.docenteId).toBe(2)
    expect(res.sugestaoOrientador?.altaConfianca).toBe(true)
  })

  it('se nenhuma formação foi concluída, tipoCurso e anoTitulacao retornam null', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <CURRICULO-VITAE NUMERO-IDENTIFICADOR="4444444444444444">
      <DADOS-GERAIS NOME-COMPLETO="Estudante Apenas Em Andamento">
      </DADOS-GERAIS>
      <FORMACAO-ACADEMICA-TITULACAO>
        <MESTRADO ANO-DE-INICIO="2023" STATUS-DO-CURSO="EM_ANDAMENTO" />
      </FORMACAO-ACADEMICA-TITULACAO>
    </CURRICULO-VITAE>`

    const res = extrairDadosLattesEgresso(xml, docentesExemplo)

    expect(res.tipoCurso).toBeNull()
    expect(res.anoTitulacao).toBeNull()
    expect(res.formacoesConcluidas.length).toBe(0)
  })

  it('resolve orientador com match por aproximação de nome ("Profª Ledjane S. Barreto")', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <CURRICULO-VITAE NUMERO-IDENTIFICADOR="1122334455667788">
      <DADOS-GERAIS NOME-COMPLETO="Egresso Teste">
      </DADOS-GERAIS>
      <FORMACAO-ACADEMICA-TITULACAO>
        <MESTRADO ANO-DE-INICIO="2020" ANO-DE-CONCLUSAO="2022" NOME-COMPLETO-DO-ORIENTADOR="Barreto, Ledjane Silva">
        </MESTRADO>
      </FORMACAO-ACADEMICA-TITULACAO>
    </CURRICULO-VITAE>`

    const res = extrairDadosLattesEgresso(xml, docentesExemplo)

    expect(res.sugestaoOrientador).not.toBeNull()
    expect(res.sugestaoOrientador?.docenteId).toBe(1)
    expect(res.sugestaoOrientador?.altaConfianca).toBe(true)
  })
})
