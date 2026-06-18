import { readFileSync } from 'fs';
import { resolve } from 'path';

// Charge .env manuellement (sans dépendance)
try {
  const env = readFileSync(resolve('.env'), 'utf-8');
  env.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && !process.env[key]) {
      process.env[key] = vals.join('=').trim();
    }
  });
} catch { /* .env facultatif */ }

function required(key) {
  if (!process.env[key]) {
    throw new Error(`Variable d'environnement manquante: ${key}`);
  }
  return process.env[key];
}

export const config = {
  PORT:            parseInt(process.env.PORT  || '3001'),
  FRONTEND_URL:    process.env.FRONTEND_URL   || 'http://localhost:5173',
  NODE_ENV:        process.env.NODE_ENV        || 'development',
  ADMIN_TOKEN:     process.env.ADMIN_TOKEN     || 'dev-secret-change-me',
  SANDBOX_ENABLED: process.env.SANDBOX_ENABLED !== 'false',
  DOCKER_IMAGE:    process.env.DOCKER_IMAGE    || 'ghcr.io/foundry-rs/foundry:latest',
  MAX_CONCURRENCY: parseInt(process.env.MAX_CONCURRENCY || '2'),
  JOB_TIMEOUT_MS:  parseInt(process.env.JOB_TIMEOUT_MS  || '60000'),
  TEMP_DIR:        process.env.TEMP_DIR        || '/tmp/etheraudit',
};