import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  selectSessionUser,
  useAuthStore,
} from '../../auth/store/authStore'
import { useSupportStore } from '../store/supportStore'
import {
  SUPPORT_CATEGORIES,
  SUPPORT_STATUS_LABEL,
  type SupportCategory,
  type SupportTicket,
} from '../types'

type PanelView = 'list' | 'new' | 'thread'

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function categoryLabel(id: SupportCategory): string {
  return SUPPORT_CATEGORIES.find((c) => c.id === id)?.label ?? id
}

export function SupportWidget() {
  const user = useAuthStore(selectSessionUser)
  const allTickets = useSupportStore((s) => s.tickets)
  const loadError = useSupportStore((s) => s.loadError)
  const createTicket = useSupportStore((s) => s.createTicket)
  const reply = useSupportStore((s) => s.reply)
  const loadTickets = useSupportStore((s) => s.loadTickets)
  const tickets = useMemo(
    () =>
      user
        ? allTickets
            .filter((t) => t.userId === user.id)
            .sort((a, b) => b.updatedAt - a.updatedAt)
        : [],
    [allTickets, user],
  )

  const [open, setOpen] = useState(false)
  const [view, setView] = useState<PanelView>('list')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [category, setCategory] = useState<SupportCategory>('other')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [replyText, setReplyText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const threadEndRef = useRef<HTMLDivElement>(null)

  const activeTicket: SupportTicket | null = useMemo(
    () => tickets.find((t) => t.id === activeId) ?? null,
    [tickets, activeId],
  )

  const unanswered = tickets.filter((t) => t.status === 'answered').length

  useEffect(() => {
    if (open) void loadTickets()
  }, [open, loadTickets])

  useEffect(() => {
    if (view === 'thread') {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [view, activeTicket?.messages.length])

  if (!user || user.role === 'admin') {
    return null
  }

  const resetNewForm = () => {
    setCategory('other')
    setSubject('')
    setBody('')
    setError(null)
  }

  const openList = () => {
    setView('list')
    setActiveId(null)
    setError(null)
    setReplyText('')
  }

  const openThread = (ticketId: string) => {
    setActiveId(ticketId)
    setView('thread')
    setError(null)
    setReplyText('')
  }

  const onCreate = async (e: FormEvent) => {
    e.preventDefault()
    const result = await createTicket({ category, subject, body })
    if (!result.ok) {
      setError(result.reason)
      return
    }
    resetNewForm()
    openThread(result.ticket.id)
  }

  const onReply = async (e: FormEvent) => {
    e.preventDefault()
    if (!activeTicket) return
    const result = await reply({
      ticketId: activeTicket.id,
      body: replyText,
    })
    if (!result.ok) {
      setError(result.reason)
      return
    }
    setReplyText('')
    setError(null)
  }

  return (
    <div className="support-widget">
      <AnimatePresence>
        {open && (
          <motion.div
            className="support-panel"
            role="dialog"
            aria-modal="false"
            aria-label="Поддержка"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          >
            <header className="support-panel__head">
              <div>
                <p className="support-panel__eyebrow">Celestia Wish</p>
                <h2>Поддержка</h2>
              </div>
              <button
                type="button"
                className="btn btn--tiny"
                onClick={() => setOpen(false)}
                aria-label="Закрыть"
              >
                Закрыть
              </button>
            </header>

            {view === 'list' && (
              <div className="support-panel__body">
                <button
                  type="button"
                  className="btn btn--primary btn--block"
                  onClick={() => {
                    resetNewForm()
                    setView('new')
                  }}
                >
                  Новое обращение
                </button>

                {loadError && tickets.length === 0 ? (
                  <p className="form-error">{loadError}</p>
                ) : tickets.length === 0 ? (
                  <p className="support-empty">
                    Пока нет обращений. Напишите, если что-то пошло не так с
                    балансом, баттлом или апгрейдом.
                  </p>
                ) : (
                  <ul className="support-ticket-list">
                    {tickets.map((ticket) => (
                      <li key={ticket.id}>
                        <button
                          type="button"
                          className="support-ticket-row"
                          onClick={() => openThread(ticket.id)}
                        >
                          <div className="support-ticket-row__top">
                            <strong>{ticket.subject}</strong>
                            <span
                              className={`support-status support-status--${ticket.status}`}
                            >
                              {SUPPORT_STATUS_LABEL[ticket.status]}
                            </span>
                          </div>
                          <p>
                            {categoryLabel(ticket.category)} ·{' '}
                            {formatTime(ticket.updatedAt)}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {view === 'new' && (
              <form className="support-panel__body support-form" onSubmit={onCreate}>
                <button
                  type="button"
                  className="support-back"
                  onClick={openList}
                >
                  ← К списку
                </button>
                <label className="auth-field">
                  Категория
                  <select
                    className="text-input"
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as SupportCategory)
                    }
                  >
                    {SUPPORT_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="auth-field">
                  Тема
                  <input
                    className="text-input"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Кратко о проблеме"
                    maxLength={80}
                    required
                  />
                </label>
                <label className="auth-field">
                  Сообщение
                  <textarea
                    className="text-input support-textarea"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Опишите, что произошло…"
                    rows={4}
                    maxLength={1000}
                    required
                  />
                </label>
                {error && <p className="form-error">{error}</p>}
                <button type="submit" className="btn btn--primary btn--block">
                  Отправить
                </button>
              </form>
            )}

            {view === 'thread' && activeTicket && (
              <div className="support-panel__body support-thread">
                <button
                  type="button"
                  className="support-back"
                  onClick={openList}
                >
                  ← К списку
                </button>
                <div className="support-thread__meta">
                  <strong>{activeTicket.subject}</strong>
                  <p>
                    {categoryLabel(activeTicket.category)} ·{' '}
                    <span
                      className={`support-status support-status--${activeTicket.status}`}
                    >
                      {SUPPORT_STATUS_LABEL[activeTicket.status]}
                    </span>
                  </p>
                </div>
                <div className="support-messages">
                  {activeTicket.messages.map((msg) => (
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
                {activeTicket.status !== 'closed' ? (
                  <form className="support-reply" onSubmit={onReply}>
                    <textarea
                      className="text-input support-textarea"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Дополнить обращение…"
                      rows={2}
                      maxLength={1000}
                      required
                    />
                    {error && <p className="form-error">{error}</p>}
                    <button type="submit" className="btn btn--primary btn--block">
                      Отправить
                    </button>
                  </form>
                ) : (
                  <p className="support-empty">Обращение закрыто.</p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        className={`support-fab${open ? ' is-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Скрыть поддержку' : 'Открыть поддержку'}
      >
        <span className="support-fab__icon" aria-hidden>
          {open ? '✕' : '?'}
        </span>
        <span className="support-fab__label">
          {open ? 'Закрыть' : 'Поддержка'}
        </span>
        {!open && unanswered > 0 && (
          <span className="support-fab__badge">{unanswered}</span>
        )}
      </button>
    </div>
  )
}
