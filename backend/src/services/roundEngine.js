import {
  generateServerSeed,
  generateNonce,
  getRoundHash,
  hashToFloat01
} from './provablyFair.js';
import { selectSceneOutcomeAndVideo } from './videoSelector.js';

let roundCounter = 1;

export function createRound({ clientSeed }) {
  const serverSeed = generateServerSeed();
  const nonce = generateNonce();

  const hash = getRoundHash({ serverSeed, clientSeed, nonce });

  // Используем разные части hash для выбора исхода и конкретного видео.
  const rollOutcome = hashToFloat01(hash.slice(0, 16));
  const rollVideo = hashToFloat01(hash.slice(16, 32));

  const { scene, outcome, video } = selectSceneOutcomeAndVideo(
    rollOutcome,
    rollVideo
  );

  const roundId = `round_${roundCounter++}`;

  const now = Date.now();
  const bettingWindowMs = 3000;

  return {
    roundId,
    createdAt: now,
    bettingCloseAt: now + bettingWindowMs,
    scene: {
      id: scene.id,
      name: scene.name
    },
    outcome: {
      code: outcome.code,
      label: outcome.label
    },
    video: video && {
      id: video.id,
      url: video.url,
      duration: video.duration
    },
    provablyFair: {
      serverSeed,
      clientSeed,
      nonce,
      hash
    }
  };
}

