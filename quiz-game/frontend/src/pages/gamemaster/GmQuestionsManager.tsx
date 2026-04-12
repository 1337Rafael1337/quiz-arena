import { useState, useEffect } from 'react'
import { apiFetch } from '../../lib/api'

interface Question {
  id: number
  question_text: string
  category_name: string
  category_id: number
  points: number
  time_limit: number
  is_risiko: boolean
  options: Array<{
    id: number
    text: string
    is_correct: boolean
    sort_order: number
  }>
}

interface Category {
  id: number
  name: string
  color: string
  question_count: number
  is_global: boolean
}

const defaultOptions = () => [
  { text: '', isCorrect: false },
  { text: '', isCorrect: false },
  { text: '', isCorrect: false },
  { text: '', isCorrect: false }
]

const GmQuestionsManager = () => {
  const [questions, setQuestions] = useState<Question[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [filter, setFilter] = useState({ category: '', search: '' })

  const [formData, setFormData] = useState({
    categoryId: 0,
    questionText: '',
    points: 100,
    timeLimit: 30,
    isRisiko: false,
    options: defaultOptions()
  })

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    try {
      const [qData, cData] = await Promise.all([
        apiFetch('/api/gamemaster/questions'),
        apiFetch('/api/gamemaster/categories')
      ])
      setQuestions(qData)
      setCategories(cData)
      if (formData.categoryId === 0 && cData.length > 0) {
        setFormData(prev => ({ ...prev, categoryId: cData[0].id }))
      }
    } catch (error) {
      console.error('Error loading questions:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEditingQuestion(null)
    setShowForm(false)
    setFormData({
      categoryId: categories.length > 0 ? categories[0].id : 0,
      questionText: '',
      points: 100,
      timeLimit: 30,
      isRisiko: false,
      options: defaultOptions()
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validOptions = formData.options.filter(opt => opt.text.trim())
    if (validOptions.length < 2) {
      alert('Mindestens 2 Antwort-Optionen erforderlich')
      return
    }
    if (validOptions.filter(o => o.isCorrect).length !== 1) {
      alert('Genau eine richtige Antwort erforderlich')
      return
    }

    try {
      const path = editingQuestion
        ? `/api/gamemaster/questions/${editingQuestion.id}`
        : '/api/gamemaster/questions'

      await apiFetch(path, {
        method: editingQuestion ? 'PUT' : 'POST',
        body: {
          categoryId: formData.categoryId,
          questionText: formData.questionText,
          points: formData.points,
          timeLimit: formData.timeLimit,
          isRisiko: formData.isRisiko,
          options: validOptions
        }
      })

      resetForm()
      fetchAll()
    } catch (err: any) {
      alert(`Fehler: ${err.message}`)
    }
  }

  const handleEdit = (q: Question) => {
    setEditingQuestion(q)
    setFormData({
      categoryId: q.category_id,
      questionText: q.question_text,
      points: q.points,
      timeLimit: q.time_limit,
      isRisiko: q.is_risiko,
      options: [
        ...q.options.map(o => ({ text: o.text, isCorrect: o.is_correct })),
        ...Array.from({ length: Math.max(0, 4 - q.options.length) }, () => ({ text: '', isCorrect: false }))
      ]
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Frage wirklich löschen?')) return
    try {
      await apiFetch(`/api/gamemaster/questions/${id}`, { method: 'DELETE' })
      fetchAll()
    } catch (err: any) {
      alert(`Fehler: ${err.message}`)
    }
  }

  const updateOption = (index: number, field: 'text' | 'isCorrect', value: string | boolean) => {
    const opts = [...formData.options]
    if (field === 'isCorrect' && value === true) {
      opts.forEach((o, i) => { o.isCorrect = i === index })
    } else {
      opts[index][field] = value as never
    }
    setFormData({ ...formData, options: opts })
  }

  const filtered = questions.filter(q => {
    const matchesCat = !filter.category || q.category_id.toString() === filter.category
    const matchesSearch = !filter.search ||
      q.question_text.toLowerCase().includes(filter.search.toLowerCase()) ||
      q.category_name.toLowerCase().includes(filter.search.toLowerCase())
    return matchesCat && matchesSearch
  })

  if (loading) return <div className="loading">Lade Fragen...</div>

  return (
    <div className="questions-manager">
      <div className="questions-header">
        <h2>Meine Fragen ({questions.length})</h2>
        <button className="btn-add" onClick={() => setShowForm(true)}>
          Neue Frage
        </button>
      </div>

      {categories.length === 0 && (
        <div className="empty-state" style={{ marginBottom: '1rem' }}>
          <h3>Keine Kategorien vorhanden</h3>
          <p>Erstelle zuerst eine Kategorie im Tab <strong>„Meine Kategorien"</strong>, bevor du Fragen anlegst.</p>
        </div>
      )}

      <div className="filters">
        <input
          type="text"
          placeholder="Fragen durchsuchen..."
          value={filter.search}
          onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          className="search-input"
        />
        <select
          value={filter.category}
          onChange={(e) => setFilter({ ...filter, category: e.target.value })}
        >
          <option value="">Alle Kategorien</option>
          {categories.filter(c => !c.is_global).map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <button className="btn-clear-filters" onClick={() => setFilter({ category: '', search: '' })}>
          Filter löschen
        </button>
        <span className="results-count">{filtered.length} von {questions.length} Fragen</span>
      </div>

      {showForm && (
        <div className="question-form-overlay">
          <div className="question-form">
            <div className="form-header">
              <h3>{editingQuestion ? 'Frage bearbeiten' : 'Neue Frage erstellen'}</h3>
              <button className="btn-close" onClick={resetForm}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Kategorie *</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: parseInt(e.target.value) })}
                    required
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}{cat.is_global ? ' (Global)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Punkte *</label>
                  <select
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
                  >
                    <option value="100">100</option>
                    <option value="200">200</option>
                    <option value="300">300</option>
                    <option value="400">400</option>
                    <option value="500">500</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Zeit (Sek.) *</label>
                  <input
                    type="number"
                    value={formData.timeLimit}
                    onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) })}
                    min="10" max="120" required
                  />
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.isRisiko}
                      onChange={(e) => setFormData({ ...formData, isRisiko: e.target.checked })}
                    />
                    <span className="checkbox-text">RISIKO Frage</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Frage *</label>
                <textarea
                  value={formData.questionText}
                  onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
                  rows={3}
                  placeholder="Wie lautet die Frage?"
                  required
                />
              </div>

              <div className="form-group">
                <label>Antwort-Optionen * (mind. 2, genau 1 richtig)</label>
                {formData.options.map((option, index) => (
                  <div key={index} className="option-input">
                    <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                    <input
                      type="text"
                      value={option.text}
                      onChange={(e) => updateOption(index, 'text', e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      maxLength={200}
                    />
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={option.isCorrect}
                        onChange={() => updateOption(index, 'isCorrect', true)}
                      />
                      <span className="radio-text">Richtig</span>
                    </label>
                  </div>
                ))}
              </div>

              <div className="form-actions">
                <button type="button" onClick={resetForm} className="btn-cancel">Abbrechen</button>
                <button type="submit" className="btn-save">
                  {editingQuestion ? 'Aktualisieren' : 'Erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="questions-list">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <h3>Keine Fragen gefunden</h3>
            <p>
              {questions.length === 0
                ? 'Erstelle deine erste Frage — sie wird automatisch in deinen Spielen verwendet'
                : 'Keine Fragen entsprechen den Filtern'
              }
            </p>
          </div>
        ) : (
          filtered.map(question => (
            <div key={question.id} className="question-item">
              <div className="question-header">
                <span
                  className="category-badge"
                  style={{ backgroundColor: categories.find(c => c.id === question.category_id)?.color || '#3498db' }}
                >
                  {question.category_name}
                </span>
                <span className="points-badge">{question.points} Punkte</span>
                {question.is_risiko && <span className="risiko-badge">RISIKO</span>}
                <span className="time-badge">{question.time_limit}s</span>
              </div>
              <div className="question-text">{question.question_text}</div>
              <div className="question-options">
                {question.options.map((option, index) => (
                  <div key={option.id} className={`option ${option.is_correct ? 'correct' : ''}`}>
                    <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                    <span className="option-text">{option.text}</span>
                    {option.is_correct && <span className="correct-mark">Richtig</span>}
                  </div>
                ))}
              </div>
              <div className="question-actions">
                <button className="btn-edit" onClick={() => handleEdit(question)}>Bearbeiten</button>
                <button className="btn-delete" onClick={() => handleDelete(question.id)}>Löschen</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default GmQuestionsManager
