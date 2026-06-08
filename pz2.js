// ПЗ №2: Нормализация, аподизация, low-pass фильтр
let audioContext = null;
let currentSource = null;
let currentSamples = null;
let processedSamples = null;
const SAMPLE_RATE = 44100;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

// Генерация суммы двух синусоид
function generateSignal(freq1, freq2, amp1, amp2, duration = 0.5) {
    const samples = [];
    const dt = 1 / SAMPLE_RATE;
    const numSamples = duration * SAMPLE_RATE;
    
    for (let i = 0; i < numSamples; i++) {
        const t = i * dt;
        const value = amp1 * Math.sin(2 * Math.PI * freq1 * t) + 
                      amp2 * Math.sin(2 * Math.PI * freq2 * t);
        samples.push(value);
    }
    return samples;
}

// Нормализация (масштабирование до [-1, 1])
function normalize(samples) {
    const maxAmp = Math.max(...samples.map(Math.abs));
    if (maxAmp === 0) return samples;
    return samples.map(s => s / maxAmp);
}

// Аподизация (окно Хэмминга)
function apodize(samples) {
    const n = samples.length;
    const result = new Array(n);
    for (let i = 0; i < n; i++) {
        const window = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (n - 1));
        result[i] = samples[i] * window;
    }
    return result;
}

// Low-pass фильтр (простой БИХ-фильтр)
function lowPassFilter(samples, cutoffFreq, sampleRate) {
    const dt = 1 / sampleRate;
    const RC = 1 / (2 * Math.PI * cutoffFreq);
    const alpha = dt / (RC + dt);
    
    const filtered = new Array(samples.length);
    filtered[0] = samples[0];
    
    for (let i = 1; i < samples.length; i++) {
        filtered[i] = filtered[i-1] + alpha * (samples[i] - filtered[i-1]);
    }
    return filtered;
}

// Вычисление спектра (БПФ)
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
function plotSignal(samples, canvasId, color = '#d4728a') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const displaySamples = samples.slice(0, 800);
    const step = displaySamples.length / width;
    
    ctx.clearRect(0, 0, width, height);
    
    // Сетка
    ctx.strokeStyle = '#f0c0d0';
    ctx.lineWidth = 0.5;
    for (let i = -2; i <= 2; i++) {
        const y = height / 2 - i * height / 4;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    // Сигнал
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    
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

// Построение спектра
function plotSpectrum(samples, canvasId, sampleRate, title) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const { freqs, spectrum } = computeSpectrum(samples, sampleRate);
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const maxFreq = 3000;
    ctx.clearRect(0, 0, width, height);
    
    // Заливка
    ctx.beginPath();
    ctx.fillStyle = '#ffe0e8';
    
    for (let x = 0; x < width; x++) {
        const freq = (x / width) * maxFreq;
        let idx = 0;
        for (let i = 0; i < freqs.length && freqs[i] <= freq; i++) idx = i;
        if (idx < spectrum.length) {
            const y = height - spectrum[idx] * height * 1.5;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.fill();
    
    // Линия спектра
    ctx.beginPath();
    ctx.strokeStyle = '#e8a0b5';
    ctx.lineWidth = 1.5;
    
    for (let x = 0; x < width; x++) {
        const freq = (x / width) * maxFreq;
        let idx = 0;
        for (let i = 0; i < freqs.length && freqs[i] <= freq; i++) idx = i;
        if (idx < spectrum.length) {
            const y = height - spectrum[idx] * height * 1.5;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
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

// Обновление информации
function updateInfo(text) {
    const infoDiv = document.getElementById('info');
    infoDiv.innerHTML = text;
}

document.addEventListener('DOMContentLoaded', () => {
    // Слайдеры
    const freq1 = document.getElementById('freq1');
    const freq2 = document.getElementById('freq2');
    const amp1 = document.getElementById('amp1');
    const amp2 = document.getElementById('amp2');
    const cutoff = document.getElementById('cutoff');
    
    document.getElementById('freq1Val').textContent = freq1.value;
    document.getElementById('freq2Val').textContent = freq2.value;
    document.getElementById('amp1Val').textContent = amp1.value;
    document.getElementById('amp2Val').textContent = amp2.value;
    document.getElementById('cutoffVal').textContent = cutoff.value;
    
    freq1.oninput = () => document.getElementById('freq1Val').textContent = freq1.value;
    freq2.oninput = () => document.getElementById('freq2Val').textContent = freq2.value;
    amp1.oninput = () => document.getElementById('amp1Val').textContent = amp1.value;
    amp2.oninput = () => document.getElementById('amp2Val').textContent = amp2.value;
    cutoff.oninput = () => document.getElementById('cutoffVal').textContent = cutoff.value;
    
    // Генерация
    document.getElementById('genSignal').onclick = () => {
        currentSamples = generateSignal(
            parseFloat(freq1.value), parseFloat(freq2.value),
            parseFloat(amp1.value), parseFloat(amp2.value)
        );
        processedSamples = [...currentSamples];
        plotSignal(currentSamples, 'signalPlot');
        plotSpectrum(currentSamples, 'spectrumPlot', SAMPLE_RATE);
        updateInfo(`✅ Сигнал сгенерирован: ${freq1.value} Гц + ${freq2.value} Гц`);
    };
    
    // Нормализация
    document.getElementById('applyNormalize').onclick = () => {
        if (!currentSamples) {
            updateInfo('⚠️ Сначала сгенерируйте сигнал!');
            return;
        }
        processedSamples = normalize(currentSamples);
        plotSignal(processedSamples, 'signalPlot', '#a0d4a0');
        plotSpectrum(processedSamples, 'spectrumPlot', SAMPLE_RATE);
        updateInfo('📊 Применена нормализация: амплитуда масштабирована до 1.0');
    };
    
    // Аподизация
    document.getElementById('applyApodize').onclick = () => {
        if (!currentSamples) {
            updateInfo('⚠️ Сначала сгенерируйте сигнал!');
            return;
        }
        processedSamples = apodize(currentSamples);
        plotSignal(processedSamples, 'signalPlot', '#c0a0d4');
        plotSpectrum(processedSamples, 'spectrumPlot', SAMPLE_RATE);
        updateInfo('📉 Применена аподизация (окно Хэмминга): края сигнала сглажены');
    };
    
    // Low-pass фильтр
    document.getElementById('applyLowpass').onclick = () => {
        if (!currentSamples) {
            updateInfo('⚠️ Сначала сгенерируйте сигнал!');
            return;
        }
        const cutoffFreq = parseFloat(cutoff.value);
        processedSamples = lowPassFilter(currentSamples, cutoffFreq, SAMPLE_RATE);
        plotSignal(processedSamples, 'signalPlot', '#d4a0a0');
        plotSpectrum(processedSamples, 'spectrumPlot', SAMPLE_RATE);
        updateInfo(`🔽 Применён low-pass фильтр (частота среза = ${cutoffFreq} Гц)<br>Высокие частоты подавлены`);
    };
    
    // Прослушивание
    document.getElementById('playOriginal').onclick = () => {
        if (currentSamples) playSignal(currentSamples, SAMPLE_RATE);
        else updateInfo('⚠️ Нет сигнала для воспроизведения');
    };
    
    document.getElementById('playProcessed').onclick = () => {
        if (processedSamples) playSignal(processedSamples, SAMPLE_RATE);
        else updateInfo('⚠️ Нет обработанного сигнала');
    };
    
    document.getElementById('stopAudio').onclick = () => {
        if (currentSource) {
            currentSource.stop();
            currentSource = null;
        }
    };
    
    // Инициализация
    currentSamples = generateSignal(440, 880, 1.0, 0.7);
    processedSamples = [...currentSamples];
    plotSignal(currentSamples, 'signalPlot');
    plotSpectrum(currentSamples, 'spectrumPlot', SAMPLE_RATE);
    updateInfo('🎵 Готово! Нажмите кнопки для обработки сигнала');
});
