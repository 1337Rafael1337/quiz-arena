import { QRCodeSVG } from 'qrcode.react'

interface QRModalProps {
  url: string
  title: string
  onClose: () => void
}

const QRModal = ({ url, title, onClose }: QRModalProps) => {
  return (
    <div className="question-form-overlay" onClick={onClose}>
      <div className="question-form" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
        <h3>{title}</h3>
        <div style={{ margin: '1.5rem auto', background: '#fff', padding: '1rem', borderRadius: '12px', display: 'inline-block' }}>
          <QRCodeSVG value={url} size={256} level="M" />
        </div>
        <p style={{ fontSize: '0.9rem', color: '#a0a0b8', wordBreak: 'break-all', marginBottom: '1rem' }}>{url}</p>
        <div className="form-actions" style={{ justifyContent: 'center' }}>
          <button className="btn-edit" onClick={() => { navigator.clipboard.writeText(url); }}>
            Link kopieren
          </button>
          <button className="btn-cancel" onClick={onClose}>Schließen</button>
        </div>
      </div>
    </div>
  )
}

export default QRModal
