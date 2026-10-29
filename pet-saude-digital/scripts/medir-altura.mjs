/*
 * Mede quanto cada aba ultrapassa a altura da tela.
 *
 * O cliente pediu que o conteudo coubesse sem rolagem. Este script mostra,
 * por aba e por tamanho de tela, a razao entre a altura do conteudo e a
 * altura visivel — 1.00 significa "coube exatamente".
 */
import puppeteer from 'puppeteer-core'

const CHROME =
  process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const BASE = process.argv[2] || 'http://localhost:4173'
const ABAS = ['inicio', 'eventos', 'noticias', 'contato']

// alturas reais de aparelhos comuns
const TELAS = [
  { nome: 'celular  390x844', l: 390, a: 844 },
  { nome: 'celular  360x740', l: 360, a: 740 },
  { nome: 'notebook 1440x820', l: 1440, a: 820 },
]

const navegador = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox'],
})
const p = await navegador.newPage()

for (const tela of TELAS) {
  await p.setViewport({ width: tela.l, height: tela.a })
  console.log(`\n=== ${tela.nome} ===`)

  for (const aba of ABAS) {
    await p.goto(`${BASE}/#${aba}`, { waitUntil: 'domcontentloaded' })
    await new Promise((r) => setTimeout(r, 700))

    const m = await p.evaluate(() => {
      const main = document.querySelector('main')
      return {
        conteudo: main.scrollHeight,
        visivel: main.clientHeight,
      }
    })

    const razao = m.conteudo / m.visivel
    const sobra = m.conteudo - m.visivel
    const marca = razao <= 1.02 ? 'cabe   ' : razao <= 1.5 ? 'rola   ' : 'ROLA MT'
    console.log(
      `  ${marca} ${aba.padEnd(13)} ${String(m.conteudo).padStart(5)}px de ${String(m.visivel).padStart(4)}px  =  ${razao.toFixed(2)}x  (+${sobra}px)`,
    )
  }
}

await navegador.close()
