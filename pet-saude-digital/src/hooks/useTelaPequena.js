import { useEffect, useState } from 'react'

/**
 * Informa se a tela esta abaixo do ponto de corte informado.
 *
 * Usado onde a diferenca entre celular e desktop nao e so de estilo, mas de
 * estrutura — por exemplo, a sanfona comeca fechada no celular e com o
 * primeiro item aberto no desktop. Isso nao da para resolver so com CSS.
 */
export function useTelaPequena(consulta = '(max-width: 1023px)') {
  const [pequena, setPequena] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(consulta).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(consulta)
    const aoMudar = (e) => setPequena(e.matches)

    setPequena(mq.matches)
    mq.addEventListener('change', aoMudar)
    return () => mq.removeEventListener('change', aoMudar)
  }, [consulta])

  return pequena
}
