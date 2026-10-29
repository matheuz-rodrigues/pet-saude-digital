import { motion } from 'framer-motion'
import { useInscricao } from '../../contexto/Inscricao'
import { useEventosComInscricao } from '../../hooks/useEventosComInscricao'
import { rotuloTaxa } from '../../lib/dinheiro'

/**
 * Barra fixa de inscricao — visivel apenas no celular.
 * Abre o assistente no proprio site, em tela cheia. Sem evento com
 * inscricao aberta, a barra nao aparece.
 */
export default function BarraInscricao() {
  const { abrir } = useInscricao()
  const { eventos: abertos } = useEventosComInscricao()
  if (!abertos.length) return null
  const unico = abertos.length === 1 ? abertos[0] : null

  return (
    <motion.div
      initial={{ y: 60 }}
      animate={{ y: 0 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 28 }}
      className="z-30 flex items-stretch border-t border-white/10 bg-pet-ink sm:hidden"
    >
      <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-2.5 leading-tight">
        <span className="label truncate text-white/40">{unico ? unico.nome : 'Inscrições abertas'}</span>
        <span className="text-[15px] font-bold tracking-display text-white">
          {unico ? rotuloTaxa(unico.taxa) : `${abertos.length} eventos`}
        </span>
      </div>

      <button
        type="button"
        onClick={() => abrir(unico?.id)}
        className="flex items-center gap-2 bg-pet-orange px-5 text-[14px] font-semibold tracking-tight text-white active:brightness-95"
      >
        Inscrever-se
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M4 12h15M13 6l6 6-6 6" strokeLinecap="square" />
        </svg>
      </button>
    </motion.div>
  )
}
