import { motion } from 'framer-motion'
import { useListaApi } from '../../hooks/useListaApi'
import { parametroHash } from '../../hooks/useAbas'
import { formatarData } from '../../lib/datas'
import { surgir } from '../../lib/motion'
import TituloSecao from '../ui/TituloSecao'
import Sanfona from '../ui/Sanfona'
import AvisoLista from '../ui/AvisoLista'
import Paragrafos from '../ui/Paragrafos'

export default function Noticias() {
  const { itens, carregando, erro } = useListaApi('/noticias', 'noticias')
  // Link vindo da primeira tela (#noticias&noticia=12) abre essa noticia.
  const indiceLink = itens.findIndex((n) => String(n.id) === parametroHash('noticia'))

  // A API ja entrega da mais recente para a mais antiga.
  const blocos = itens.map((n) => ({
    id: `noticia-${n.id}`,
    titulo: n.titulo,
    resumo: [formatarData(n.publicadaEm), n.eventoNome].filter(Boolean).join(' · '),
    conteudo: (
      <div className="space-y-2.5">
        {n.resumo && (
          <p className="text-[14px] font-medium leading-snug tracking-tight text-pet-deep">{n.resumo}</p>
        )}
        <Paragrafos texto={n.conteudo} />
        {n.eventoNome && (
          <p className="border-t border-pet-navy/12 pt-2.5 text-[12px] text-pet-navy/55">
            <span className="label mr-2 text-pet-orange">Evento</span>
            {n.eventoNome}
          </p>
        )}
      </div>
    ),
  }))

  return (
    <div className="mx-auto max-w-3xl">
      <TituloSecao numero="03" etiqueta="Notícias" titulo="O que há de novo no programa">
        Avisos, resultados e novidades dos eventos do PET Saúde Digital, da mais recente para a
        mais antiga.
      </TituloSecao>

      <motion.div variants={surgir} initial="oculto" animate="visivel">
        <AvisoLista
          carregando={carregando}
          erro={erro}
          vazio={!blocos.length}
          textoVazio="Nenhuma notícia publicada ainda."
        />
        {blocos.length > 0 && (
          <Sanfona
            itens={blocos}
            inicial={indiceLink >= 0 ? indiceLink : 0}
            inicialCelular={indiceLink >= 0 ? indiceLink : null}
          />
        )}
      </motion.div>
    </div>
  )
}
