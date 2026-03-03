import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createRound } from './services/roundEngine.js';
import {
  AI_SCENES,
  requestAiVideoGeneration
} from './services/aiVideoGenerator.js';

const app = express();

app.use(cors());
app.use(express.json());

// Простой корневой маршрут, чтобы браузер по адресу http://localhost:4000
// получал валидный ответ, а не ошибку.
app.get('/', (req, res) => {
  res.send('funnybets backend is running. Use /api/health or /api/feed/next.');
});

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Получить следующий раунд для ленты
app.get('/api/feed/next', (req, res) => {
  try {
    const clientSeed = String(req.query.clientSeed || 'web-client');
    const round = createRound({ clientSeed });
    res.json(round);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error in /api/feed/next', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ----- Админские / AI-видео маршруты (заготовка) -----

// Список доступных AI-сцен и исходов
app.get('/api/admin/ai-scenes', (req, res) => {
  res.json({ scenes: AI_SCENES });
});

// Запрос на генерацию видео при помощи AI (пока без реального провайдера)
app.post('/api/admin/videos/generate', async (req, res) => {
  try {
    const { sceneId, outcomeCode, count = 1, provider } = req.body || {};

    if (!sceneId || !outcomeCode) {
      return res
        .status(400)
        .json({ error: 'sceneId and outcomeCode are required' });
    }

    const jobs = [];
    const safeCount = Math.min(Math.max(Number(count) || 1, 1), 10);

    for (let i = 0; i < safeCount; i += 1) {
      // Здесь будет реальный вызов внешнего AI-видео сервиса
      // (Runway, Pika, Luma и т.п.). Пока это заглушка.
      // eslint-disable-next-line no-await-in-loop
      const job = await requestAiVideoGeneration({
        sceneId,
        outcomeCode,
        provider
      });
      jobs.push(job);
    }

    res.json({ jobs });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error in /api/admin/videos/generate', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`funnybets backend listening on http://localhost:${PORT}`);
});
