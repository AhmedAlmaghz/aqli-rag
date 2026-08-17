import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function test() {
  try {
    const res = await pool.query(`
      INSERT INTO audit_logs (id, workspace_id, action, user_id, details)
      VALUES ($1, $2, $3, $4, $5)
    `, ['audit-1', 'ws-enterprise-legal', 'test_action', 'user-1', JSON.stringify({})]);
    console.log("Success audit insert");
  } catch(e) {
    console.error("Audit insert error:", e);
  } finally {
    pool.end();
  }
}
test();
