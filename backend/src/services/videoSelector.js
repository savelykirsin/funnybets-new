// Простейший in-memory пул сцен и видео для MVP.

const scenes = [
  {
    id: 'basketball_free_throw',
    name: 'Бросок в баскетбольное кольцо',
    outcomes: [
      { code: 'HIT', label: 'Попадёт', weight: 0.5 },
      { code: 'MISS', label: 'Промахнётся', weight: 0.4 },
      { code: 'RIM', label: 'Касание обода', weight: 0.1 }
    ]
  }
];

// Заглушечные видео — в будущем здесь будут реальные CDN URL.
const videos = [
  // HIT
  {
    id: 'vid_hit_1',
    sceneId: 'basketball_free_throw',
    outcomeCode: 'HIT',
    url: 'https://cdn.example.com/videos/basketball/hit_1.mp4',
    duration: 8
  },
  {
    id: 'vid_hit_2',
    sceneId: 'basketball_free_throw',
    outcomeCode: 'HIT',
    url: 'https://cdn.example.com/videos/basketball/hit_2.mp4',
    duration: 7
  },
  // MISS
  {
    id: 'vid_miss_1',
    sceneId: 'basketball_free_throw',
    outcomeCode: 'MISS',
    url: 'https://cdn.example.com/videos/basketball/miss_1.mp4',
    duration: 9
  },
  // RIM
  {
    id: 'vid_rim_1',
    sceneId: 'basketball_free_throw',
    outcomeCode: 'RIM',
    url: 'https://cdn.example.com/videos/basketball/rim_1.mp4',
    duration: 10
  }
];

function pickScene() {
  // MVP: всегда одна сцена
  return scenes[0];
}

function pickOutcomeByRoll(scene, roll01) {
  const totalWeight = scene.outcomes.reduce((sum, o) => sum + o.weight, 0);
  const target = roll01 * totalWeight;
  let acc = 0;

  for (const outcome of scene.outcomes) {
    acc += outcome.weight;
    if (target <= acc) return outcome;
  }

  return scene.outcomes[scene.outcomes.length - 1];
}

function pickVideoForOutcome(sceneId, outcomeCode, roll01) {
  const pool = videos.filter(
    (v) => v.sceneId === sceneId && v.outcomeCode === outcomeCode
  );

  if (pool.length === 0) {
    return null;
  }

  const index = Math.floor(roll01 * pool.length) % pool.length;
  return pool[index];
}

export function selectSceneOutcomeAndVideo(rollForOutcome, rollForVideo) {
  const scene = pickScene();
  const outcome = pickOutcomeByRoll(scene, rollForOutcome);
  const video = pickVideoForOutcome(scene.id, outcome.code, rollForVideo);

  return {
    scene,
    outcome,
    video
  };
}

