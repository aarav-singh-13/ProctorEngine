/**
 * One-time script: enroll seeded student photos with Luxand Cloud.
 * Usage: FACE_PROVIDER=luxand LUXAND_API_TOKEN=xxx node src/db/enroll-luxand.js
 */
import axios from 'axios';
import { pool } from '../config/db.js';
import { env } from '../config/env.js';
import { enrollStudentFace } from '../services/face.service.js';

async function downloadImage(url) {
  const { data } = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 });
  return Buffer.from(data);
}

async function enrollAll() {
  if (env.faceProvider !== 'luxand' || !env.luxandApiToken) {
    console.error('Set FACE_PROVIDER=luxand and LUXAND_API_TOKEN before running enrollment.');
    process.exit(1);
  }

  const { rows: students } = await pool.query(
    `SELECT id, roll_number, full_name, photo_url, luxand_person_uuid FROM students`
  );

  for (const student of students) {
    if (student.luxand_person_uuid) {
      console.log(`Skip ${student.roll_number} — already enrolled`);
      continue;
    }

    if (!student.photo_url) {
      console.warn(`Skip ${student.roll_number} — no photo_url`);
      continue;
    }

    try {
      const imageBuffer = await downloadImage(student.photo_url);
      const { personUuid } = await enrollStudentFace({
        name: `${student.roll_number}-${student.full_name}`,
        imageBuffer,
      });

      await pool.query(`UPDATE students SET luxand_person_uuid = $1 WHERE id = $2`, [
        personUuid,
        student.id,
      ]);

      console.log(`Enrolled ${student.roll_number} -> ${personUuid}`);
    } catch (err) {
      console.error(`Failed ${student.roll_number}:`, err.message);
    }
  }

  await pool.end();
}

enrollAll();
