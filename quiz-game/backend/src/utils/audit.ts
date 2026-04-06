import { pool } from '../database/connection.js'

export async function logAudit(
  userId: number | null,
  username: string,
  action: string,
  entityType?: string,
  entityId?: number,
  details?: string,
  ipAddress?: string
) {
  try {
    await pool.query(
      `INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, username, action, entityType || null, entityId || null, details || null, ipAddress || null]
    )
  } catch (err) {
    // Don't let audit logging failures break the app
    console.error('Audit log error:', err)
  }
}
