import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  selectSessionUser,
  useAuthStore,
} from '../../auth/store/authStore'
import {
  selectOpenTicketCount,
  useSupportStore,
} from '../store/supportStore'
import {
  SUPPORT_CATEGORIES,
  SUPPORT_STATUS_LABEL,
  type SupportTicket,
  type SupportTicketStatus,
} from '../types'

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function categoryLabel(id: SupportTicket['category']): string {
  return SUPPORT_CATEGORIES.find((c) => c.id === id)?.label ?? id
}

export function AdminSupportPanel() {
  const me = useAuthStore(selectSessionUser)
  const tickets = useSupportStore((s) => s.tickets)
  const openCount = useSupportStore(selectOpenTicketCount)
  const reply = useSupportStore((s) => s.reply)
  const setStatus = useSupportStore((s) => s.setStatus)
  const seedDemoTicket = useSupportStore((s) => s.seedDemoTicket)

  const sorted = useMemo(
    () =>
      [...tickets].sort((a, b) => {
        const rank = (s: SupportTicketStatus) =>
          s === 'open' ? 0 : s === 'answered' ? 1 : 2
        const byStatus = rank(a.status) - rank(b.status)
        if (byStatus !== 0) return byStatus
        return b.updatedAt - a.updatedAt
      }),
    [tickets],
  )

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const threadEndRef = useRef<HTMLDivElement>(null)

  const selected = sorted.find((t) => t.id === selectedId) ?? sorted[0] ?? null

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selected?.id, selected?.messages.length])

  if (!me) return null

  const onReply = (e: FormEvent) => {
    e.preventDefault()
    if (!selected) return
    const result = reply({
      ticketId: selected.id,
      authorId: me.id,
      authorName: me.username,
      authorRole: 'admin',
      body: replyText,
    })
    if (!result.ok) {
      setError(result.reason)
      setMessage(null)
      return
    }
    setReplyText('')
    setError(null)
    setMessage('Ответ отправлен.')
  }

  const changeStatus = (status: SupportTicketStatus) => {
    if (!selected) return
    const result = setStatus(selected.id, status)
    if (!result.ok) {
      setError(result.reason)
      return
    }
    setMessage(`Статус: ${SUPPORT_STATUS_LABEL[status]}`)
    setError(null)
  }

  return (
    <section className="admin-support admin-support--tab">
      <header className="section-head section-head--row">
        <div>
          <h2>Обращения клиентов</h2>
          <p>
            Открытых: <strong>{openCount}</strong> · всего {tickets.length}
          </p>
        </div>
      </header>

      {sorted.length === 0 ? (
        <div className="admin-support-empty">
          <p className="form-hint">
            Обращений пока нет. Клиент создаёт их кнопкой{' '}
            <strong>Поддержка</strong> справа внизу (под обычным аккаунтом, не
            admin), в этом же браузере.
          </p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              if (!me) return
              const result = seedDemoTicket(me.username)
              setSelectedId(result.ticketId)
              setMessage('Демо-обращение добавлено.')
              setError(null)
            }}
          >
            Добавить демо-обращение
          </button>
        </div>
      ) : (
        <div className="admin-layout">
          <div className="admin-users">
            <h3>Очередь</h3>
            <div className="admin-user-list">
              {sorted.map((ticket) => {
                const active = selected?.id === ticket.id
                return (
                  <button
                    key={ticket.id}
                    type="button"
                    className={`admin-user-row${active ? ' is-active' : ''}`}
                    onClick={() => {
                      setSelectedId(ticket.id)
                      setReplyText('')
                      setError(null)
                      setMessage(null)
                    }}
                  >
                    <div>
                      <strong>{ticket.subject}</strong>
                      <p>
                        @{ticket.username} · {categoryLabel(ticket.category)} ·{' '}
                        {SUPPORT_STATUS_LABEL[ticket.status]}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {selected && (
            <div className="admin-detail">
              <h3>{selected.subject}</h3>
              <p className="form-hint">
                @{selected.username} · {categoryLabel(selected.category)} ·{' '}
                обновлено {formatTime(selected.updatedAt)}
              </p>
              <div className="admin-balance-form__actions" style={{ marginTop: '0.75rem' }}>
                <span
                  className={`support-status support-status--${selected.status}`}
                >
                  {SUPPORT_STATUS_LABEL[selected.status]}
                </span>
                {selected.status !== 'closed' && (
                  <button
                    type="button"
                    className="btn btn--tiny"
                    onClick={() => changeStatus('closed')}
                  >
                    Закрыть
                  </button>
                )}
                {selected.status === 'closed' && (
                  <button
                    type="button"
                    className="btn btn--tiny"
                    onClick={() => changeStatus('open')}
                  >
                    Открыть снова
                  </button>
                )}
              </div>

              <div className="support-messages support-messages--admin">
                {selected.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`support-bubble support-bubble--${msg.authorRole}`}
                  >
                    <div className="support-bubble__meta">
                      <span>{msg.authorName}</span>
                      <time dateTime={new Date(msg.createdAt).toISOString()}>
                        {formatTime(msg.createdAt)}
                      </time>
                    </div>
                    <p>{msg.body}</p>
                  </div>
                ))}
                <div ref={threadEndRef} />
              </div>

              {selected.status !== 'closed' && (
                <form className="support-reply" onSubmit={onReply}>
                  <label className="auth-field">
                    Ответ клиенту
                    <textarea
                      className="text-input support-textarea"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Напишите ответ…"
                      rows={3}
                      maxLength={2000}
                      required
                    />
                  </label>
                  {error && <p className="form-error">{error}</p>}
                  {message && <p className="form-ok">{message}</p>}
                  <button type="submit" className="btn btn--primary">
                    Отправить ответ
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
