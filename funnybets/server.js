const express = require('express');
const cors = require('cors');
const Replicate = require('replicate');
const path = require('path'); // Убедитесь, что эта строка есть

// ... ваш код в server.js
require('dotenv').config(); // Это должно быть здесь

// ДОБАВЬТЕ ЭТИ СТРОКИ:
console.log("DEBUG Dotenv config result:", require('dotenv').config());
console.log("DEBUG Replicate Token from process.env:", process.env.REPLICATE_API_TOKEN);
// ...
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Для обслуживания статических файлов (изображения, видео и т.д.)

// Replicate API Key (лучше как переменная окружения)
const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN, // Ваш API ключ должен быть в переменной окружения
});

// ID I2V модели (Image-to-Video)
const VIDEO_MODEL_ID = 'sunfjun/stable-video-diffusion:d68b6e09eedbac7a49e3d8644999d93579c386a083768235cabca88796d70d82';
// URL изображения для превью (одно для всех)
const previewImageUrl = 'https://major-bears-yell.loca.lt'; // Ваш IP сервера
// Функция для опроса статуса генерации видео
async function pollPrediction(predictionId) {
    let prediction;
    while (true) {
        prediction = await replicate.predictions.get(predictionId);
        if (prediction.status === 'succeeded') {
            // SVD возвращает один URL видео
            return prediction.output;
        }
        if (prediction.status === 'failed' || prediction.status === 'canceled' || prediction.status === 'timed_out') {
            throw new Error(`Replicate prediction failed or was canceled: ${prediction.error || prediction.status}`);
        }
        await new Promise(resolve => setTimeout(resolve, 5000)); // Пауза 5 секунд
    }
}

// Map для хранения идентификаторов предсказаний Replicate
// Позволяет связать ID запроса на фронтенде с предсказанием на Replicate
const predictionMap = new Map();

// Маршрут для запуска генерации видео (первый запрос)
app.get('/api/start-video-generation', async (req, res) => {
    const outcomes = ['hit', 'miss', 'rim_touch'];
    const randomOutcome = outcomes[Math.floor(Math.random() * outcomes.length)];

    const imageUrl = previewImageUrl; // Теперь одно изображение для всех

    if (!imageUrl) {
        return res.status(500).json({ error: 'No image URL found for outcome.' });
    }

    try {
        console.log(`[Replicate] Starting generation for outcome: ${randomOutcome}. Image: ${imageUrl}`);

        // Запускаем предсказание
        const prediction = await replicate.predictions.create({
            version: VIDEO_MODEL_ID,
                        input: {
                input_image: imageUrl, // !!! ИЗМЕНЕНО С 'image' НА 'input_image' !!!

                // Параметры для sunfjun/stable-video-diffusion (можно оптимизировать):
                fps: 6, // Частота кадров (6 fps * 3 секунды = 18 кадров)
                num_frames: 18, // Количество кадров для 3 секунд видео
                motion_bucket_id: 127, // Диапазон 1-255, влияет на движение
                cond_aug: 0.02, // Диапазон 0-0.1, уровень шума
                // height и width обычно не задаются для этой модели напрямую,
                // она работает с размером input_image.
                // Если будут проблемы с форматом, вернем height/width.
                seed: Math.floor(Math.random() * 100000) // Случайный сид
            },
        });

        predictionMap.set(prediction.id, {
            outcome: randomOutcome,
            imageUrl: imageUrl,
            status: prediction.status,
        });

        res.json({
            predictionId: prediction.id, // Возвращаем ID предсказания на фронтенд
            outcome: randomOutcome,
            imageUrl: imageUrl, // Возвращаем URL изображения сразу
            status: prediction.status, // 'starting'
        });

    } catch (error) {
        console.error('Error starting video generation with Replicate:', error);
        res.status(500).json({ error: 'Failed to start video generation', details: error.message });
    }
});

// Маршрут для проверки статуса генерации видео (второй запрос)
app.get('/api/check-video-status/:predictionId', async (req, res) => {
    const { predictionId } = req.params;


    if (!predictionMap.has(predictionId)) {
        return res.status(404).json({ error: 'Prediction ID not found.' });
    }

    try {
        const prediction = await replicate.predictions.get(predictionId);

        if (prediction.status === 'succeeded') {
            const videoUrl = prediction.output; // SVD-XL возвращает один URL
            predictionMap.delete(predictionId); // Удаляем, так как готово

            console.log(`[Replicate] Video completed for ${predictionId}: ${videoUrl}`);

            res.json({
                status: 'succeeded',
                videoUrl: videoUrl,
                outcome: predictionMap.get(predictionId)?.outcome || 'unknown',
            });
        } else if (prediction.status === 'failed' || prediction.status === 'canceled' || prediction.status === 'timed_out') {
            predictionMap.delete(predictionId); // Удаляем
            console.error(`[Replicate] Prediction ${predictionId} failed: ${prediction.error}`);
            res.status(500).json({ status: 'failed', error: `Video generation failed: ${prediction.error}` });
        } else {
            // Видео еще генерируется
            res.json({ status: prediction.status });
        }
    } catch (error) {
        console.error('Error checking video status from Replicate:', error);
        res.status(500).json({ error: 'Failed to check video status', details: error.message });
    }
});


// Маршрут для приема ставки
app.post('/api/place-bet', express.json(), (req, res) => {
    const { selectedOutcome, predictionId } = req.body;

    // В MVP мы просто сохраним ставку и свяжем ее с результатом, который появится позже.
    if (predictionMap.has(predictionId)) {
        const data = predictionMap.get(predictionId);
        data.userBet = selectedOutcome; // Сохраняем ставку пользователя
        predictionMap.set(predictionId, data);
        res.json({ message: 'Ставка принята.', predictionId: predictionId });
    } else {
        res.status(404).json({ error: 'Предсказание не найдено или истек срок действия.' });
    }
});


app.listen(port, () => {
    console.log(`FunnyBets backend listening at http://localhost:${port}`);
    console.log(`Replicate API Key: ${replicate.auth ? 'Loaded' : 'NOT loaded'}`);
});
