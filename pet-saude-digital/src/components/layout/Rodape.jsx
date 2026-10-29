import { programa } from '../../data/programa'
import Monograma from '../ui/Monograma'

/**
 * Rodape institucional.
 *
 * A logo da UEPA fica aqui, e nao no topo: conforme orientacao do cliente,
 * quando a propria universidade e a promotora, a marca dela assina a peca no
 * rodape em vez de disputar espaco com a marca do programa.
 */
export default function Rodape() {
  return (
    <footer className="border-t border-white/10 bg-pet-ink text-white">
      {/* Compacto no celular: o rodape fica dentro da area rolavel e cada
          pixel dele empurra o conteudo da aba para fora da tela. */}
      <div className="mx-auto flex max-w-[1180px] flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <Monograma
            texto="UEPA"
            tamanho="sm"
            tom="deep"
            className="border border-white/15 text-[11px] sm:h-14 sm:w-14 sm:text-[17px]"
          />
          <div className="leading-tight">
            <p className="label text-white/40">Realização</p>
            <p className="mt-1 text-[12.5px] font-semibold tracking-tight sm:text-[13px]">
              {programa.instituicao}
            </p>
            <p className="text-[11.5px] text-white/50">{programa.nome}</p>
          </div>
        </div>

        <div className="text-[11.5px] leading-relaxed text-white/45 sm:text-right sm:text-[12px]">
          <p className="hidden sm:block">
            {programa.email} · {programa.instagram}
          </p>
          <p className="text-white/30 sm:mt-1">
            Conteúdo fictício — protótipo acadêmico sem vínculo oficial.
          </p>
        </div>
      </div>
    </footer>
  )
}
