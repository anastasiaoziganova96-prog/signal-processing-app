// ПЗ №1: Синусоидальные сигналы
let audioContext = null;
let currentSource = null;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

// Генерация сигнала
function generateSignal(type, freq, amp, duration = 0.5, sampleRate = 44100) {
    const samples = [];
    const dt = 1 / sampleRate;
    const numSamples = duration * sampleRate;
    
    for (let i = 0; i < numSamples; i++) {
        const t = i * dt;
        let value = 0;
        if (type === 'sine') {
            value = amp * Math.sin(2 * Math.PI * freq * t);
        } else if (type === 'cosine') {
            value = amp * Math.cos(2 * Math.PI * freq * t);
        } else if (type === 'sum') {
            value = amp * (Math.sin(2 * Math.PI * freq * t) + Math.cos(2 * Math.PI * freq * t)) / 2;
        }
        samples.push(value);
    }
    return { samples, sampleRate };
}

// Построение графика
function plotSignal(samples, sampleRate, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Показываем первые 500 отсчетов
    const displaySamples = samples.slice(0, 500);
    const step = displaySamples.length / width;
    
    ctx.clearRect(0, 0, width, height);
    
    // Рисуем сетку
    ctx.strokeStyle = '#f0c0d0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
        const y = height / 2 + (i - 2) * height / 4;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    // Рисуем сигнал
    ctx.beginPath();
    ctx.strokeStyle = '#d4728a';
    ctx.lineWidth = 1.5;
    
    let first = true;
    for (let x = 0; x < width; x++) {
        const idx = Math.floor(x * step);
        if (idx < displaySamples.length) {
            const y = height / 2 - displaySamples[idx] * height / 2;
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

// Вычисление спектра (БПФ)
function computeSpectrum(samples, sampleRate) {
    const n = samples.length;
    const spectrum = new Array(n/2);
    const freqs = new Array(n/2);
    
    // Простое БПФ через комплексные числа
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

// Построение спектра
function plotSpectrum(freqs, spectrum, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Показываем частоты до 5000 Гц
    const maxFreq = 5000;
    const step = freqs.length / maxFreq;
    
    ctx.clearRect(0, 0, width, height);
    
    ctx.beginPath();
    ctx.strokeStyle = '#e8a0b5';
    ctx.fillStyle = '#ffe0e8';
    ctx.lineWidth = 1;
    
    for (let x = 0; x < width; x++) {
        const freqIdx = Math.floor(x * maxFreq / width);
        if (freqIdx < spectrum.length) {
            const y = height - spectrum[freqIdx] * height * 2;
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
        currentSource.stop();
    }
    
    const buffer = audioContext.createBuffer(1, samples.length, sampleRate);
    buffer.copyToChannel(new Float32Array(samples), 0);
    
    currentSource = audioContext.createBufferSource();
    currentSource.buffer = buffer;
    currentSource.connect(audioContext.destination);
    currentSource.start();
}

// Обработчики событий
document.addEventListener('DOMContentLoaded', () => {
    const freqSlider = document.getElementById('freq');
    const ampSlider = document.getElementById('amp');
    const freqValue = document.getElementById('freqValue');
    const ampValue = document.getElementById('ampValue');
    
    freqSlider.addEventListener('input', () => {
        freqValue.textContent = freqSlider.value;
    });
    
    ampSlider.addEventListener('input', () => {
        ampValue.textContent = ampSlider.value;
    });
    
    let currentSamples = null;
    let currentSampleRate = 44100;
    
    document.getElementById('genSine').addEventListener('click', () => {
        const result = generateSignal('sine', parseFloat(freqSlider.value), parseFloat(ampSlider.value));
        currentSamples = result.samples;
        plotSignal(currentSamples, 44100, 'signalPlot');
    });
    
    document.getElementById('genCosine').addEventListener('click', () => {
        const result = generateSignal('cosine', parseFloat(freqSlider.value), parseFloat(ampSlider.value));
        currentSamples = result.samples;
        plotSignal(currentSamples, 44100, 'signalPlot');
    });
    
    document.getElementById('genSum').addEventListener('click', () => {
        const result = generateSignal('sum', parseFloat(freqSlider.value), parseFloat(ampSlider.value));
        currentSamples = result.samples;
        plotSignal(currentSamples, 44100, 'signalPlot');
    });
    
    document.getElementById('calcSpectrum').addEventListener('click', () => {
        if (currentSamples) {
            const { freqs, spectrum } = computeSpectrum(currentSamples, 44100);
            plotSpectrum(freqs, spectrum, 'spectrumPlot');
        }
    });
    
    document.getElementById('playSignal').addEventListener('click', () => {
        if (currentSamples) {
            playSignal(currentSamples, 44100);
        }
    });
    
    document.getElementById('stopSignal').addEventListener('click', () => {
        if (currentSource) {
            currentSource.stop();
            currentSource = null;
        }
    });
    
    // Инициализация
    const initResult = generateSignal('sine', 440, 1);
    currentSamples = initResult.samples;
    plotSignal(currentSamples, 44100, 'signalPlot');
});
