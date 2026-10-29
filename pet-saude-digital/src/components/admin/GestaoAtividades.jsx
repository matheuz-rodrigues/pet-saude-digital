import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { formatarData } from '../../lib/datas'
import { classeInput } from '../inscricao/Campo'

const TIPOS = [
  { id: 'palestra', rotulo: 'Palestra' },
  { id: 'mesa', rotulo: 'Mesa' },
  { id: 'minicurso', rotulo: 'Minicurso' },
  { id: 'oficina', rotulo: 'Oficina' },
  { id: 'projetos', rotulo: 'Projetos' },
]

/**
 * Incremento 3 — atividades de um evento completo.
 *
 * A data da atividade so pode cair dentro do periodo do evento; o servidor
 * confere de novo. Atividade com inscritos nao pode ser apagada nem ter as
 * vagas reduzidas abaixo do que ja foi ocupado.
 */
export default function GestaoAtividades({ evento, aoMudar }) {
  const [atividades, setAtividades] = useState([])
  const [erro, setErro] = useState('')

  useEffect(() => {
    api(`/admin/eventos/${evento.id}/atividades`)
      .then((d) => setAtividades(d.atividades))
      .catch((err) => setErro(err.message))
  }, [evento.id])

  function atualizar(lista) {
    setAtividades(lista)
    aoMudar?.(lista)
  }

  async function apagar(a) {
    if (!confirm(`Apagar "${a.titulo}"?`)) return
    setErro('')
    try {
      atualizar((await api(`/admin/atividades/${a.id}`, { method: 'DELETE' })).atividades)
    } catch (err) {
      setErro(err.message)
    }
  }

  const dias = [...new Set(atividades.map((a) => a.data))]

  return (
    <div className="border-x border-b border-pet-navy/10 bg-pet-paper p-3">
      <p className="label mb-2 text-pet-navy/45">Atividades de {evento.nome}</p>
      {erro && <p className="mb-2 text-[12px] text-pet-orange">{erro}</p>}
      {atividades.length === 0 && (
        <p className="mb-2 text-[13px] text-pet-navy/50">
          Nenhuma atividade ainda. Sem atividades, a inscrição vale para o evento todo.
        </p>
      )}

      {dias.map((d) => (
        <section key={d} className="mb-3">
          <h3 className="mb-1.5 text-[13px] font-semibold text-pet-deep">{formatarData(d)}</h3>
          <div className="space-y-2">
            {atividades
              .filter((a) => a.data === d)
              .map((a) => (
                <FormAtividade
                  key={a.id}
                  evento={evento}
                  inicial={a}
                  aoSalvar={atualizar}
                  aoApagar={() => apagar(a)}
                />
              ))}
          </div>
        </section>
      ))}

      <FormAtividade evento={evento} aoSalvar={atualizar} />
    </div>
  )
}

function FormAtividade({ evento, inicial, aoSalvar, aoApagar }) {
  const novo = !inicial
  const vazio = { titulo: '', data: evento.dataInicio, horario: '', tipo: 'palestra', precoExtra: 0, vagas: '' }
  const [dados, setDados] = useState(inicial ? { ...inicial, vagas: inicial.vagas ?? '' } : vazio)
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
      const d = await api(novo ? `/admin/eventos/${evento.id}/atividades` : `/admin/atividades/${inicial.id}`, {
        method: novo ? 'POST' : 'PUT',
        body: dados,
      })
      if (novo) setDados(vazio)
      aoSalvar(d.atividades)
    } catch (err) {
      setErro(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form
      onSubmit={enviar}
      className={`grid gap-2 bg-white p-3 sm:grid-cols-[130px_100px_120px_80px_80px_1fr] ${novo ? 'border border-dashed border-pet-navy/25' : 'border border-pet-navy/10'}`}
    >
      <label className="text-[11px] text-pet-navy/50 sm:col-span-6">
        {novo ? 'Nova atividade' : `${dados.tipo} · ${inicial.ocupadas} ocupadas${inicial.vagas != null ? ` / ${inicial.vagas}` : ''}`}
        <input className={classeInput} {...campo('titulo')} placeholder="Título" required />
      </label>
      <label className="text-[11px] text-pet-navy/50">
        Data
        <input type="date" className={classeInput} {...campo('data')} min={evento.dataInicio} max={evento.dataFim} required />
      </label>
      <label className="text-[11px] text-pet-navy/50">
        Horário
        <input className={classeInput} {...campo('horario')} placeholder="14h–16h" />
      </label>
      <label className="text-[11px] text-pet-navy/50">
        Tipo
        <select className={classeInput} {...campo('tipo')}>
          {TIPOS.map((t) => (
            <option key={t.id} value={t.id}>{t.rotulo}</option>
          ))}
        </select>
      </label>
      <label className="text-[11px] text-pet-navy/50">
        Extra (R$)
        <input type="number" min="0" step="0.01" className={classeInput} {...campo('precoExtra')} />
      </label>
      <label className="text-[11px] text-pet-navy/50">
        Vagas
        <input type="number" min="0" step="1" className={classeInput} {...campo('vagas')} placeholder="livre" />
      </label>
      <div className="flex items-end gap-2">
        <button
          disabled={enviando}
          className={`flex-1 py-2 text-[12px] font-semibold text-white ${novo ? 'bg-pet-orange' : 'bg-pet-navy'}`}
        >
          {novo ? 'Cadastrar' : 'Salvar'}
        </button>
        {aoApagar && (
          <button
            type="button"
            onClick={aoApagar}
            className="flex-1 border border-pet-orange py-2 text-[12px] font-semibold text-pet-orange"
          >
            Apagar
          </button>
        )}
      </div>
      {erro && <p className="text-[12px] text-pet-orange sm:col-span-6">{erro}</p>}
    </form>
  )
}
