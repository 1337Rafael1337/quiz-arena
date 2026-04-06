import { useState, useEffect } from 'react'
import { apiFetch } from '../../lib/api'

interface AuditEntry {
  id: number
  username: string
  action: string
  entity_type: string | null
  entity_id: number | null
  details: string | null
  ip_address: string | null
  created_at: string
}

const actionLabels: Record<string, string> = {
  login: 'Anmeldung',
  bulk_delete_questions: 'Fragen gelöscht (Bulk)',
  bulk_move_questions: 'Fragen verschoben (Bulk)',
  create_question: 'Frage erstellt',
  delete_question: 'Frage gelöscht',
  create_game: 'Spiel erstellt',
  delete_game: 'Spiel gelöscht',
  cancel_game: 'Spiel beendet',
  create_user: 'Benutzer erstellt',
  delete_user: 'Benutzer gelöscht',
  update_user: 'Benutzer bearbeitet',
}

const AuditLog = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const pageSize = 50

  useEffect(() => {
    fetchLog()
  }, [page])

  const fetchLog = async () => {
    setLoading(true)
    try {
      const data = await apiFetch(`/api/admin/audit-log?limit=${pageSize}&offset=${page * pageSize}`)
      setEntries(data.entries)
      setTotal(data.total)
    } catch (error) {
      console.error('Error fetching audit log:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  if (loading && entries.length === 0) return <div className="loading">Lade Audit-Log...</div>

  return (
    <div className="questions-manager">
      <div className="questions-header">
        <h2>Audit-Log ({total} Einträge)</h2>
        <button className="btn-add" onClick={() => { setPage(0); fetchLog() }}>
          Aktualisieren
        </button>
      </div>

      <div className="questions-list">
        {entries.length === 0 ? (
          <div className="empty-state">
            <h3>Keine Einträge</h3>
            <p>Noch keine Aktionen protokolliert.</p>
          </div>
        ) : (
          entries.map(entry => (
            <div key={entry.id} className="question-item" style={{ padding: '0.75rem 1rem' }}>
              <div className="question-header" style={{ marginBottom: '0.25rem' }}>
                <span className="category-badge" style={{ background: '#6366f1' }}>
                  {actionLabels[entry.action] || entry.action}
                </span>
                <span className="time-badge">
                  {new Date(entry.created_at).toLocaleString('de-DE', {
                    day: '2-digit', month: '2-digit', year: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                  })}
                </span>
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text)' }}>
                <strong>{entry.username || 'System'}</strong>
                {entry.entity_type && <span> — {entry.entity_type} #{entry.entity_id}</span>}
                {entry.details && <span style={{ color: 'var(--color-text-muted)' }}> — {entry.details}</span>}
                {entry.ip_address && <span style={{ color: 'var(--color-text-muted)', marginLeft: '0.5rem', fontSize: '0.8rem' }}>{entry.ip_address}</span>}
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          <button
            className="btn-cancel"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Zurück
          </button>
          <span style={{ padding: '0.5rem', color: 'var(--color-text-muted)' }}>
            Seite {page + 1} von {totalPages}
          </span>
          <button
            className="btn-cancel"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Weiter
          </button>
        </div>
      )}
    </div>
  )
}

export default AuditLog
