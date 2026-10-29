/** 15 -> 'R$ 15,00' */
export function reais(valor) {
  return `R$ ${Number(valor || 0).toFixed(2).replace('.', ',')}`
}

/** Taxa de inscricao para exibir: evento sem taxa aparece como gratuito. */
export function rotuloTaxa(valor) {
  return Number(valor) > 0 ? reais(valor) : 'Gratuito'
}
