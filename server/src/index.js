import app from './app.js';
import { env } from './config/env.js';
import { pool, query } from './config/db.js';

async function initializeDatabase() {
  try {
    // Read and execute schema (IF NOT EXISTS — safe to re-run)
    const fs = await import('fs');
    const schemaPath = new URL('../db/schema.sql', import.meta.url);
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    const commands = schemaSql.split(';').filter((cmd) => cmd.trim());
    for (const command of commands) {
      await query(command);
    }

    console.log('✓ Database schema initialized');

    // Clear all sessions on startup — fresh exam window
    await query('DELETE FROM question_responses');
    await query('DELETE FROM integrity_events');
    await query('DELETE FROM exam_sessions');
    console.log('✓ All previous sessions cleared (fresh exam window)');
  } catch (err) {
    console.error('Database initialization error:', err.message);
  }
}

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('PostgreSQL connected');
  } catch (err) {
    console.error('PostgreSQL connection failed:', err.message);
    console.error('Check DATABASE_URL and ensure Postgres is running.');
    process.exit(1);
  }

  await initializeDatabase();

  app.listen(env.port, () => {
    console.log(`Server running on http://localhost:${env.port}`);
  });
}

start();
