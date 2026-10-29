/**
 * Estado de uma lista vinda da API: carregando, sem conexao ou vazia.
 *
 * Fica no lugar da sanfona para a aba nunca aparecer em branco — o script
 * de verificacao de layout reprova painel vazio.
 */
export default function AvisoLista({ carregando, erro, vazio, textoVazio }) {
  let texto = null
  if (carregando) texto = 'Carregando…'
  else if (erro) texto = 'Não foi possível carregar agora. Tente novamente em instantes.'
  else if (vazio) texto = textoVazio

  if (!texto) return null

  return (
    <p className="border-t border-pet-navy/15 py-4 text-[13px] text-pet-navy/55 last:border-b">{texto}</p>
  )
}
