// ПЗ №11: Пуассоновский шум (счетчик Гейгера)
let audioContext = null;
let currentSource = null;
let currentSamples = null;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

// Генерация пуассоновского шума
function generatePoissonNoise(lambda, duration, sampleRate = 44100) {
    const numSamples = Math.floor(duration * sampleRate);
    const samples = new Array(numSamples).fill(0);
    
    // Пуассоновское распределение: вероятность события в каждом отсчёте
    const p = lambda; // вероятность события в одном отсчёте (для малых λ)
    
    if (lambda < 1) {
        // Режим редких событий - отдельные "щелчки"
        for (let i = 0; i < numSamples; i++) {
            if (Math.random() < p) {
                // Импульс (щелчок)
                samples[i] = 1;
                // Добавляем небольшой "хвост" для реалистичности
                if (i + 10 < numSamples) {
                    for (let j = 1; j < 5 && i+j < numSamples; j++) {
                        samples[i+j] += 0.5 / j;
                    }
                }
            }
        }
    } else {
        // Режим непрерывного шума - аппроксимация нормальным распределением
        for (let i = 0; i < numSamples; i++) {
            // Пуассоновское приближается к нормальному при больших λ
            let u = 0, v = 0;
            while (u === 0) u = Math.random();
            while (v === 0) v = Math.random();
            const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
            let val = lambda + Math.sqrt(lambda) * z;
            val = Math.max(0, val);
            samples[i] = (val - lambda) / lambda;
        }
    }
    
    // Нормализация
    const maxAmp = Math.max(...samples.map(Math.abs));
    if (maxAmp > 0 && maxAmp > 1) {
        for (let i = 0; i < samples.length; i++) {
            samples[i] = samples[i] / maxAmp;
        }
    }
    
    return samples;
}

// Вычисление спектра
function computeSpectrum(samples, sampleRate) {
    const n = samples.length;
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

// Построение графика сигнала
function plotSignal(samples, canvasId, color = '#9370DB') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const displaySamples = samples.slice(0, 2000);
    const step = displaySamples.length / width;
    
    ctx.clearRect(0, 0, width, height);
    
    ctx.beginPath();
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 0.5;
    const zeroY = height / 2;
    ctx.moveTo(0, zeroY);
    ctx.lineTo(width, zeroY);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.8;
    
    let first = true;
    for (let x = 0; x < width; x++) {
        const idx = Math.floor(x * step);
        if (idx < displaySamples.length) {
            let y = height / 2 - displaySamples[idx] * height / 1.5;
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

// Построение гистограммы
function plotHistogram(samples, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const numBins = 30;
    const bins = new Array(numBins).fill(0);
    
    for (const s of samples) {
        let binIdx = Math.floor((s + 1) / 2 * numBins);
        binIdx = Math.max(0, Math.min(numBins - 1, binIdx));
        bins[binIdx]++;
    }
    
    const maxCount = Math.max(...bins);
    
    ctx.clearRect(0, 0, width, height);
    
    const barWidth = width / numBins;
    for (let i = 0; i < numBins; i++) {
        const barHeight = (bins[i] / maxCount) * height;
        ctx.fillStyle = '#9370DB';
        ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
    }
}

// Построение спектра
function plotSpectrum(samples, canvasId, sampleRate) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const { freqs, spectrum } = computeSpectrum(samples, sampleRate);
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const maxFreq = Math.min(8000, freqs[freqs.length-1]);
    ctx.clearRect(0, 0, width, height);
    
    ctx.beginPath();
    ctx.strokeStyle = '#9370DB';
    ctx.lineWidth = 1;
    
    for (let x = 0; x < width; x++) {
        const freq = (x / width) * maxFreq;
        let idx = Math.floor(freq / maxFreq * spectrum.length);
        idx = Math.min(idx, spectrum.length - 1);
        if (idx > 10) {
            const y = height - spectrum[idx] * height * 3;
            if (x === 0) ctx.moveTo(x, Math.min(height, Math.max(0, y)));
            else ctx.lineTo(x, Math.min(height, Math.max(0, y)));
        }
    }
    ctx.stroke();
}

// Прослушивание
function playSignal(samples, sampleRate) {
    initAudio();
    if (currentSource) {
        try { currentSource.stop(); } catch(e) {}
    }
    
    const buffer = audioContext.createBuffer(1, samples.length, sampleRate);
    buffer.copyToChannel(new Float32Array(samples), 0);
    
    currentSource = audioContext.createBufferSource();
    currentSource.buffer = buffer;
    currentSource.connect(audioContext.destination);
    currentSource.start();
}

document.addEventListener('DOMContentLoaded', () => {
    const lambdaSlider = document.getElementById('lambda');
    const durationSlider = document.getElementById('duration11');
    
    document.getElementById('lambdaVal').textContent = lambdaSlider.value;
    document.getElementById('duration11Val').textContent = durationSlider.value;
    
    lambdaSlider.oninput = () => document.getElementById('lambdaVal').textContent = parseFloat(lambdaSlider.value).toFixed(3);
    durationSlider.oninput = () => document.getElementById('duration11Val').textContent = durationSlider.value;
    
    const info = document.getElementById('info11');
    
    document.getElementById('genPoisson').onclick = () => {
        const lambda = parseFloat(lambdaSlider.value);
        const duration = parseFloat(durationSlider.value);
        
        currentSamples = generatePoissonNoise(lambda, duration, 22050); // Более низкая частота для лучшего звучания щелчков
        
        plotSignal(currentSamples, 'poissonPlot', '#9370DB');
        plotHistogram(currentSamples, 'poissonHistogram');
        plotSpectrum(currentSamples, 'poissonSpectrum', 22050);
        
        const clickCount = currentSamples.filter(s => Math.abs(s) > 0.5).length;
        const expectedClicks = lambda * 22050 * duration;
        
        if (lambda < 0.1) {
            info.innerHTML = `⚛️ Счётчик Гейгера: λ = ${lambda}<br>📊 Фактических щелчков: ${clickCount} (ожидается ~${expectedClicks.toFixed(0)})<br>🎵 Должны слышаться отдельные "щелчки"`;
        } else {
            info.innerHTML = `⚛️ Пуассоновский шум: λ = ${lambda} (режим непрерывного шума)<br>📊 Спектр плоский - это белый шум<br>🎵 Звучит как шипение (белый шум)`;
        }
    };
    
    document.getElementById('playPoisson').onclick = () => {
        if (currentSamples) playSignal(currentSamples, 22050);
        else info.innerHTML = '⚠️ Сначала сгенерируйте сигнал!';
    };
    
    document.getElementById('stopPoisson').onclick = () => {
        if (currentSource) {
            currentSource.stop();
            currentSource = null;
        }
    };
    
    // Инициализация
    currentSamples = generatePoissonNoise(0.01, 2, 22050);
    plotSignal(currentSamples, 'poissonPlot', '#9370DB');
    plotHistogram(currentSamples, 'poissonHistogram');
    plotSpectrum(currentSamples, 'poissonSpectrum', 22050);
    info.innerHTML = 'Пуассоновский шум с λ=0.01 - имитация счётчика Гейгера';
});
