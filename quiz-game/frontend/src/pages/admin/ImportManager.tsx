import { useState } from 'react'
import { API_URL } from '../../lib/api'

const ImportManager = () => {
  const [uploading, setUploading] = useState(false)
  const [importResult, setImportResult] = useState<{
    imported: number
    errors: number
    message: string
  } | null>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      alert('Bitte wähle eine CSV-Datei aus')
      return
    }

    setUploading(true)
    setImportResult(null)

    try {
      const formData = new FormData()
      formData.append('csvFile', file)

      const response = await fetch(`${API_URL}/api/admin/import-csv`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        setImportResult(result)
      } else {
        const error = await response.json()
        alert(`Import-Fehler: ${error.error}`)
      }
    } catch (err: any) {
      alert(`Fehler beim Upload: ${err.message}`)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const downloadTemplate = () => {
    const csvContent = `category,question,answer1,answer2,answer3,answer4,correct_answer,points,time_limit,is_risiko
Geographie,Welches ist die Hauptstadt von Deutschland?,Berlin,München,Hamburg,Köln,1,100,30,false
Geschichte,In welchem Jahr fiel die Berliner Mauer?,1987,1989,1991,1990,2,200,30,false
Wissenschaft,Welches Element hat das Symbol O?,Wasserstoff,Sauerstoff,Kohlenstoff,Stickstoff,2,100,25,false
Sport,Wie oft finden die Olympischen Spiele statt?,Alle 2 Jahre,Alle 4 Jahre,Alle 3 Jahre,Alle 5 Jahre,2,300,30,true`

    // UTF-8 BOM (\uFEFF) damit Excel die Datei korrekt als UTF-8 erkennt
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', 'quiz-template.csv')
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="import-manager">
      <h2>CSV Import</h2>

      <div className="import-section">
        <div className="import-info">
          <h3>Fragen aus CSV-Datei importieren</h3>
          <p>
            Lade eine CSV-Datei hoch um mehrere Fragen gleichzeitig zu importieren.
            Die Datei muss das richtige Format haben.
          </p>
        </div>

        <div className="import-actions">
          <button className="btn-template" onClick={downloadTemplate}>
            Vorlage herunterladen
          </button>

          <label className="btn-upload">
            {uploading ? 'Importiere...' : 'CSV hochladen'}
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      {importResult && (
        <div className={`import-result ${importResult.errors > 0 ? 'with-errors' : 'success'}`}>
          <h4>Import-Ergebnis</h4>
          <div className="result-stats">
            <div className="result-stat success">
              <span className="stat-number">{importResult.imported}</span>
              <span className="stat-label">Fragen importiert</span>
            </div>
            {importResult.errors > 0 && (
              <div className="result-stat error">
                <span className="stat-number">{importResult.errors}</span>
                <span className="stat-label">Fehler</span>
              </div>
            )}
          </div>
          <p className="result-message">{importResult.message}</p>
        </div>
      )}

      <div className="format-docs">
        <h3>CSV-Format</h3>
        <div className="format-table">
          <table>
            <thead>
              <tr>
                <th>Spalte</th>
                <th>Beschreibung</th>
                <th>Beispiel</th>
                <th>Pflicht</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>category</code></td><td>Name der Kategorie</td><td>Geographie</td><td>Ja</td></tr>
              <tr><td><code>question</code></td><td>Frage-Text</td><td>Welches ist die Hauptstadt...?</td><td>Ja</td></tr>
              <tr><td><code>answer1-4</code></td><td>Antwort-Optionen</td><td>Berlin, München, Hamburg, Köln</td><td>Ja</td></tr>
              <tr><td><code>correct_answer</code></td><td>Nummer der richtigen Antwort (1-4)</td><td>1</td><td>Ja</td></tr>
              <tr><td><code>points</code></td><td>Punkte für die Frage</td><td>100-500</td><td>Nein (Default: 100)</td></tr>
              <tr><td><code>time_limit</code></td><td>Zeit in Sekunden</td><td>30</td><td>Nein (Default: 30)</td></tr>
              <tr><td><code>is_risiko</code></td><td>RISIKO-Frage</td><td>true/false</td><td>Nein (Default: false)</td></tr>
            </tbody>
          </table>
        </div>

        <div className="format-tips">
          <h4>Tipps</h4>
          <ul>
            <li>Verwende UTF-8 Encoding für Umlaute</li>
            <li>Kategorien werden automatisch erstellt falls sie nicht existieren</li>
            <li>Die erste Zeile muss die Spaltennamen enthalten</li>
            <li>Verwende Anführungszeichen für Texte mit Kommas</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default ImportManager
