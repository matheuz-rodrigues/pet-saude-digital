/*
 * Variantes de animacao compartilhadas (Framer Motion).
 *
 * Centralizar as curvas e duracoes aqui mantem o movimento coerente entre
 * as abas — o site inteiro usa a mesma "assinatura" de animacao.
 */

export const suave = [0.22, 1, 0.36, 1] // ease-out expressivo

/** Entrada padrao de blocos de conteudo. */
export const surgir = {
  oculto: { opacity: 0, y: 16 },
  visivel: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: suave },
  },
}

/** Entrada lateral, usada em listas e reguas. */
export const surgirLateral = {
  oculto: { opacity: 0, x: -18 },
  visivel: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: suave },
  },
}

/** Container que escalona a entrada dos filhos. */
export function escalonar(intervalo = 0.06, atraso = 0.04) {
  return {
    oculto: {},
    visivel: {
      transition: { staggerChildren: intervalo, delayChildren: atraso },
    },
  }
}

/** Troca de aba: desliza no sentido da navegacao. */
export const painelAba = {
  entrada: (direcao) => ({ opacity: 0, x: direcao > 0 ? 40 : -40 }),
  centro: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.38, ease: suave },
  },
  saida: (direcao) => ({
    opacity: 0,
    x: direcao > 0 ? -30 : 30,
    transition: { duration: 0.2, ease: 'easeIn' },
  }),
}

/** Expansao vertical de detalhes (itens da sanfona). */
export const expandir = {
  fechado: { height: 0, opacity: 0 },
  aberto: {
    height: 'auto',
    opacity: 1,
    transition: { height: { duration: 0.32, ease: suave }, opacity: { duration: 0.25, delay: 0.06 } },
  },
}
