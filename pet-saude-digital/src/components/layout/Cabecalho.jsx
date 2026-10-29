import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { programa } from '../../data/programa'
import { suave } from '../../lib/motion'
import { useInscricao } from '../../contexto/Inscricao'
import { useSessao } from '../../contexto/Sessao'
import { useEventosComInscricao } from '../../hooks/useEventosComInscricao'
import { rotuloTaxa } from '../../lib/dinheiro'

/** Marca do programa: quadrado laranja + tipografia, sem arquivo de logo. */
function Marca() {
  return (
    <div className="flex items-center gap-3">
      <motion.span
        initial={{ scale: 0, rotate: -25 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.6, ease: suave, delay: 0.1 }}
        className="relative grid h-9 w-9 flex-none place-items-center bg-pet-orange"
      >
        <span className="text-[15px] font-bold leading-none tracking-display text-white">P</span>
        <span className="absolute -bottom-1 -right-1 h-2 w-2 bg-pet-sky" />
      </motion.span>

      <div className="min-w-0 leading-none">
        <p className="truncate text-[15px] font-bold tracking-display text-white sm:text-[17px]">
          {programa.nome}
        </p>
        <p className="label mt-1 truncate text-white/55">{programa.sigla} · Eventos e notícias</p>
      </div>
    </div>
  )
}

export default function Cabecalho() {
  const { abrir } = useInscricao()
  const { participante } = useSessao()
  const { eventos: abertos } = useEventosComInscricao()
  // Com um evento so, o botao ja abre nele e mostra a taxa. Com varios, a
  // pessoa escolhe o evento dentro do assistente.
  const unico = abertos.length === 1 ? abertos[0] : null

  return (
    <header className="relative z-20 bg-pet-navy">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-4 py-2.5 sm:px-6 sm:py-3.5">
        <Marca />

        <div className="flex items-center gap-3 sm:gap-4">
          {participante ? (
            <Link
              to="/minha-inscricao"
              className="text-[12.5px] font-semibold text-white/80 hover:text-white"
            >
              Minhas inscrições
            </Link>
          ) : (
            <Link
              to="/entrar"
              className="text-[12.5px] font-semibold text-white/80 hover:text-white"
            >
              Entrar
            </Link>
          )}

          {abertos.length > 0 && (
            <motion.button
              type="button"
              onClick={() => abrir(unico?.id)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="hidden items-center gap-2.5 bg-pet-orange px-4 py-2.5 sm:inline-flex"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-pulse-ring bg-white" />
                <span className="relative inline-flex h-2 w-2 bg-white" />
              </span>
              <span className="text-[13px] font-semibold tracking-tight text-white">
                {unico ? `Inscrever-se · ${rotuloTaxa(unico.taxa)}` : 'Inscrever-se'}
              </span>
            </motion.button>
          )}
        </div>
      </div>
    </header>
  )
}
