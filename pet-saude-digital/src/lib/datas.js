/*
 * Datas chegam da API como texto 'AAAA-MM-DD'. Tudo aqui trabalha em cima
 * desse texto, sem `new Date(...)`, para o fuso do navegador nao deslocar o
 * dia — um evento do dia 19 nao pode aparecer como 18 em Belem.
 */

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

function partes(iso = '') {
  const [ano, mes, dia] = String(iso).split('-').map(Number)
  return { ano, mes, dia }
}

/** '2026-10-19' -> '19/10/2026' */
export function formatarData(iso) {
  const { ano, mes, dia } = partes(iso)
  if (!ano) return ''
  return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`
}

/** '2026-10-19' -> '19 out' — usado nas colunas estreitas de data. */
export function dataCurta(iso) {
  const { mes, dia } = partes(iso)
  if (!mes) return ''
  return `${String(dia).padStart(2, '0')} ${MESES[mes - 1].slice(0, 3)}`
}

/** Periodo por extenso: '19 a 23 de outubro de 2026'. */
export function formatarPeriodo(inicio, fim = inicio) {
  const a = partes(inicio)
  const b = partes(fim)
  if (!a.ano) return ''
  if (inicio === fim) return `${a.dia} de ${MESES[a.mes - 1]} de ${a.ano}`
  if (a.ano !== b.ano) {
    return `${a.dia} de ${MESES[a.mes - 1]} de ${a.ano} a ${b.dia} de ${MESES[b.mes - 1]} de ${b.ano}`
  }
  if (a.mes !== b.mes) return `${a.dia} de ${MESES[a.mes - 1]} a ${b.dia} de ${MESES[b.mes - 1]} de ${b.ano}`
  return `${a.dia} a ${b.dia} de ${MESES[b.mes - 1]} de ${b.ano}`
}

/** Hoje em 'AAAA-MM-DD', no fuso local. */
export function hojeIso() {
  const d = new Date()
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, '0')).join('-')
}

/** Situacao do evento em relacao a hoje — comparacao de texto ISO e segura. */
export function situacaoEvento(inicio, fim, hoje = hojeIso()) {
  if (hoje < inicio) return 'em-breve'
  if (hoje > fim) return 'encerrado'
  return 'acontecendo'
}

export const rotuloSituacao = {
  'em-breve': 'Em breve',
  acontecendo: 'Acontecendo agora',
  encerrado: 'Encerrado',
}

// Quem acontece agora vem primeiro, depois o que esta por vir (do mais
// proximo ao mais distante) e, por fim, o historico (do mais recente).
const PESO = { acontecendo: 0, 'em-breve': 1, encerrado: 2 }

/** Acrescenta `situacao` e ordena; o primeiro da lista e o evento em destaque. */
export function ordenarEventos(eventos) {
  return eventos
    .map((e) => ({ ...e, situacao: situacaoEvento(e.dataInicio, e.dataFim) }))
    .sort((a, b) => {
      if (a.situacao !== b.situacao) return PESO[a.situacao] - PESO[b.situacao]
      return a.situacao === 'encerrado'
        ? b.dataInicio.localeCompare(a.dataInicio)
        : a.dataInicio.localeCompare(b.dataInicio)
    })
}
