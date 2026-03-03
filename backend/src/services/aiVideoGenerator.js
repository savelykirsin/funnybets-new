// Заготовка под интеграцию с AI-видео.
// Здесь нет реальных внешних вызовов — только структура,
// которую потом можно "подключить" к конкретному API (Runway, Pika, Luma и т.д.).

export const AI_SCENES = [
  {
    id: 'sports_basketball_throw',
    category: 'sports',
    name: 'Спортивный бросок — баскетбол',
    outcomes: [
      { code: 'HIT', label: 'Мяч залетает точно в корзину' },
      { code: 'MISS', label: 'Полный промах мимо кольца' },
      { code: 'RIM', label: 'Мяч задевает кольцо / обод' }
    ]
  },
  {
    id: 'sports_football_shot',
    category: 'sports',
    name: 'Спортивный удар — футбол',
    outcomes: [
      { code: 'GOAL', label: 'Чистый гол' },
      { code: 'SAVE', label: 'Вратарь отбивает мяч' },
      { code: 'POST', label: 'Попадание в штангу / перекладину' }
    ]
  },
  {
    id: 'physics_experiment',
    category: 'physics',
    name: 'Физический эксперимент',
    outcomes: [
      { code: 'SUCCESS', label: 'Эксперимент удаётся' },
      { code: 'FAIL', label: 'Эксперимент срывается' }
    ]
  },
  {
    id: 'race_marbles',
    category: 'race',
    name: 'Гонки шариков / препятствия',
    outcomes: [
      { code: 'WIN_RED', label: 'Красный шарик побеждает' },
      { code: 'WIN_BLUE', label: 'Синий шарик побеждает' },
      { code: 'CRASH', label: 'Шарики сталкиваются / срываются' }
    ]
  },
  {
    id: 'duel_characters',
    category: 'duel',
    name: 'Дуэль персонажей',
    outcomes: [
      { code: 'LEFT_WINS', label: 'Побеждает левый персонаж' },
      { code: 'RIGHT_WINS', label: 'Побеждает правый персонаж' }
    ]
  },
  {
    id: 'lottery_mechanics',
    category: 'lottery',
    name: 'Лотерейная механика',
    outcomes: [
      { code: 'JACKPOT', label: 'Выпадает крупный выигрыш' },
      { code: 'SMALL_PRIZE', label: 'Маленький выигрыш' },
      { code: 'NO_PRIZE', label: 'Ничего не выпадает' }
    ]
  }
];

export function findAiScene(sceneId) {
  return AI_SCENES.find((s) => s.id === sceneId);
}

export function buildPrompt({ sceneId, outcomeCode }) {
  const scene = findAiScene(sceneId);
  if (!scene) {
    throw new Error(`Unknown AI scene id: ${sceneId}`);
  }

  const outcome = scene.outcomes.find((o) => o.code === outcomeCode);
  if (!outcome) {
    throw new Error(
      `Unknown outcome code "${outcomeCode}" for scene "${sceneId}"`
    );
  }

  // Базовый English-промпт под text-to-video / image-to-video модель.
  // Здесь можно будет докрутить стиль, длину, цветокор и т.д.
  const base = {
    sports_basketball_throw: `Ultra-realistic vertical 9:16 video of a basketball free throw, clearly showing that the ball ${outcome.label}, slow motion replay at the end, 8 seconds total, cinematic lighting, crowd blurred in the background.`,
    sports_football_shot: `Vertical 9:16 football penalty shot, clearly showing that the ball ${outcome.label}, goalkeeper reaction visible, stadium lights, 8 seconds, dynamic camera but always keeps the ball in frame.`,
    physics_experiment: `Close-up 9:16 shot of a satisfying physics experiment on a table, slow motion in key moment, clearly ${outcome.label}, colorful but minimalistic background, 10 seconds.`,
    race_marbles: `Vertical 9:16 video of a marble race on a track with obstacles, clearly showing that ${outcome.label}, overhead and side camera cuts, 10 seconds, colorful marbles on wooden track.`,
    duel_characters: `9:16 cinematic duel between two stylized game characters, clearly showing that ${outcome.label}, dynamic camera, dust and light effects, 10 seconds, no text on screen.`,
    lottery_mechanics: `Vertical 9:16 lottery machine animation, bouncing colorful balls with numbers, clearly showing that ${outcome.label}, slow zoom in at result, 8 seconds, clean background.`
  }[sceneId];

  if (!base) {
    throw new Error(`No prompt template configured for scene ${sceneId}`);
  }

  return base;
}

// Вызов AI-провайдера.
// Поддерживаются два режима:
// 1) provider = 'runway' и задан RUNWAYML_API_SECRET → реальный запрос к Runway text_to_video
// 2) любой другой провайдер или отсутствующий ключ → мягкая заглушка (без внешнего HTTP-вызова)
export async function requestAiVideoGeneration({
  sceneId,
  outcomeCode,
  provider = 'stub'
}) {
  const prompt = buildPrompt({ sceneId, outcomeCode });
  const createdAt = Date.now();

  // Если явно выбран Runway и задан API-ключ — делаем реальный HTTP-запрос.
  if (provider === 'runway' && process.env.RUNWAYML_API_SECRET) {
    try {
      // Требуется Node 18+ (глобальный fetch).
      const apiKey = process.env.RUNWAYML_API_SECRET;

      const body = {
        model: 'gen4.5',
        promptText: prompt,
        ratio: '720:1280', // вертикальное видео 9:16
        duration: 8
        // seed: можно будет пробрасывать из provably fair для повторяемости
      };

      const response = await fetch('https://api.runwayml.com/v1/text_to_video', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-Runway-Version': '2024-11-06'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          jobId: `runway-error-${sceneId}-${outcomeCode}-${createdAt}`,
          provider: 'runway',
          sceneId,
          outcomeCode,
          prompt,
          status: 'error',
          error: `Runway HTTP ${response.status}: ${errorText}`,
          previewUrl: null,
          createdAt
        };
      }

      const task = await response.json();

      return {
        jobId: task.id || `runway-task-${sceneId}-${outcomeCode}-${createdAt}`,
        provider: 'runway',
        sceneId,
        outcomeCode,
        prompt,
        status: task.status || 'submitted',
        // В task обычно есть ссылки на ассеты; пока просто возвращаем "сырые" данные.
        rawTask: task,
        previewUrl: null,
        createdAt
      };
    } catch (err) {
      return {
        jobId: `runway-exception-${sceneId}-${outcomeCode}-${createdAt}`,
        provider: 'runway',
        sceneId,
        outcomeCode,
        prompt,
        status: 'error',
        error: String(err),
        previewUrl: null,
        createdAt
      };
    }
  }

  // Fallback-заглушка (нет ключа или другой провайдер)
  const jobId = `${provider}-${sceneId}-${outcomeCode}-${createdAt}`;

  return {
    jobId,
    provider,
    sceneId,
    outcomeCode,
    prompt,
    status: process.env.RUNWAYML_API_SECRET
      ? 'queued'
      : 'no_external_provider_configured',
    previewUrl: null,
    createdAt
  };
}

