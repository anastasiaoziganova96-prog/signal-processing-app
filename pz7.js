// ПЗ №7: Белый шум + загрузка аудиофайлов
let audioContext = null;
let currentSource = null;
let whiteNoiseSamples = null;
let uploadedSamples7 = null;
let uploadedRate7 = 44100;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

// Генерация белого шума (нормальное распределение)
function generateWhiteNoise(duration, amp, sampleRate = 44100) {
    const numSamples = duration * sampleRate;
    const samples = new Array(numSamples);
    
    for (let i = 0; i < numSamples; i++) {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        samples[i] = amp * z;
    }
    
    const maxAmp = Math.max(...samples.map(Math.abs));
    if (maxAmp > 0) {
        for (let i = 0; i < samples.length; i++) {
            samples[i] = samples[i] / maxAmp;
        }
    }
    return samples;
}

// Загрузка аудиофайла
function loadAudioFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target.result;
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                const samples = audioBuffer.getChannelData(0);
                resolve({
                    samples: Array.from(samples),
                    rate: audioBuffer.sampleRate,
                    name: file.name,
                    duration: audioBuffer.duration
                });
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// Вычисление спектра
function computeSpectrum(samples, sampleRate) {
    const n = Math.min(samples.length, 16384);
    const spectrum = new Array(Math.floor(n/2));
    const freqs = new Array(Math.floor(n/2));
    
    for (let k = 0; k < n/2; k++) {
        let real = 0, imag = 0;
        for (let i = 0; i < n; i++) {
            const angle = -2 * Math.PI * k * i / n;
            real += samples[i] * Math.cos(angle);
            imag += samples[i] * Math.sin(angle);
        }
        spectrum[k] = Math.sqrt(real*real + imag*imag) / n;
        freqs[k] = k * sampleRate / n;
    }
    return { freqs, spectrum };
}

// Вычисление спектрограммы
function computeSpectrogram(samples, sampleRate) {
    const segmentSize = 512;
    const numSegments = Math.min(Math.floor(samples.length / segmentSize), 200);
    const spectrogram = [];
    
    for (let seg = 0; seg < numSegments; seg++) {
        const start = seg * segmentSize;
        const segment = samples.slice(start, start + segmentSize);
        const spectrum = new Array(segmentSize / 2);
        
        for (let k = 0; k < segmentSize / 2; k++) {
            let real = 0, imag = 0;
            for (let i = 0; i < segmentSize; i++) {
                const windowVal = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / segmentSize);
                const angle = -2 * Math.PI * k * i / segmentSize;
                real += segment[i] * windowVal * Math.cos(angle);
                imag += segment[i] * windowVal * Math.sin(angle);
            }
            spectrum[k] = Math.sqrt(real*real + imag*imag) / segmentSize;
        }
        spectrogram.push(spectrum);
    }
    return spectrogram;
}

// Построение графика сигнала
function plotSignal(samples, canvasId, color = '#00ff88') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const displaySamples = samples.slice(0, 800);
    const step = displaySamples.length / width;
    
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = '#444455';
    ctx.lineWidth = 0.5;
    for (let i = -2; i <= 2; i++) {
        const y = height / 2 + i * height / 4;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    ctx.beginPath();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.8;
    
    let first = true;
    for (let x = 0; x < width; x++) {
        const idx = Math.floor(x * step);
        if (idx < displaySamples.length) {
            let y = height / 2 - displaySamples[idx] * height / 2.5;
            y = Math.max(0, Math.min(height, y));
            if (first) {
                ctx.moveTo(x, y);
                first = false;
            } else {
                ctx.lineTo(x, y);
            }
        }
    }
    ctx.stroke();
}

// Построение спектра с возможностью сравнения
function plotSpectrumComparison(whiteSamples, uploadedSamples, canvasId, sampleRate) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const { freqs, spectrum: whiteSpec } = computeSpectrum(whiteSamples, sampleRate);
    const { spectrum: upSpec } = uploadedSamples ? computeSpectrum(uploadedSamples, sampleRate) : { spectrum: null };
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const maxFreq = Math.min(8000, freqs[freqs.length-1]);
    
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    
    // Спектр белого шума (зеленый)
    ctx.beginPath();
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 1.5;
    
    for (let x = 0; x < width; x++) {
        const freq = (x / width) * maxFreq;
        let idx = 0;
        for (let i = 0; i < freqs.length && freqs[i] <= freq; i++) idx = i;
        if (idx < whiteSpec.length) {
            const y = height - whiteSpec[idx] * height * 2;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
    
    // Спектр загруженного файла (желтый)
    if (upSpec) {
        ctx.beginPath();
        ctx.strokeStyle = '#ffaa44';
        ctx.lineWidth = 1.5;
        
        for (let x = 0; x < width; x++) {
            const freq = (x / width) * maxFreq;
            let idx = Math.floor(freq / maxFreq * upSpec.length);
            idx = Math.min(idx, upSpec.length - 1);
            if (idx > 10 && idx < upSpec.length) {
                const y = height - upSpec[idx] * height * 2;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }
    
    // Средняя линия для белого шума
    let avgSpec = 0;
    for (let i = 100; i < whiteSpec.length && i < 500; i++) avgSpec += whiteSpec[i];
    avgSpec = avgSpec / 400;
    ctx.beginPath();
    ctx.strokeStyle = '#ff6666';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    const avgY = height - avgSpec * height * 2;
    ctx.moveTo(0, avgY);
    ctx.lineTo(width, avgY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Легенда
    ctx.font = '10px monospace';
    ctx.fillStyle = '#00ff88';
    ctx.fillText('Белый шум (плоский спектр)', width - 200, 30);
    if (upSpec) {
        ctx.fillStyle = '#ffaa44';
        ctx.fillText('Загруженный файл', width - 200, 50);
    }
    ctx.fillStyle = '#ff6666';
    ctx.fillText('Средний уровень белого шума', width - 200, 70);
}

// Построение спектрограммы
function plotSpectrogramImage(samples, canvasId, sampleRate, title = '') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const spectrogram = computeSpectrogram(samples, sampleRate);
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    
    const numSegments = spectrogram.length;
    const numFreqs = spectrogram[0]?.length || 1;
    
    for (let x = 0; x < width && x < numSegments; x++) {
        for (let y = 0; y < height; y++) {
            const freqIdx = Math.floor((y / height) * numFreqs);
            if (freqIdx < numFreqs && spectrogram[x] && spectrogram[x][freqIdx]) {
                let intensity = spectrogram[x][freqIdx];
                intensity = Math.min(255, Math.floor(intensity * 200));
                ctx.fillStyle = `rgb(${intensity}, ${100 + intensity/2}, ${100 + intensity/2})`;
                ctx.fillRect(x, height - y, 1, 1);
            }
        }
    }
    
    if (title) {
        ctx.font = '10px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(title, 10, 20);
    }
}

// Прослушивание
function playSignal(samples, rate) {
    initAudio();
    if (currentSource) {
        try { currentSource.stop(); } catch(e) {}
    }
    
    const buffer = audioContext.createBuffer(1, samples.length, rate);
    buffer.copyToChannel(new Float32Array(samples), 0);
    
    currentSource = audioContext.createBufferSource();
    currentSource.buffer = buffer;
    currentSource.connect(audioContext.destination);
    currentSource.start();
}

document.addEventListener('DOMContentLoaded', () => {
    const durationSlider = document.getElementById('duration7');
    const ampSlider = document.getElementById('amp7');
    const info = document.getElementById('info7');
    
    document.getElementById('duration7Val').textContent = durationSlider.value;
    document.getElementById('amp7Val').textContent = ampSlider.value;
    
    durationSlider.oninput = () => document.getElementById('duration7Val').textContent = durationSlider.value;
    ampSlider.oninput = () => document.getElementById('amp7Val').textContent = ampSlider.value;
    
    // Генерация белого шума
    document.getElementById('genWhiteNoise').onclick = () => {
        const duration = parseFloat(durationSlider.value);
        const amp = parseFloat(ampSlider.value);
        
        whiteNoiseSamples = generateWhiteNoise(duration, amp, 44100);
        plotSignal(whiteNoiseSamples, 'whitePlot', '#00ff88');
        plotSpectrumComparison(whiteNoiseSamples, uploadedSamples7, 'whiteSpectrum', 44100);
        plotSpectrogramImage(whiteNoiseSamples, 'whiteSpectrogram', 44100, 'Белый шум');
        
        info.innerHTML = `🔊 Белый шум сгенерирован: ${duration} секунд<br>📊 Спектр равномерный (плоский) - энергия распределена по всем частотам<br>🟢 Зеленый спектр - белый шум, 🟡 Желтый - ваш файл (если загружен)`;
    };
    
    // Загрузка файла для сравнения
    document.getElementById('loadWav7').onclick = async () => {
        const fileInput = document.getElementById('uploadWav7');
        if (!fileInput.files[0]) {
            info.innerHTML = '⚠️ Выберите аудиофайл!';
            return;
        }
        
        initAudio();
        info.innerHTML = '⏳ Загрузка файла...';
        
        try {
            const data = await loadAudioFile(fileInput.files[0]);
            uploadedSamples7 = data.samples;
            uploadedRate7 = data.rate;
            
            plotSpectrogramImage(uploadedSamples7, 'whiteSpectrogram', uploadedRate7, 'Ваш файл');
            
            if (whiteNoiseSamples) {
                plotSpectrumComparison(whiteNoiseSamples, uploadedSamples7, 'whiteSpectrum', 44100);
            }
            info.innerHTML = `✅ Файл "${data.name}" загружен!<br>📊 Длительность: ${data.duration.toFixed(2)} сек<br>🟢 Зеленый спектр - белый шум, 🟡 Желтый - ваш файл<br>🎨 Спектрограмма показывает частотно-временную структуру вашего файла`;
        } catch (err) {
            info.innerHTML = `❌ Ошибка: ${err.message}`;
        }
    };
    
    // Прослушивание белого шума
    document.getElementById('playWhite').onclick = () => {
        if (whiteNoiseSamples) {
            playSignal(whiteNoiseSamples, 44100);
            info.innerHTML += `<br>🎵 Воспроизведение белого шума...`;
        } else {
            info.innerHTML = '⚠️ Сначала сгенерируйте белый шум!';
        }
    };
    
    // Прослушивание загруженного файла
    document.getElementById('playUploaded7').onclick = () => {
        if (uploadedSamples7) {
            playSignal(uploadedSamples7, uploadedRate7);
            info.innerHTML += `<br>🎵 Воспроизведение загруженного файла...`;
        } else {
            info.innerHTML = '⚠️ Сначала загрузите файл!';
        }
    };
    
    document.getElementById('stopWhite').onclick = () => {
        if (currentSource) {
            currentSource.stop();
            currentSource = null;
            info.innerHTML += `<br>⏹️ Остановлено`;
        }
    };
    
    // Инициализация
    whiteNoiseSamples = generateWhiteNoise(2, 0.8, 44100);
    plotSignal(whiteNoiseSamples, 'whitePlot', '#00ff88');
    plotSpectrumComparison(whiteNoiseSamples, null, 'whiteSpectrum', 44100);
    plotSpectrogramImage(whiteNoiseSamples, 'whiteSpectrogram', 44100, 'Белый шум');
    info.innerHTML = '🔊 Белый шум. Спектр равномерный (плоский). Загрузите свой файл для сравнения';
});
