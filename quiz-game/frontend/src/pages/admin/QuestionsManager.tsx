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
  description: string
  color: string
  question_count: number
}

const QuestionsManager = () => {
  const [questions, setQuestions] = useState<Question[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [filter, setFilter] = useState({ category: '', points: '', search: '' })
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkCategoryId, setBulkCategoryId] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    categoryId: 1,
    questionText: '',
    points: 100,
    timeLimit: 30,
    isRisiko: false,
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ]
  })

  useEffect(() => {
    fetchQuestions()
    fetchCategories()
  }, [])

  const fetchQuestions = async () => {
    try {
      const data = await apiFetch('/api/admin/questions')
      setQuestions(data)
    } catch (error) {
      console.error('Error fetching questions:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const data = await apiFetch('/api/admin/categories')
      setCategories(data)
      if (data.length > 0 && formData.categoryId === 1) {
        setFormData(prev => ({ ...prev, categoryId: data[0].id }))
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.questionText.trim()) {
      alert('Frage-Text ist erforderlich')
      return
    }

    const validOptions = formData.options.filter(opt => opt.text.trim())
    if (validOptions.length < 2) {
      alert('Mindestens 2 Antwort-Optionen erforderlich')
      return
    }

    const correctAnswers = validOptions.filter(opt => opt.isCorrect)
    if (correctAnswers.length !== 1) {
      alert('Genau eine richtige Antwort erforderlich')
      return
    }

    try {
      const path = editingQuestion
        ? `/api/admin/questions/${editingQuestion.id}`
        : '/api/admin/questions'

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

      alert(editingQuestion ? 'Frage aktualisiert!' : 'Frage erstellt!')
      resetForm()
      fetchQuestions()
    } catch (err: any) {
      alert(`Fehler: ${err.message}`)
    }
  }

  const handleEdit = (question: Question) => {
    setEditingQuestion(question)
    setFormData({
      categoryId: question.category_id,
      questionText: question.question_text,
      points: question.points,
      timeLimit: question.time_limit,
      isRisiko: question.is_risiko,
      options: [
        ...question.options.map(opt => ({ text: opt.text, isCorrect: opt.is_correct })),
        ...Array.from({ length: Math.max(0, 4 - question.options.length) }, () => ({ text: '', isCorrect: false }))
      ]
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Frage wirklich löschen?')) return

    try {
      await apiFetch(`/api/admin/questions/${id}`, { method: 'DELETE' })
      alert('Frage gelöscht!')
      fetchQuestions()
    } catch (err: any) {
      alert(`Fehler: ${err.message}`)
    }
  }

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredQuestions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredQuestions.map(q => q.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`${selectedIds.size} Fragen wirklich löschen?`)) return
    try {
      await apiFetch('/api/admin/questions/bulk-delete', {
        method: 'POST',
        body: { ids: Array.from(selectedIds) }
      })
      setSelectedIds(new Set())
      fetchQuestions()
    } catch (err: any) {
      alert(`Fehler: ${err.message}`)
    }
  }

  const handleBulkCategory = async () => {
    if (selectedIds.size === 0 || !bulkCategoryId) return
    try {
      await apiFetch('/api/admin/questions/bulk-category', {
        method: 'POST',
        body: { ids: Array.from(selectedIds), categoryId: bulkCategoryId }
      })
      setSelectedIds(new Set())
      setBulkCategoryId(null)
      fetchQuestions()
    } catch (err: any) {
      alert(`Fehler: ${err.message}`)
    }
  }

  const resetForm = () => {
    setEditingQuestion(null)
    setShowForm(false)
    setFormData({
      categoryId: categories.length > 0 ? categories[0].id : 1,
      questionText: '',
      points: 100,
      timeLimit: 30,
      isRisiko: false,
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ]
    })
  }

  const updateOption = (index: number, field: 'text' | 'isCorrect', value: string | boolean) => {
    const newOptions = [...formData.options]

    if (field === 'isCorrect' && value === true) {
      newOptions.forEach((opt, i) => {
        opt.isCorrect = i === index
      })
    } else {
      newOptions[index][field] = value as never
    }

    setFormData({ ...formData, options: newOptions })
  }

  const filteredQuestions = questions.filter(q => {
    const matchesCategory = !filter.category || q.category_id.toString() === filter.category
    const matchesPoints = !filter.points || q.points.toString() === filter.points
    const matchesSearch = !filter.search ||
      q.question_text.toLowerCase().includes(filter.search.toLowerCase()) ||
      q.category_name.toLowerCase().includes(filter.search.toLowerCase())

    return matchesCategory && matchesPoints && matchesSearch
  })

  if (loading) return <div className="loading">Lade Fragen...</div>

  return (
    <div className="questions-manager">
      <div className="questions-header">
        <h2>Fragen verwalten ({questions.length} Fragen)</h2>
        <button className="btn-add" onClick={() => setShowForm(true)}>
          Neue Frage
        </button>
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="Suche in Fragen..."
          value={filter.search}
          onChange={(e) => setFilter({...filter, search: e.target.value})}
          className="search-input"
        />

        <select
          value={filter.category}
          onChange={(e) => setFilter({...filter, category: e.target.value})}
        >
          <option value="">Alle Kategorien</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name} ({cat.question_count})</option>
          ))}
        </select>

        <select
          value={filter.points}
          onChange={(e) => setFilter({...filter, points: e.target.value})}
        >
          <option value="">Alle Punkte</option>
          <option value="100">100</option>
          <option value="200">200</option>
          <option value="300">300</option>
          <option value="400">400</option>
          <option value="500">500</option>
        </select>

        <button
          className="btn-clear-filters"
          onClick={() => setFilter({ category: '', points: '', search: '' })}
        >
          Filter löschen
        </button>

        <span className="results-count">
          {filteredQuestions.length} von {questions.length} Fragen
        </span>
      </div>

      {selectedIds.size > 0 && (
        <div className="bulk-actions" style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
          background: 'rgba(99, 102, 241, 0.15)', borderRadius: '8px', marginBottom: '1rem', flexWrap: 'wrap'
        }}>
          <span style={{ fontWeight: 600 }}>{selectedIds.size} ausgewählt</span>
          <button className="btn-delete" onClick={handleBulkDelete}>
            Ausgewählte löschen
          </button>
          <select
            value={bulkCategoryId || ''}
            onChange={(e) => setBulkCategoryId(e.target.value ? parseInt(e.target.value) : null)}
            style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-card-border)' }}
          >
            <option value="">Kategorie wählen...</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          {bulkCategoryId && (
            <button className="btn-edit" onClick={handleBulkCategory}>
              Kategorie ändern
            </button>
          )}
          <button className="btn-cancel" onClick={() => setSelectedIds(new Set())} style={{ marginLeft: 'auto' }}>
            Auswahl aufheben
          </button>
        </div>
      )}

      {showForm && (
        <div className="question-form-overlay">
          <div className="question-form">
            <div className="form-header">
              <h3>{editingQuestion ? 'Frage bearbeiten' : 'Neue Frage erstellen'}</h3>
              <button className="btn-close" onClick={resetForm}>X</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Kategorie *</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({...formData, categoryId: parseInt(e.target.value)})}
                    required
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Punkte *</label>
                  <select
                    value={formData.points}
                    onChange={(e) => setFormData({...formData, points: parseInt(e.target.value)})}
                  >
                    <option value="100">100</option>
                    <option value="200">200</option>
                    <option value="300">300</option>
                    <option value="400">400</option>
                    <option value="500">500</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Zeit (Sekunden) *</label>
                  <input
                    type="number"
                    value={formData.timeLimit}
                    onChange={(e) => setFormData({...formData, timeLimit: parseInt(e.target.value)})}
                    min="10"
                    max="120"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.isRisiko}
                      onChange={(e) => setFormData({...formData, isRisiko: e.target.checked})}
                    />
                    <span className="checkbox-text">
                      RISIKO Frage
                      <small>Doppelte Punkte bei richtiger, Punktverlust bei falscher Antwort</small>
                    </span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Frage *</label>
                <textarea
                  value={formData.questionText}
                  onChange={(e) => setFormData({...formData, questionText: e.target.value})}
                  rows={3}
                  placeholder="Wie lautet die Frage?"
                  required
                />
              </div>

              <div className="form-group">
                <label>Antwort-Optionen * (mindestens 2, genau 1 richtig)</label>
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
                <button type="button" onClick={resetForm} className="btn-cancel">
                  Abbrechen
                </button>
                <button type="submit" className="btn-save">
                  {editingQuestion ? 'Aktualisieren' : 'Erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="questions-list">
        {filteredQuestions.length > 0 && (
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              <input
                type="checkbox"
                checked={selectedIds.size === filteredQuestions.length && filteredQuestions.length > 0}
                onChange={toggleSelectAll}
              />
              Alle auswählen
            </label>
          </div>
        )}
        {filteredQuestions.length === 0 ? (
          <div className="empty-state">
            <h3>Keine Fragen gefunden</h3>
            <p>
              {questions.length === 0
                ? 'Erstelle deine erste Frage um loszulegen'
                : 'Keine Fragen entsprechen den aktuellen Filtern'
              }
            </p>
          </div>
        ) : (
          filteredQuestions.map(question => (
            <div key={question.id} className="question-item">
              <div className="question-header">
                <input
                  type="checkbox"
                  checked={selectedIds.has(question.id)}
                  onChange={() => toggleSelection(question.id)}
                  style={{ marginRight: '0.5rem', cursor: 'pointer' }}
                />
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

              <div className="question-text">
                {question.question_text}
              </div>

              <div className="question-options">
                {question.options.map((option, index) => (
                  <div
                    key={option.id}
                    className={`option ${option.is_correct ? 'correct' : ''}`}
                  >
                    <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                    <span className="option-text">{option.text}</span>
                    {option.is_correct && <span className="correct-mark">Richtig</span>}
                  </div>
                ))}
              </div>

              <div className="question-actions">
                <button className="btn-edit" onClick={() => handleEdit(question)}>
                  Bearbeiten
                </button>
                <button className="btn-delete" onClick={() => handleDelete(question.id)}>
                  Löschen
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default QuestionsManager
