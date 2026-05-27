import bcrypt from 'bcrypt';
import { query } from '../src/config/db.js';

// Default password for all demo students
const DEFAULT_PASSWORD = 'password123';
const passwordHash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);

const DUMMY_STUDENTS = [
  { roll_number: 'CSE001', full_name: 'Aarav Singh' },
  { roll_number: 'CSE002', full_name: 'Priya Sharma' },
  { roll_number: 'CSE003', full_name: 'Arjun Patel' },
  { roll_number: 'CSE004', full_name: 'Divya Singh' },
  { roll_number: 'CSE005', full_name: 'Rohan Verma' },
  { roll_number: 'CSE006', full_name: 'Anjali Gupta' },
  { roll_number: 'CSE007', full_name: 'Vikram Rao' },
  { roll_number: 'CSE008', full_name: 'Sneha Desai' },
  { roll_number: 'CSE009', full_name: 'Karthik Nair' },
  { roll_number: 'CSE010', full_name: 'Neha Reddy' },
];

const QUESTIONS = [
  {
    question_text: 'What is the capital of France?',
    option_a: 'London', option_b: 'Paris', option_c: 'Berlin', option_d: 'Madrid',
    correct_answer: 'B',
  },
  {
    question_text: 'What is 2 + 2?',
    option_a: '3', option_b: '4', option_c: '5', option_d: '6',
    correct_answer: 'B',
  },
  {
    question_text: 'Which planet is known as the Red Planet?',
    option_a: 'Venus', option_b: 'Jupiter', option_c: 'Mars', option_d: 'Saturn',
    correct_answer: 'C',
  },
  {
    question_text: 'What is the largest ocean on Earth?',
    option_a: 'Atlantic Ocean', option_b: 'Indian Ocean', option_c: 'Arctic Ocean', option_d: 'Pacific Ocean',
    correct_answer: 'D',
  },
  {
    question_text: 'Who wrote Romeo and Juliet?',
    option_a: 'Charles Dickens', option_b: 'William Shakespeare', option_c: 'Jane Austen', option_d: 'Mark Twain',
    correct_answer: 'B',
  },
  {
    question_text: 'What is the smallest prime number?',
    option_a: '0', option_b: '1', option_c: '2', option_d: '3',
    correct_answer: 'C',
  },
  {
    question_text: 'In which year did World War II end?',
    option_a: '1943', option_b: '1944', option_c: '1945', option_d: '1946',
    correct_answer: 'C',
  },
  {
    question_text: 'What is the chemical symbol for Gold?',
    option_a: 'Go', option_b: 'Gd', option_c: 'Au', option_d: 'Ag',
    correct_answer: 'C',
  },
  {
    question_text: 'Which country has the most population?',
    option_a: 'India', option_b: 'United States', option_c: 'Indonesia', option_d: 'Brazil',
    correct_answer: 'A',
  },
  {
    question_text: 'What is the speed of light?',
    option_a: '300,000 km/s', option_b: '150,000 km/s', option_c: '450,000 km/s', option_d: '600,000 km/s',
    correct_answer: 'A',
  },
];

export async function seedDatabase() {
  try {
    console.log('Seeding database with dummy data...');

    // Seed students with password hash
    console.log('Seeding students...');
    for (const student of DUMMY_STUDENTS) {
      await query(
        `INSERT INTO students (roll_number, full_name, password_hash)
         VALUES ($1, $2, $3)
         ON CONFLICT (roll_number) DO NOTHING`,
        [student.roll_number, student.full_name, passwordHash]
      );
    }
    console.log(`Seeded ${DUMMY_STUDENTS.length} students (password: ${DEFAULT_PASSWORD})`);

    // Seed questions — uses UNIQUE(question_text) to prevent duplicates
    console.log('Seeding questions...');
    for (const q of QUESTIONS) {
      await query(
        `INSERT INTO questions (question_text, option_a, option_b, option_c, option_d, correct_answer)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (question_text) DO NOTHING`,
        [q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer]
      );
    }
    console.log(`Seeded ${QUESTIONS.length} questions`);

    console.log('Database seeding complete!');
  } catch (err) {
    console.error('Error seeding database:', err);
  }
}
