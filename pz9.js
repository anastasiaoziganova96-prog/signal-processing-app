// ПЗ №9: Розовый шум (1/f)
let audioContext = null;
let currentSource = null;
let currentSamples = null;
let whiteSamples = null;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

// Генерация белого шума
function generateWhiteNoise(duration, sampleRate = 44100) {
    const numSamples = duration * sampleRate;
    const samples = new Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        samples[i] = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }
    const maxAmp = Math.max(...samples.map(Math.abs));
    if (maxAmp > 0) {
        for (let i = 0; i < samples.length; i++) samples[i] = samples[i] / maxAmp;
    }
    return samples;
}

// Генерация розового шума (метод Voss-McCartney)
function generatePinkNoise(duration, sampleRate = 44100) {
    const numSamples = Math.floor(duration * sampleRate);
    const numOctaves = 12;
    const pinkNoise = new Array(numSamples).fill(0);
    
    for (let octave = 0; octave < numOctaves; octave++) {
        const stride = Math.max(1, Math.floor(sampleRate / Math.pow(2, octave)));
        const numValues = Math.ceil(numSamples / stride);
        const values = new Array(numValues);
        
        for (let i = 0; i < numValues; i++) {
            values[i] = (Math.random() * 2 - 1);
        }
        
        for (let i = 0; i < numSamples; i++) {
            const idx = Math.floor(i / stride);
            pinkNoise[i] += values[idx] / Math.sqrt(Math.pow(2, octave));
        }
    }
    
    // Нормализация
    const maxAmp = Math.max(...pinkNoise.map(Math.abs));
    if (maxAmp > 0) {
        for (let i = 0; i < pinkNoise.length; i++) {
            pinkNoise[i] = pinkNoise[i] / maxAmp;
        }
    }
    
    return pinkNoise;
}

// Вычисление спектра
function computeSpectrum(samples, sampleRate) {
    const n = samples.length;
    const spectrum = new Array(Math.floor(n/2));
    const freqs = new Array(Math.floor(n/2));
    
    for (let k = 1; k < n/2; k++) {
        let real = 0, imag = 0;
        for (let i = 0; i < n; i++) {
            const angle = -2 * Math.PI * k * i / n;
            real += samples[i] * Math.cos(angle);
            imag += samples[i] * Math.sin(angle);
        }
        spectrum[k] = Math.sqrt(real*real + imag*imag) / n;
        freqs[k] = k * sampleRate / n;
    }
    freqs[0] = 0;
    spectrum[0] = 0;
    return { freqs, spectrum };
}

// Построение графика сигнала
function plotSignal(samples, canvasId, color = '#FF69B4') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const displaySamples = samples.slice(0, 800);
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
    ctx.lineWidth = 1;
    
    let first = true;
    for (let x = 0; x < width; x++) {
        const idx = Math.floor(x * step);
        if (idx < displaySamples.length) {
            let y = height / 2 - displaySamples[idx] * height / 2;
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

// Построение спектра с логарифмическим масштабом и сравнением
function plotSpectrumComparison(pinkSamples, whiteSamples, canvasId, sampleRate) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const { freqs, spectrum: pinkSpec } = computeSpectrum(pinkSamples, sampleRate);
    const { spectrum: whiteSpec } = computeSpectrum(whiteSamples, sampleRate);
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const maxFreq = Math.min(8000, freqs[freqs.length-1]);
    ctx.clearRect(0, 0, width, height);
    
    // Теоретическая линия 1/f
    ctx.beginPath();
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    for (let x = 10; x < width; x++) {
        const freq = (x / width) * maxFreq;
        if (freq > 20) {
            const theoretical = 100 / freq;
            const y = height - Math.min(1, theoretical) * height;
            if (x === 10) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Белый шум (плоский)
    ctx.beginPath();
    ctx.strokeStyle = '#aaaaaa';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x++) {
        const freq = (x / width) * maxFreq;
        let idx = Math.floor(freq / maxFreq * whiteSpec.length);
        idx = Math.min(idx, whiteSpec.length - 1);
        if (idx > 10 && idx < whiteSpec.length) {
            const y = height - whiteSpec[idx] * height * 2;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
    
    // Розовый шум (спадающий)
    ctx.beginPath();
    ctx.strokeStyle = '#FF69B4';
    ctx.lineWidth = 2;
    for (let x = 0; x < width; x++) {
        const freq = (x / width) * maxFreq;
        let idx = Math.floor(freq / maxFreq * pinkSpec.length);
        idx = Math.min(idx, pinkSpec.length - 1);
        if (idx > 10 && idx < pinkSpec.length) {
            const y = height - pinkSpec[idx] * height * 3;
            if (x === 0) ctx.moveTo(x, Math.min(height, Math.max(0, y)));
            else ctx.lineTo(x, Math.min(height, Math.max(0, y)));
        }
    }
    ctx.stroke();
    
    // Легенда
    ctx.font = '10px Arial';
    ctx.fillStyle = '#cccccc';
    ctx.fillText('~ 1/f (теория)', width - 120, 30);
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText('Белый шум (плоский)', width - 120, 50);
    ctx.fillStyle = '#FF69B4';
    ctx.fillText('Розовый шум (1/f)', width - 120, 70);
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
    const durationSlider = document.getElementById('duration9');
    document.getElementById('duration9Val').textContent = durationSlider.value;
    durationSlider.oninput = () => document.getElementById('duration9Val').textContent = durationSlider.value;
    
    const info = document.getElementById('info9');
    let whiteNoise = null;
    
    document.getElementById('genPinkNoise').onclick = () => {
        const duration = parseFloat(durationSlider.value);
        currentSamples = generatePinkNoise(duration, 44100);
        whiteNoise = generateWhiteNoise(duration, 44100);
        
        plotSignal(currentSamples, 'pinkPlot', '#FF69B4');
        plotSpectrumComparison(currentSamples, whiteNoise, 'pinkSpectrum', 44100);
        
        info.innerHTML = `🩷 Розовый шум: ${duration} секунд<br>📊 Спектр спадает как 1/f (наклон -3 дБ/октаву)<br>🎵 Звучит более "тепло", чем белый шум`;
    };
    
    document.getElementById('comparePinkWhite').onclick = () => {
        if (!currentSamples || !whiteNoise) {
            info.innerHTML = '⚠️ Сначала сгенерируйте розовый шум!';
            return;
        }
        plotSpectrumComparison(currentSamples, whiteNoise, 'pinkSpectrum', 44100);
        info.innerHTML = '📊 Сравнение: розовый шум (розовый) спадает как 1/f, белый шум (серый) - плоский';
    };
    
    document.getElementById('playPink').onclick = () => {
        if (currentSamples) playSignal(currentSamples, 44100);
        else info.innerHTML = '⚠️ Сначала сгенерируйте сигнал!';
    };
    
    document.getElementById('playWhiteCompare').onclick = () => {
        if (whiteNoise) playSignal(whiteNoise, 44100);
        else info.innerHTML = '⚠️ Сначала сгенерируйте розовый шум (белый создастся автоматически)!';
    };
    
    document.getElementById('stopPink').onclick = () => {
        if (currentSource) {
            currentSource.stop();
            currentSource = null;
        }
    };
    
    // Инициализация
    currentSamples = generatePinkNoise(2, 44100);
    whiteNoise = generateWhiteNoise(2, 44100);
    plotSignal(currentSamples, 'pinkPlot', '#FF69B4');
    plotSpectrumComparison(currentSamples, whiteNoise, 'pinkSpectrum', 44100);
    info.innerHTML = 'Розовый шум. Пунктир - теоретический закон 1/f. Серый - белый шум для сравнения';
});
