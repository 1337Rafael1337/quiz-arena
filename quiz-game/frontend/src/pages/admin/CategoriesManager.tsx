import React, { useState, useEffect } from 'react'

interface Category {
  id: number
  name: string
  description: string
  color: string
  question_count: number
}

const CategoriesManager: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3498db'
  })
  
  const predefinedColors = [
    { name: 'Blau', value: '#3498db' },
    { name: 'Grün', value: '#2ecc71' },
    { name: 'Rot', value: '#e74c3c' },
    { name: 'Orange', value: '#f39c12' },
    { name: 'Lila', value: '#9b59b6' },
    { name: 'Türkis', value: '#1abc9c' },
    { name: 'Grau', value: '#95a5a6' },
    { name: 'Dunkelblau', value: '#2c3e50' }
  ]
  
  useEffect(() => {
    fetchCategories()
  }, [])
  
  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('http://localhost:3001/api/admin/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      alert('Kategorie-Name ist erforderlich')
      return
    }
    
    try {
      const token = localStorage.getItem('adminToken')
      const method = editingCategory ? 'PUT' : 'POST'
      const url = editingCategory 
        ? `http://localhost:3001/api/admin/categories/${editingCategory.id}`
        : 'http://localhost:3001/api/admin/categories'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        alert(editingCategory ? 'Kategorie aktualisiert!' : 'Kategorie erstellt!')
        resetForm()
        fetchCategories()
      } else {
        const error = await response.json()
        alert(`Fehler: ${error.error}`)
      }
    } catch (error) {
      alert(`Fehler: ${error.message}`)
    }
  }
  
  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color
    })
    setShowForm(true)
  }
  
  const handleDelete = async (id: number, questionCount: number) => {
    if (questionCount > 0) {
      alert(`Kategorie kann nicht gelöscht werden: ${questionCount} Fragen vorhanden`)
      return
    }
    
    if (!confirm('Kategorie wirklich löschen?')) return
    
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`http://localhost:3001/api/admin/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        alert('Kategorie gelöscht!')
        fetchCategories()
      }
    } catch (error) {
      alert(`Fehler: ${error.message}`)
    }
  }
  
  const resetForm = () => {
    setEditingCategory(null)
    setShowForm(false)
    setFormData({
      name: '',
      description: '',
      color: '#3498db'
    })
  }
  
  if (loading) return <div className="loading">Loading categories...</div>
  
  return (
    <div className="categories-manager">
      <div className="categories-header">
        <h2>📂 Kategorien verwalten</h2>
        <button 
          className="btn-add"
          onClick={() => setShowForm(true)}
        >
          ➕ Neue Kategorie
        </button>
      </div>
      
      {/* Category Form */}
      {showForm && (
        <div className="question-form-overlay">
          <div className="question-form">
            <h3>{editingCategory ? 'Kategorie bearbeiten' : 'Neue Kategorie erstellen'}</h3>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name</label>
                <input 
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="z.B. Geschichte, Sport, Wissenschaft"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Beschreibung (optional)</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={2}
                  placeholder="Kurze Beschreibung der Kategorie"
                />
              </div>
              
              <div className="form-group">
                <label>Farbe</label>
                <div className="color-picker">
                  {predefinedColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={`color-option ${formData.color === color.value ? 'selected' : ''}`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setFormData({...formData, color: color.value})}
                      title={color.name}
                    >
                      {formData.color === color.value && '✓'}
                    </button>
                  ))}
                </div>
                <input 
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                  className="color-input"
                />
              </div>
              
              <div className="category-preview">
                <span 
                  className="preview-badge"
                  style={{ backgroundColor: formData.color }}
                >
                  {formData.name || 'Vorschau'}
                </span>
              </div>
              
              <div className="form-actions">
                <button type="button" onClick={resetForm} className="btn-cancel">
                  Abbrechen
                </button>
                <button type="submit" className="btn-save">
                  {editingCategory ? 'Aktualisieren' : 'Erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Categories List */}
      <div className="categories-grid">
        {categories.map(category => (
          <div key={category.id} className="category-card">
            <div className="category-header">
              <span 
                className="category-badge"
                style={{ backgroundColor: category.color }}
              >
                {category.name}
              </span>
              <span className="question-count">
                {category.question_count} Fragen
              </span>
            </div>
            
            {category.description && (
              <div className="category-description">
                {category.description}
              </div>
            )}
            
            <div className="category-actions">
              <button 
                className="btn-edit"
                onClick={() => handleEdit(category)}
              >
                ✏️ Bearbeiten
              </button>
              <button 
                className="btn-delete"
                onClick={() => handleDelete(category.id, category.question_count)}
                disabled={category.question_count > 0}
                title={category.question_count > 0 ? 'Kategorie enthält Fragen' : 'Kategorie löschen'}
              >
                🗑️ Löschen
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {categories.length === 0 && (
        <div className="empty-state">
          <h3>Keine Kategorien vorhanden</h3>
          <p>Erstelle deine erste Kategorie um Fragen zu organisieren</p>
        </div>
      )}
    </div>
  )
}

export default CategoriesManager
