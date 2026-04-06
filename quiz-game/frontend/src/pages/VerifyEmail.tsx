import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiFetch } from '../lib/api'

const VerifyEmail = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setMessage('Kein Verification-Token gefunden')
      return
    }

    verifyEmail(token)
  }, [searchParams])

  const verifyEmail = async (token: string) => {
    try {
      const data = await apiFetch(`/api/auth/verify-email?token=${token}`)
      setStatus('success')
      setMessage(data.message)
    } catch (err: any) {
      setStatus('error')
      setMessage(err.message)
    }
  }

  return (
    <div className="setup-wizard">
      <div className="setup-container">
        <div className="setup-header">
          <h1>Email Bestätigung</h1>
        </div>

        {status === 'loading' && <p>Bestätige Email...</p>}

        {status === 'success' && (
          <>
            <p>{message}</p>
            <button className="btn-setup" onClick={() => navigate('/admin/login')}>
              Zum Login
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="error-messages">
              <div className="error-message">{message}</div>
            </div>
            <button className="btn-setup" onClick={() => navigate('/')}>
              Zur Startseite
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default VerifyEmail
