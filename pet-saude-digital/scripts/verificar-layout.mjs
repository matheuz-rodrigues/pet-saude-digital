/*
 * Verificacao de fumaca do layout.
 *
 * Abre o site em Chrome headless, percorre as quatro abas em tres larguras e
 * reporta: elementos que vazam para fora da tela, erros de JavaScript e
 * respostas HTTP com falha. Opcionalmente salva um screenshot por aba.
 *
 * Uso:
 *   npm run build && npm run preview     (em outro terminal)
 *   npm run verificar
 *   npm run verificar -- http://localhost:4173 ./capturas
 *
 * Requer Chrome instalado — usa o do sistema via puppeteer-core, sem baixar
 * um Chromium proprio. Ajuste CHROME abaixo se o caminho for outro.
 */
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const CHROME =
  process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

const BASE = process.argv[2] || 'http://localhost:4173'
const PASTA_CAPTURAS = process.argv[3] || null

const ABAS = ['inicio', 'eventos', 'noticias', 'contato']
const LARGURAS = [390, 768, 1440]

if (PASTA_CAPTURAS) mkdirSync(PASTA_CAPTURAS, { recursive: true })

const navegador = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})

const pagina = await navegador.newPage()
const erros = []

pagina.on('pageerror', (e) => erros.push(`JS: ${String(e).slice(0, 200)}`))
pagina.on('response', (r) => {
  // O iframe do mapa depende de rede externa e nao afeta o layout.
  if (r.status() >= 400 && !r.url().includes('google.com/maps')) {
    erros.push(`HTTP ${r.status()} -> ${r.url().slice(0, 120)}`)
  }
})

let falhas = 0

for (const largura of LARGURAS) {
  await pagina.setViewport({ width: largura, height: 900 })
  console.log(`\n=== viewport ${largura}px ===`)

  for (const aba of ABAS) {
    // `domcontentloaded` em vez de `networkidle`: o iframe do mapa mantem
    // conexoes abertas e a espera por rede ociosa nunca resolveria.
    await pagina.goto(`${BASE}/#${aba}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await new Promise((r) => setTimeout(r, 800)) // deixa a animacao terminar

    const resultado = await pagina.evaluate(() => {
      const limite = window.innerWidth + 0.5
      const fora = []
      document.querySelectorAll('main *').forEach((el) => {
        const caixa = el.getBoundingClientRect()
        if (caixa.right > limite) {
          fora.push({
            tag: el.tagName.toLowerCase(),
            classe: (el.className.baseVal ?? el.className ?? '').toString().slice(0, 55),
            direita: Math.round(caixa.right),
          })
        }
      })
      const painel = document.querySelector('[role="tabpanel"]')
      return {
        fora: fora.length,
        pior: fora[0] || null,
        texto: painel ? painel.innerText.trim().length : 0,
      }
    })

    if (PASTA_CAPTURAS) {
      await pagina.screenshot({ path: `${PASTA_CAPTURAS}/${largura}-${aba}.png` })
    }

    const vazio = resultado.texto < 200
    const problema = resultado.fora > 0 || vazio
    if (problema) falhas++

    const detalhe = resultado.pior
      ? `  <- ${resultado.pior.tag}.${resultado.pior.classe} (right=${resultado.pior.direita})`
      : vazio
        ? '  <- painel praticamente vazio'
        : ''

    console.log(
      `  ${problema ? 'FALHA' : 'ok   '} ${aba.padEnd(13)} texto=${String(resultado.texto).padStart(5)}  fora=${resultado.fora}${detalhe}`,
    )
  }
}

const unicos = [...new Set(erros)]
console.log(`\n${unicos.length} erro(s) de JS/rede:`)
unicos.forEach((e) => console.log('  - ' + e))

await navegador.close()

if (falhas > 0 || unicos.length > 0) {
  console.log(`\nResultado: ${falhas} aba(s) com problema de layout.`)
  process.exit(1)
}
console.log('\nResultado: tudo certo.')
