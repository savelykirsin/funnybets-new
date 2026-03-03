import crypto from 'crypto';

export function generateServerSeed() {
  return crypto.randomBytes(32).toString('hex');
}

export function generateNonce() {
  // Для MVP — простой монотонный nonce на основе времени
  return Date.now();
}

export function getRoundHash({ serverSeed, clientSeed, nonce }) {
  const hmac = crypto.createHmac('sha256', serverSeed);
  hmac.update(`${clientSeed}:${nonce}`);
  return hmac.digest('hex');
}

// Преобразование hash → число в диапазоне [0, 1)
export function hashToFloat01(hash) {
  const slice = hash.slice(0, 13); // ~52 бита
  const int = parseInt(slice, 16);
  const max = Math.pow(2, 52);
  return int / max;
}

