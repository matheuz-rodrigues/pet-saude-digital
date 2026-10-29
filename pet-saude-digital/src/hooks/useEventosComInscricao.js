import { hojeIso, ordenarEventos } from '../lib/datas'
import { useListaApi } from './useListaApi'

/** Evento completo, com inscricoes abertas e que ainda nao terminou. */
export function aceitaInscricao(evento) {
  return evento.tipo === 'completo' && evento.inscricoesAbertas && evento.dataFim >= hojeIso()
}

/**
 * Eventos em que da para se inscrever agora, do mais proximo ao mais
 * distante. Cabecalho, barra do celular e Contato usam esta lista para
 * decidir se mostram o botao de inscricao e com qual taxa.
 */
export function useEventosComInscricao() {
  const { itens, carregando } = useListaApi('/eventos', 'eventos')
  return { eventos: ordenarEventos(itens).filter(aceitaInscricao), carregando }
}
