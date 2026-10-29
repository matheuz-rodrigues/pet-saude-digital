import { motion } from 'framer-motion'
import { useListaApi } from '../../hooks/useListaApi'
import { parametroHash } from '../../hooks/useAbas'
import { aceitaInscricao } from '../../hooks/useEventosComInscricao'
import { useInscricao } from '../../contexto/Inscricao'
import { dataCurta, formatarPeriodo, ordenarEventos, rotuloSituacao } from '../../lib/datas'
import { rotuloTaxa } from '../../lib/dinheiro'
import { surgir } from '../../lib/motion'
import TituloSecao from '../ui/TituloSecao'
import Sanfona from '../ui/Sanfona'
import AvisoLista from '../ui/AvisoLista'
import Paragrafos from '../ui/Paragrafos'

const ROTULO_TIPO = {
  palestra: 'Palestra',
  mesa: 'Mesa-redonda',
  minicurso: 'Minicurso',
  oficina: 'Oficina',
  projetos: 'Projetos',
}

/** Programacao de um evento completo, agrupada por dia. */
function Programacao({ atividades }) {
  const dias = [...new Set(atividades.map((a) => a.data))]
  return (
    <div className="border-t border-pet-navy/12 pt-2.5">
      <p className="label mb-1.5 text-pet-navy/40">Programação</p>
      {dias.map((d) => (
        <div key={d} className="flex gap-3 border-t border-pet-navy/8 py-1.5 first:border-t-0">
          <span className="label w-12 flex-none pt-0.5 text-pet-orange">{dataCurta(d)}</span>
          <ul className="min-w-0 flex-1 space-y-1">
            {atividades
              .filter((a) => a.data === d)
              .map((a) => (
                <li key={a.id} className="text-[12.5px] leading-snug text-pet-navy/80">
                  {a.horario && <span className="mr-1.5 text-pet-navy/45">{a.horario}</span>}
                  {a.titulo}
                  <span className="ml-1.5 text-[11px] text-pet-navy/45">
                    {ROTULO_TIPO[a.tipo] || a.tipo}
                    {a.vagas != null && (a.esgotada ? ' · esgotada' : ` · ${a.vagas - a.ocupadas} vagas`)}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export default function Eventos() {
  const { itens, carregando, erro } = useListaApi('/eventos', 'eventos')
  const { abrir } = useInscricao()

  const ordenados = ordenarEventos(itens)
  // Link vindo da primeira tela (#eventos&evento=3) abre esse evento.
  const indiceLink = ordenados.findIndex((e) => String(e.id) === parametroHash('evento'))

  const blocos = ordenados.map((e) => ({
    id: `evento-${e.id}`,
    titulo: e.nome,
    resumo: [formatarPeriodo(e.dataInicio, e.dataFim), e.local, aceitaInscricao(e) && 'Inscrições abertas']
      .filter(Boolean)
      .join(' · '),
    conteudo: (
      <div className="space-y-2.5">
        <p className={`label ${e.situacao === 'encerrado' ? 'text-pet-navy/40' : 'text-pet-orange'}`}>
          {rotuloSituacao[e.situacao]}
        </p>
        {e.chamada && (
          <p className="text-[14px] font-medium leading-snug tracking-tight text-pet-deep">{e.chamada}</p>
        )}
        <Paragrafos texto={e.descricao} />
        <dl className="grid grid-cols-2 border-t border-pet-navy/12 pt-2.5">
          <div>
            <dt className="label text-pet-navy/40">Quando</dt>
            <dd className="mt-1 text-[12.5px] text-pet-navy/75">{formatarPeriodo(e.dataInicio, e.dataFim)}</dd>
          </div>
          {e.local && (
            <div className="border-l border-pet-navy/12 pl-3">
              <dt className="label text-pet-navy/40">Onde</dt>
              <dd className="mt-1 text-[12.5px] text-pet-navy/75">{e.local}</dd>
            </div>
          )}
        </dl>
        {e.tipo === 'completo' && e.atividades.length > 0 && <Programacao atividades={e.atividades} />}
        {e.tipo === 'completo' &&
          (aceitaInscricao(e) ? (
            <button
              type="button"
              onClick={() => abrir(e.id)}
              className="w-full bg-pet-orange py-2.5 text-[13px] font-semibold text-white sm:w-auto sm:px-5"
            >
              Inscrever-se · {rotuloTaxa(e.taxa)}
            </button>
          ) : (
            <p className="label text-pet-navy/40">Inscrições encerradas</p>
          ))}
      </div>
    ),
  }))

  return (
    <div className="mx-auto max-w-3xl">
      <TituloSecao numero="02" etiqueta="Eventos" titulo="Agenda do PET Saúde Digital">
        Todos os eventos do programa — os que estão por vir e os que já aconteceram.
      </TituloSecao>

      <motion.div variants={surgir} initial="oculto" animate="visivel">
        <AvisoLista
          carregando={carregando}
          erro={erro}
          vazio={!blocos.length}
          textoVazio="Nenhum evento publicado ainda."
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
