import React, { useState, useEffect } from 'react'

interface Question {
  id: number
  question_text: string
  category_name: string
  category_id: number
  points: number
  time_limit: number
  is_risiko: boolean
  creator_name: string
  access_level: 'owner' | 'write' | 'read' | 'admin'
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

const UserQuestionsManager: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [filter, setFilter] = useState({ category: '', access: '', search: '' })
  
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
    loadQuestions()
    loadCategories()
  }, [])

  const loadQuestions = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/user/questions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setQuestions(data)
      }
    } catch (error) {
      console.error('Error loading questions:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/user/categories', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const token = localStorage.getItem('adminToken')
      const url = editingQuestion 
        ? `/api/user/questions/${editingQuestion.id}`
        : '/api/user/questions'
      
      const method = editingQuestion ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        loadQuestions()
        resetForm()
        setShowForm(false)
      } else {
        const error = await response.json()
        alert(error.error || 'Fehler beim Speichern der Frage')
      }
    } catch (error) {
      console.error('Error saving question:', error)
      alert('Fehler beim Speichern der Frage')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Sind Sie sicher, dass Sie diese Frage löschen möchten?')) {
      return
    }
    
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`/api/user/questions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        loadQuestions()
      } else {
        const error = await response.json()
        alert(error.error || 'Fehler beim Löschen der Frage')
      }
    } catch (error) {
      console.error('Error deleting question:', error)
      alert('Fehler beim Löschen der Frage')
    }
  }

  const resetForm = () => {
    setFormData({
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
    setEditingQuestion(null)
  }

  const startEdit = (question: Question) => {
    setFormData({
      categoryId: question.category_id,
      questionText: question.question_text,
      points: question.points,
      timeLimit: question.time_limit,
      isRisiko: question.is_risiko,
      options: question.options.map(opt => ({
        text: opt.text,
        isCorrect: opt.is_correct
      }))
    })
    setEditingQuestion(question)
    setShowForm(true)
  }

  const filteredQuestions = questions.filter(question => {
    const matchesCategory = !filter.category || question.category_id.toString() === filter.category
    const matchesAccess = !filter.access || question.access_level === filter.access
    const matchesSearch = !filter.search || 
      question.question_text.toLowerCase().includes(filter.search.toLowerCase()) ||
      question.category_name.toLowerCase().includes(filter.search.toLowerCase())
    
    return matchesCategory && matchesAccess && matchesSearch
  })

  const getAccessLevelBadge = (level: string) => {
    switch (level) {
      case 'owner':
        return <span className="access-badge owner">👑 Eigentümer</span>
      case 'write':
        return <span className="access-badge write">✏️ Bearbeiten</span>
      case 'read':
        return <span className="access-badge read">👁️ Lesen</span>
      case 'admin':
        return <span className="access-badge admin">🔐 Admin</span>
      default:
        return <span className="access-badge">❓ Unbekannt</span>
    }
  }

  if (loading) {
    return <div className="loading">Lade Fragen...</div>
  }

  return (
    <div className="user-questions-manager">
      <div className="section-header">
        <h2>❓ Meine Fragen</h2>
        <button 
          className="btn-primary"
          onClick={() => setShowForm(true)}
        >
          ➕ Neue Frage
        </button>
      </div>

      <div className="filters">
        <select 
          value={filter.category}
          onChange={(e) => setFilter({...filter, category: e.target.value})}
        >
          <option value="">Alle Kategorien</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        <select 
          value={filter.access}
          onChange={(e) => setFilter({...filter, access: e.target.value})}
        >
          <option value="">Alle Berechtigungen</option>
          <option value="owner">Eigene Fragen</option>
          <option value="write">Bearbeitbare Fragen</option>
          <option value="read">Nur lesbare Fragen</option>
        </select>

        <input
          type="text"
          placeholder="Suchen..."
          value={filter.search}
          onChange={(e) => setFilter({...filter, search: e.target.value})}
        />
      </div>

      <div className="questions-grid">
        {filteredQuestions.map(question => (
          <div key={question.id} className="question-card">
            <div className="question-header">
              <span className="category" style={{backgroundColor: '#3498db'}}>
                {question.category_name}
              </span>
              {getAccessLevelBadge(question.access_level)}
            </div>
            
            <div className="question-content">
              <h4>{question.question_text}</h4>
              <div className="question-meta">
                <span>📊 {question.points} Punkte</span>
                <span>⏱️ {question.time_limit}s</span>
                {question.is_risiko && <span>⚡ Risiko</span>}
              </div>
              
              <div className="question-options">
                {question.options.map((option, index) => (
                  <div 
                    key={index} 
                    className={`option ${option.is_correct ? 'correct' : ''}`}
                  >
                    {option.text}
                  </div>
                ))}
              </div>
              
              <div className="question-creator">
                👤 Erstellt von: {question.creator_name || 'Unbekannt'}
              </div>
            </div>
            
            <div className="question-actions">
              {(question.access_level === 'owner' || question.access_level === 'write') && (
                <button 
                  className="btn-edit"
                  onClick={() => startEdit(question)}
                >
                  ✏️ Bearbeiten
                </button>
              )}
              
              {question.access_level === 'owner' && (
                <button 
                  className="btn-delete"
                  onClick={() => handleDelete(question.id)}
                >
                  🗑️ Löschen
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredQuestions.length === 0 && (
        <div className="no-questions">
          <p>Keine Fragen gefunden.</p>
          <p>Erstellen Sie Ihre erste Frage oder bitten Sie einen Administrator, Ihnen Fragen zuzuweisen.</p>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingQuestion ? 'Frage bearbeiten' : 'Neue Frage erstellen'}</h3>
              <button 
                className="close-btn"
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="question-form">
              <div className="form-group">
                <label>Kategorie</label>
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
                <label>Frage</label>
                <textarea
                  value={formData.questionText}
                  onChange={(e) => setFormData({...formData, questionText: e.target.value})}
                  placeholder="Geben Sie Ihre Frage ein..."
                  required
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Punkte</label>
                  <input
                    type="number"
                    value={formData.points}
                    onChange={(e) => setFormData({...formData, points: parseInt(e.target.value)})}
                    min="10"
                    max="1000"
                    step="10"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Zeit (Sekunden)</label>
                  <input
                    type="number"
                    value={formData.timeLimit}
                    onChange={(e) => setFormData({...formData, timeLimit: parseInt(e.target.value)})}
                    min="10"
                    max="300"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.isRisiko}
                    onChange={(e) => setFormData({...formData, isRisiko: e.target.checked})}
                  />
                  Risiko-Frage
                </label>
              </div>

              <div className="options-section">
                <h4>Antwortmöglichkeiten</h4>
                {formData.options.map((option, index) => (
                  <div key={index} className="option-input">
                    <input
                      type="text"
                      value={option.text}
                      onChange={(e) => {
                        const newOptions = [...formData.options]
                        newOptions[index].text = e.target.value
                        setFormData({...formData, options: newOptions})
                      }}
                      placeholder={`Antwort ${index + 1}`}
                      required
                    />
                    <label className="checkbox-label">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={option.isCorrect}
                        onChange={() => {
                          const newOptions = formData.options.map((opt, i) => ({
                            ...opt,
                            isCorrect: i === index
                          }))
                          setFormData({...formData, options: newOptions})
                        }}
                      />
                      Richtig
                    </label>
                  </div>
                ))}
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}>
                  Abbrechen
                </button>
                <button type="submit" className="btn-primary">
                  {editingQuestion ? 'Aktualisieren' : 'Erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserQuestionsManager