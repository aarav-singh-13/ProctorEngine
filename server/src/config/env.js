import dotenv from 'dotenv';

dotenv.config();

const requiredInProduction = ['JWT_SECRET'];

if (process.env.NODE_ENV === 'production') {
  for (const key of requiredInProduction) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

// Determine if SSL is needed
const useSSL = process.env.DB_SSL === 'true';

// Construct DATABASE_URL from Supabase fields or use direct DATABASE_URL
// NOTE: Do NOT include sslmode in the URL — SSL is handled by the pool config in db.js
const databaseUrl = (() => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  if (process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_HOST) {
    return `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'postgres'}`;
  }
  return 'postgresql://postgres:postgres@localhost:5432/online_exam';
})();

export const env = {
  port: Number(process.env.PORT) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  databaseUrl,
  useSSL,
  jwtSecret: process.env.JWT_SECRET || 'dev-only-jwt-secret-change-in-prod',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
  examDurationMinutes: Number(process.env.EXAM_DURATION_MINUTES) || 10,
};
