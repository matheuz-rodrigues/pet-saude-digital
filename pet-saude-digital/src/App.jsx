import { AnimatePresence, motion } from 'framer-motion'

import { abas, abaInicial } from './config/abas'
import { useAbas } from './hooks/useAbas'
import { painelAba } from './lib/motion'

import Ticker from './components/layout/Ticker'
import Cabecalho from './components/layout/Cabecalho'
import MenuAbas from './components/layout/MenuAbas'
import Rodape from './components/layout/Rodape'
import BarraInscricao from './components/layout/BarraInscricao'

import Inicio from './components/sections/Inicio'
import Eventos from './components/sections/Eventos'
import Noticias from './components/sections/Noticias'
import Contato from './components/sections/Contato'

/*
 * Mapa entre o id da aba e o componente que a renderiza.
 * Fica fora do componente para nao ser recriado a cada render.
 */
const SECOES = {
  inicio: Inicio,
  eventos: Eventos,
  noticias: Noticias,
  contato: Contato,
}

export default function App() {
  const { ativa, direcao, ir } = useAbas(abas, abaInicial)
  const Secao = SECOES[ativa]

  return (
    /*
     * Estrutura de tela cheia: ticker, cabecalho e menu ficam fixos; apenas o
     * <main> rola. E isso que atende ao pedido do cliente de navegar entre as
     * secoes sem rolagem longa — o menu nunca sai do campo de visao.
     */
    <div className="flex h-full flex-col overflow-hidden bg-pet-paper">
      <Ticker />
      <Cabecalho />
      <MenuAbas abas={abas} ativa={ativa} aoTrocar={ir} />

      <main className="scroll-slim grid-paper flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex min-h-full flex-col">
          <div className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-8 sm:px-6 sm:py-10">
            {/*
             * Renderizacao condicional: somente a secao ativa e montada.
             * `custom={direcao}` faz o painel entrar pelo lado correto,
             * de acordo com o sentido da navegacao no menu.
             */}
            <AnimatePresence mode="wait" custom={direcao}>
              <motion.section
                key={ativa}
                custom={direcao}
                variants={painelAba}
                initial="entrada"
                animate="centro"
                exit="saida"
                role="tabpanel"
                id={`painel-${ativa}`}
                aria-labelledby={`aba-${ativa}`}
              >
                <Secao />
              </motion.section>
            </AnimatePresence>
          </div>

          <Rodape />
        </div>
      </main>

      <BarraInscricao />
    </div>
  )
}
