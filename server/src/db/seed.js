import bcrypt from 'bcrypt';
import { pool } from '../config/db.js';

const DEFAULT_PASSWORD = 'password123';
const passwordHash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);

const demoStudents = [
  { roll_number: 'CS001', full_name: 'Alice Demo' },
  { roll_number: 'CS002', full_name: 'Bob Demo' },
  { roll_number: 'CS003', full_name: 'Carol Demo' },
];

async function seed() {
  try {
    for (const student of demoStudents) {
      await pool.query(
        `INSERT INTO students (roll_number, full_name, password_hash)
         VALUES ($1, $2, $3)
         ON CONFLICT (roll_number) DO NOTHING`,
        [student.roll_number, student.full_name, passwordHash]
      );
    }

    console.log('Seeded demo students:', demoStudents.map((s) => s.roll_number).join(', '));
    console.log(`Default password for all students: ${DEFAULT_PASSWORD}`);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
