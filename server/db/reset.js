// Reset script: drops all tables and recreates them
// Run with: node server/db/reset.js
import { pool, query } from '../src/config/db.js';

async function reset() {
  try {
    console.log('Dropping all existing tables...');
    await query(`
      DROP TABLE IF EXISTS question_responses CASCADE;
      DROP TABLE IF EXISTS integrity_events CASCADE;
      DROP TABLE IF EXISTS exam_sessions CASCADE;
      DROP TABLE IF EXISTS questions CASCADE;
      DROP TABLE IF EXISTS students CASCADE;
    `);
    console.log('All tables dropped');

    // Read and execute schema
    const fs = await import('fs');
    const schemaPath = new URL('./schema.sql', import.meta.url);
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    const commands = schemaSql.split(';').filter((cmd) => cmd.trim());
    for (const command of commands) {
      await query(command);
    }
    console.log('Schema recreated');

    // Seed data
    const { seedDatabase } = await import('./dummy_data.js');
    await seedDatabase();

    console.log('Database reset complete!');
  } catch (err) {
    console.error('Reset failed:', err);
  } finally {
    await pool.end();
  }
}

reset();
