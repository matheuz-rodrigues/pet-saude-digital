import { createContext, useContext, useState } from 'react'

const InscricaoCtx = createContext(null)

/** Abre o assistente de inscricao, ja num evento ou deixando a pessoa escolher. */
export function InscricaoProvider({ children }) {
  const [aberto, setAberto] = useState(false)
  const [eventoId, setEventoId] = useState(null)

  function abrir(id = null) {
    // Vindo de onClick, o argumento e o evento do clique, nao um id.
    setEventoId(typeof id === 'number' ? id : null)
    setAberto(true)
  }

  return (
    <InscricaoCtx.Provider value={{ aberto, eventoId, abrir, fechar: () => setAberto(false) }}>
      {children}
    </InscricaoCtx.Provider>
  )
}

export function useInscricao() {
  return useContext(InscricaoCtx)
}
