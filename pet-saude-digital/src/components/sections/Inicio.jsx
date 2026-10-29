import { motion } from 'framer-motion'
import { coordenacao, iniciais, objetivos, programa } from '../../data/programa'
import { surgir } from '../../lib/motion'
import { dataCurta, ordenarEventos } from '../../lib/datas'
import { useListaApi } from '../../hooks/useListaApi'
import { aceitaInscricao } from '../../hooks/useEventosComInscricao'
import TituloSecao from '../ui/TituloSecao'
import Sanfona from '../ui/Sanfona'
import Monograma from '../ui/Monograma'

const ROTULO_DESTAQUE = {
  acontecendo: 'Acontecendo agora',
  'em-breve': 'Próximo evento',
  encerrado: 'Último evento',
}

/**
 * Evento em destaque — o unico bloco sempre visivel alem do titulo.
 *
 * Vem do cadastro de eventos: o que esta acontecendo, senao o proximo, senao
 * o ultimo que aconteceu. Clicar abre o evento na aba Eventos. Sem API ou
 * sem eventos publicados, o bloco nao aparece.
 */
function EventoDestaque() {
  const { itens } = useListaApi('/eventos', 'eventos')
  const [e] = ordenarEventos(itens)
  if (!e) return null

  const quando = e.dataInicio === e.dataFim ? dataCurta(e.dataInicio) : `${dataCurta(e.dataInicio)} — ${dataCurta(e.dataFim)}`

  return (
    <motion.a
      href={`#eventos&evento=${e.id}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="group grid grid-cols-2 bg-pet-navy sm:grid-cols-[1.6fr_1fr_1fr]"
    >
      <div className="col-span-2 min-w-0 border-b border-white/10 px-3.5 py-2.5 sm:col-span-1 sm:border-b-0 sm:px-4 sm:py-3.5">
        <p className="label text-white/40">{ROTULO_DESTAQUE[e.situacao]}</p>
        <p className="mt-1 truncate text-[14px] font-bold leading-tight tracking-display text-white sm:mt-1.5 sm:text-[15px]">
          {e.nome}
        </p>
        <p className="mt-1 text-[11px] leading-none text-pet-sky transition-colors group-hover:text-white">
          {aceitaInscricao(e) ? 'Inscrições abertas · ver detalhes →' : 'Ver detalhes →'}
        </p>
      </div>
      <div className="px-3.5 py-2.5 sm:border-l sm:border-white/10 sm:px-4 sm:py-3.5">
        <p className="label text-white/40">Quando</p>
        <p className="mt-1 text-[14px] font-bold leading-none tracking-display text-white sm:mt-1.5 sm:text-[15px]">
          {quando}
        </p>
        <p className="mt-1 text-[11px] leading-none text-pet-sky">{e.dataFim.slice(0, 4)}</p>
      </div>
      <div className="min-w-0 border-l border-white/10 px-3.5 py-2.5 sm:px-4 sm:py-3.5">
        <p className="label text-white/40">Onde</p>
        <p className="mt-1 line-clamp-2 text-[12.5px] font-semibold leading-snug text-white sm:mt-1.5">
          {e.local || 'A definir'}
        </p>
      </div>
    </motion.a>
  )
}

/**
 * Ultimas noticias na primeira tela, logo abaixo do evento em destaque.
 *
 * Mostra so o titulo de cada uma — o texto fica na aba Noticias, que abre
 * ja com a noticia clicada expandida. No celular sao duas linhas, para a
 * aba continuar cabendo na tela. Sem API ou sem noticias, o bloco
 * simplesmente nao aparece.
 */
function UltimasNoticias() {
  const { itens } = useListaApi('/noticias', 'noticias')
  if (!itens.length) return null

  return (
    <motion.div variants={surgir} initial="oculto" animate="visivel" className="mt-6">
      <div className="mb-1 flex items-baseline justify-between">
        <p className="label text-pet-navy/40">Últimas notícias</p>
        <a href="#noticias" className="label text-pet-orange hover:text-pet-deep">
          Ver todas →
        </a>
      </div>
      <ul>
        {itens.slice(0, 3).map((n, i) => (
          <li key={n.id} className={`border-t border-pet-navy/15 last:border-b ${i === 2 ? 'hidden sm:block' : ''}`}>
            <a
              href={`#noticias&noticia=${n.id}`}
              className="group flex items-baseline gap-3 py-2.5 transition-colors hover:bg-white/60"
            >
              <span className="label w-12 flex-none text-pet-orange">{dataCurta(n.publicadaEm)}</span>
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium tracking-tight text-pet-deep">
                {n.titulo}
              </span>
              <span className="flex-none text-[13px] text-pet-navy/30 transition-colors group-hover:text-pet-orange">
                →
              </span>
            </a>
          </li>
        ))}
      </ul>
    </motion.div>
  )
}

export default function Inicio() {
  /*
   * Todo o conteudo descritivo vive na sanfona. Fechado, cada bloco ocupa
   * uma linha; assim a aba inteira cabe na tela do celular, que era o
   * requisito principal do cliente.
   */
  const blocos = [
    {
      id: 'o-que-e',
      titulo: 'O que é o PET Saúde Digital',
      resumo: 'Programa de educação pelo trabalho da UEPA',
      conteudo: (
        <div className="space-y-2.5">
          <p className="text-[13.5px] leading-relaxed text-pet-navy/85">
            Programa de educação pelo trabalho da UEPA que integra estudantes, docentes e
            profissionais dos serviços em torno de um objetivo comum: usar tecnologia para
            qualificar o cuidado em saúde na Amazônia.
          </p>
          <p className="text-[13.5px] leading-relaxed text-pet-navy/85">
            Os grupos desenvolvem soluções de análise de dados em{' '}
            <strong className="font-semibold text-pet-deep">Python</strong>, protótipos de apoio à
            decisão clínica e estudos sobre telessaúde no interior do estado.
          </p>
          <p className="text-[12.5px] leading-relaxed text-pet-navy/60">
            Os eventos são abertos a {programa.publico.toLowerCase()}.
          </p>
        </div>
      ),
    },
    {
      id: 'objetivos',
      titulo: 'Objetivos do programa',
      resumo: `${objetivos.length} objetivos`,
      conteudo: (
        <ul>
          {objetivos.map((objetivo, i) => (
            <li
              key={i}
              className="flex gap-4 border-t border-pet-navy/12 py-2.5 first:border-t-0 first:pt-0"
            >
              <span className="label w-5 flex-none pt-0.5 text-pet-orange">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-[13.5px] leading-snug text-pet-navy/85">{objetivo}</span>
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: 'coordenacao',
      titulo: 'Coordenação',
      // Derivado dos dados: trocar um nome em programa.js nao pode deixar
      // este resumo desatualizado.
      resumo: coordenacao.map((p) => p.nome).join(' e '),
      conteudo: (
        <div>
          {coordenacao.map((p) => (
            <div
              key={p.id}
              className="flex gap-3.5 border-t border-pet-navy/12 py-3 first:border-t-0 first:pt-0"
            >
              <Monograma
                texto={iniciais(p.nome)}
                foto={p.foto}
                alt={`Retrato de ${p.nome}`}
                tamanho="sm"
                tom="ice"
              />
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold leading-tight tracking-tight text-pet-deep">
                  {p.titulo} {p.nome}
                </p>
                <p className="mt-0.5 text-[11.5px] text-pet-orange">{p.cargo}</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-pet-navy/70">
                  {p.formacao}. {p.bio}
                </p>
              </div>
            </div>
          ))}
          <p className="mt-3 text-[11px] leading-relaxed text-pet-navy/40">
            Minicurrículos no formato de resumo Lattes, com dados fictícios.
          </p>
        </div>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-3xl">
      <TituloSecao numero="01" etiqueta="Início" titulo={programa.chamada} />

      <EventoDestaque />

      <UltimasNoticias />

      <motion.div variants={surgir} initial="oculto" animate="visivel" className="mt-6">
        <p className="label mb-1 text-pet-navy/40">Saiba mais</p>
        <Sanfona itens={blocos} inicial={0} />
      </motion.div>
    </div>
  )
}
