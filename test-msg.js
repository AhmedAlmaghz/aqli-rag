import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function test() {
  try {
    const res = await pool.query(`
      INSERT INTO messages (id, conversation_id, workspace_id, role, content, tokens_count, groundedness_score, citations, tool_invocations)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, ['msg-1', 'conv-1', 'ws-enterprise-legal', 'user', 'hello', 0, 95, JSON.stringify([]), JSON.stringify([])]);
    console.log("Success message insert");
  } catch(e) {
    console.error("Message insert error:", e);
  } finally {
    pool.end();
  }
}
test();
