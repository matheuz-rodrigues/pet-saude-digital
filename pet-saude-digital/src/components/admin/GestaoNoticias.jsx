import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { formatarData, hojeIso } from '../../lib/datas'
import Campo, { classeInput } from '../inscricao/Campo'

const vazio = () => ({ titulo: '', resumo: '', conteudo: '', eventoId: '', publicadaEm: hojeIso(), publicada: true })

/**
 * Incremento 2 — cadastro de noticias.
 * Reaproveita o cadastro de eventos do incremento 1 para ligar a noticia a um evento.
 */
export default function GestaoNoticias() {
  const [noticias, setNoticias] = useState([])
  const [eventos, setEventos] = useState([])
  const [editando, setEditando] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    Promise.all([api('/admin/noticias'), api('/admin/eventos')])
      .then(([n, e]) => {
        setNoticias(n.noticias)
        setEventos(e.eventos)
      })
      .catch((err) => setErro(err.message))
  }, [])

  async function apagar(n) {
    if (!confirm(`Apagar "${n.titulo}"?`)) return
    setErro('')
    try {
      const d = await api(`/admin/noticias/${n.id}`, { method: 'DELETE' })
      setNoticias(d.noticias)
    } catch (err) {
      setErro(err.message)
    }
  }

  return (
    <div className="space-y-2">
      {erro && <p className="text-[13px] text-pet-orange">{erro}</p>}
      {noticias.length === 0 && !erro && <p className="text-[13px] text-pet-navy/50">Nenhuma notícia cadastrada.</p>}

      {noticias.map((n) =>
        editando === n.id ? (
          <FormNoticia
            key={n.id}
            inicial={{ ...n, eventoId: n.eventoId ?? '' }}
            eventos={eventos}
            aoSalvar={(lista) => {
              setNoticias(lista)
              setEditando(null)
            }}
            aoCancelar={() => setEditando(null)}
          />
        ) : (
          <div key={n.id} className="flex flex-wrap items-center gap-3 border border-pet-navy/10 bg-white p-3">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-pet-deep">{n.titulo}</p>
              <p className="text-[11px] uppercase text-pet-navy/45">
                {formatarData(n.publicadaEm)}
                {n.eventoNome && ` · ${n.eventoNome}`}
                {!n.publicada && <span className="text-pet-orange"> · rascunho</span>}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="bg-pet-navy px-3 py-1.5 text-[12px] font-semibold text-white"
                onClick={() => setEditando(n.id)}
              >
                Editar
              </button>
              <button
                type="button"
                className="border border-pet-orange px-3 py-1.5 text-[12px] font-semibold text-pet-orange"
                onClick={() => apagar(n)}
              >
                Apagar
              </button>
            </div>
          </div>
        ),
      )}

      <FormNoticia inicial={vazio()} eventos={eventos} aoSalvar={setNoticias} />
    </div>
  )
}

function FormNoticia({ inicial, eventos, aoSalvar, aoCancelar }) {
  const nova = !inicial.id
  const [dados, setDados] = useState(inicial)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  const campo = (nome) => ({
    value: dados[nome],
    onChange: (e) => setDados({ ...dados, [nome]: e.target.value }),
  })

  async function enviar(e) {
    e.preventDefault()
    setEnviando(true)
    setErro('')
    try {
      const d = await api(nova ? '/admin/noticias' : `/admin/noticias/${inicial.id}`, {
        method: nova ? 'POST' : 'PUT',
        body: dados,
      })
      if (nova) setDados(vazio())
      aoSalvar(d.noticias)
    } catch (err) {
      setErro(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form
      onSubmit={enviar}
      className={`border bg-white p-3 ${nova ? 'mt-4 border-dashed border-pet-navy/25' : 'border-pet-navy'}`}
    >
      <p className="label mb-2 text-pet-navy/45">{nova ? 'Nova notícia' : 'Editando notícia'}</p>
      <Campo rotulo="Título" obrigatorio>
        <input className={classeInput} maxLength={180} {...campo('titulo')} required />
      </Campo>
      <div className="grid gap-x-3 sm:grid-cols-2">
        <Campo rotulo="Data de publicação" obrigatorio>
          <input type="date" className={classeInput} {...campo('publicadaEm')} required />
        </Campo>
        <Campo rotulo="Evento relacionado">
          <select className={classeInput} {...campo('eventoId')}>
            <option value="">Nenhum (notícia geral)</option>
            {eventos.map((e) => (
              <option key={e.id} value={e.id}>{e.nome}</option>
            ))}
          </select>
        </Campo>
      </div>
      <Campo rotulo="Resumo" hint="Aparece em destaque ao abrir a notícia (até 280 caracteres)">
        <input className={classeInput} maxLength={280} {...campo('resumo')} />
      </Campo>
      <Campo rotulo="Texto" hint="Deixe uma linha em branco para separar parágrafos">
        <textarea rows={5} className={`${classeInput} h-auto py-2`} {...campo('conteudo')} />
      </Campo>
      <label className="mb-3 flex items-center gap-2 text-[13px]">
        <input
          type="checkbox"
          checked={dados.publicada}
          onChange={(e) => setDados({ ...dados, publicada: e.target.checked })}
        />
        Publicada no site
      </label>
      {erro && <p className="mb-2 text-[12px] text-pet-orange">{erro}</p>}
      <div className="flex gap-2">
        <button
          disabled={enviando}
          className={`px-4 py-2 text-[12px] font-semibold text-white ${nova ? 'bg-pet-orange' : 'bg-pet-navy'}`}
        >
          {nova ? 'Cadastrar' : 'Salvar'}
        </button>
        {aoCancelar && (
          <button
            type="button"
            className="border border-pet-navy/20 px-4 py-2 text-[12px] font-semibold text-pet-navy"
            onClick={aoCancelar}
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
