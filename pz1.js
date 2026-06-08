// ПЗ №1: Синусоидальные сигналы
let audioContext = null;
let currentSource = null;
let currentSamples = null;
let currentType = 'sine';

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

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
    return samples;
}

function plotSignal(samples, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const displaySamples = samples.slice(0, 800);
    const step = displaySamples.length / width;
    
    // Черный фон
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    
    // Сетка
    ctx.strokeStyle = '#444455';
    ctx.lineWidth = 0.5;
    for (let i = -2; i <= 2; i++) {
        const y = height / 2 + i * height / 4;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    // Нулевая линия
    ctx.beginPath();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    
    // Сигнал (зеленый)
    ctx.beginPath();
    ctx.strokeStyle = '#00ff88';
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

function computeSpectrum(samples, sampleRate) {
    const n = Math.min(samples.length, 8192);
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

function plotSpectrum(samples, canvasId, sampleRate) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const { freqs, spectrum } = computeSpectrum(samples, sampleRate);
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const maxFreq = Math.min(5000, freqs[freqs.length-1]);
    
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    
    // Заливка под графиком
    ctx.beginPath();
    ctx.fillStyle = '#00ff8833';
    
    for (let x = 0; x < width; x++) {
        const freq = (x / width) * maxFreq;
        let idx = 0;
        for (let i = 0; i < freqs.length && freqs[i] <= freq; i++) idx = i;
        if (idx < spectrum.length) {
            const y = height - spectrum[idx] * height * 2;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.fill();
    
    // Линия спектра (желтая)
    ctx.beginPath();
    ctx.strokeStyle = '#ffaa44';
    ctx.lineWidth = 1.5;
    
    for (let x = 0; x < width; x++) {
        const freq = (x / width) * maxFreq;
        let idx = 0;
        for (let i = 0; i < freqs.length && freqs[i] <= freq; i++) idx = i;
        if (idx < spectrum.length) {
            const y = height - spectrum[idx] * height * 2;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
}

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
    const freqSlider = document.getElementById('freq');
    const ampSlider = document.getElementById('amp');
    const freqValue = document.getElementById('freqValue');
    const ampValue = document.getElementById('ampValue');
    const info = document.getElementById('info1');
    
    freqSlider.addEventListener('input', () => {
        freqValue.textContent = freqSlider.value;
    });
    
    ampSlider.addEventListener('input', () => {
        ampValue.textContent = ampSlider.value;
    });
    
    document.getElementById('genSine').addEventListener('click', () => {
        const freq = parseFloat(freqSlider.value);
        const amp = parseFloat(ampSlider.value);
        currentSamples = generateSignal('sine', freq, amp);
        plotSignal(currentSamples, 'signalPlot');
        info.innerHTML = `✅ Синусоидальный сигнал: ${freq} Гц, амплитуда ${amp}`;
    });
    
    document.getElementById('genCosine').addEventListener('click', () => {
        const freq = parseFloat(freqSlider.value);
        const amp = parseFloat(ampSlider.value);
        currentSamples = generateSignal('cosine', freq, amp);
        plotSignal(currentSamples, 'signalPlot');
        info.innerHTML = `✅ Косинусоидальный сигнал: ${freq} Гц, амплитуда ${amp}`;
    });
    
    document.getElementById('genSum').addEventListener('click', () => {
        const freq = parseFloat(freqSlider.value);
        const amp = parseFloat(ampSlider.value);
        currentSamples = generateSignal('sum', freq, amp);
        plotSignal(currentSamples, 'signalPlot');
        info.innerHTML = `✅ Сумма синуса и косинуса: ${freq} Гц, амплитуда ${amp}`;
    });
    
    document.getElementById('calcSpectrum').addEventListener('click', () => {
        if (currentSamples) {
            plotSpectrum(currentSamples, 'spectrumPlot', 44100);
            info.innerHTML += `<br>📊 Спектр построен. Виден пик на частоте ${freqSlider.value} Гц`;
        } else {
            info.innerHTML = '⚠️ Сначала сгенерируйте сигнал!';
        }
    });
    
    document.getElementById('playSignal').addEventListener('click', () => {
        if (currentSamples) {
            playSignal(currentSamples, 44100);
            info.innerHTML += `<br>🎵 Воспроизведение...`;
        } else {
            info.innerHTML = '⚠️ Нет сигнала для воспроизведения!';
        }
    });
    
    document.getElementById('stopSignal').addEventListener('click', () => {
        if (currentSource) {
            currentSource.stop();
            currentSource = null;
            info.innerHTML += `<br>⏹️ Воспроизведение остановлено`;
        }
    });
    
    // Инициализация
    currentSamples = generateSignal('sine', 440, 1);
    plotSignal(currentSamples, 'signalPlot');
    setTimeout(() => plotSpectrum(currentSamples, 'spectrumPlot', 44100), 100);
    info.innerHTML = '⚡ Готово! Синус 440 Гц. Нажимайте кнопки для генерации сигналов';
});
