import { useState, useEffect } from 'react'
import { apiFetch } from '../../lib/api'

interface Category {
  id: number
  name: string
  description: string
  color: string
  question_count: number
  is_global: boolean
}

const PRESET_COLORS = [
  '#e74c3c', '#e67e22', '#f1c40f', '#27ae60',
  '#3498db', '#9b59b6', '#1abc9c', '#e91e63'
]

const GmCategoriesManager = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3498db'
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const data = await apiFetch('/api/gamemaster/categories')
      setCategories(data)
    } catch (error) {
      console.error('Error loading categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEditingCat(null)
    setShowForm(false)
    setFormData({ name: '', description: '', color: '#3498db' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    try {
      const path = editingCat
        ? `/api/gamemaster/categories/${editingCat.id}`
        : '/api/gamemaster/categories'

      await apiFetch(path, {
        method: editingCat ? 'PUT' : 'POST',
        body: formData
      })

      resetForm()
      fetchCategories()
    } catch (err: any) {
      alert(`Fehler: ${err.message}`)
    }
  }

  const handleEdit = (cat: Category) => {
    setEditingCat(cat)
    setFormData({ name: cat.name, description: cat.description || '', color: cat.color })
    setShowForm(true)
  }

  const handleDelete = async (cat: Category) => {
    if (cat.question_count > 0) {
      alert(`Kategorie enthält noch ${cat.question_count} Frage(n). Bitte zuerst alle Fragen löschen.`)
      return
    }
    if (!confirm(`Kategorie „${cat.name}" wirklich löschen?`)) return

    try {
      await apiFetch(`/api/gamemaster/categories/${cat.id}`, { method: 'DELETE' })
      fetchCategories()
    } catch (err: any) {
      alert(`Fehler: ${err.message}`)
    }
  }

  if (loading) return <div className="loading">Lade Kategorien...</div>

  const ownCategories = categories.filter(c => !c.is_global)
  const globalCategories = categories.filter(c => c.is_global)

  return (
    <div className="categories-manager">
      <div className="categories-header">
        <h2>Meine Kategorien ({ownCategories.length})</h2>
        <button className="btn-add" onClick={() => setShowForm(true)}>
          Neue Kategorie
        </button>
      </div>

      {showForm && (
        <div className="question-form-overlay">
          <div className="question-form">
            <div className="form-header">
              <h3>{editingCat ? 'Kategorie bearbeiten' : 'Neue Kategorie erstellen'}</h3>
              <button className="btn-close" onClick={resetForm}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="z.B. Meine Trivia-Fragen"
                  maxLength={100}
                  required
                />
              </div>
              <div className="form-group">
                <label>Beschreibung</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional"
                  maxLength={200}
                />
              </div>
              <div className="form-group">
                <label>Farbe</label>
                <div className="color-picker">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`color-option ${formData.color === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    >
                      {formData.color === color && '✓'}
                    </button>
                  ))}
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="color-input"
                  />
                </div>
                <div className="category-preview">
                  <span className="preview-badge" style={{ backgroundColor: formData.color }}>
                    {formData.name || 'Vorschau'}
                  </span>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={resetForm} className="btn-cancel">Abbrechen</button>
                <button type="submit" className="btn-save">
                  {editingCat ? 'Aktualisieren' : 'Erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Own categories */}
      <div className="categories-grid">
        {ownCategories.length === 0 ? (
          <div className="empty-state">
            <h3>Noch keine eigenen Kategorien</h3>
            <p>Erstelle eine Kategorie, dann kannst du Fragen hinzufügen, die automatisch in deinen Spielen erscheinen.</p>
          </div>
        ) : (
          ownCategories.map(cat => (
            <div key={cat.id} className="category-card">
              <div className="category-header">
                <span className="category-badge" style={{ backgroundColor: cat.color }}>
                  {cat.name}
                </span>
                <span className="question-count">{cat.question_count} Fragen</span>
              </div>
              {cat.description && (
                <div className="category-description">{cat.description}</div>
              )}
              <div className="category-actions">
                <button className="btn-edit" onClick={() => handleEdit(cat)}>Bearbeiten</button>
                <button className="btn-delete" onClick={() => handleDelete(cat)}>Löschen</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Global (admin) categories - read only */}
      {globalCategories.length > 0 && (
        <>
          <p className="gm-categories-section-title">Globale Kategorien (Admin, nur lesbar)</p>
          <div className="categories-grid">
            {globalCategories.map(cat => (
              <div key={cat.id} className="category-card global-category">
                <div className="category-header">
                  <span className="category-badge" style={{ backgroundColor: cat.color }}>
                    {cat.name}
                  </span>
                  <span className="global-badge">Global</span>
                </div>
                {cat.description && (
                  <div className="category-description">{cat.description}</div>
                )}
                <div className="category-actions">
                  <span className="question-count">{cat.question_count} Fragen</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default GmCategoriesManager
