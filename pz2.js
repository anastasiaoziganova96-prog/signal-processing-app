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

function normalize(samples) {
    const maxAmp = Math.max(...samples.map(Math.abs));
    if (maxAmp === 0) return samples;
    return samples.map(s => s / maxAmp);
}

function apodize(samples) {
    const n = samples.length;
    const result = new Array(n);
    for (let i = 0; i < n; i++) {
        const window = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (n - 1));
        result[i] = samples[i] * window;
    }
    return result;
}

function lowPassFilter(samples, cutoffFreq) {
    const dt = 1 / SAMPLE_RATE;
    const RC = 1 / (2 * Math.PI * cutoffFreq);
    const alpha = dt / (RC + dt);
    
    const filtered = new Array(samples.length);
    filtered[0] = samples[0];
    
    for (let i = 1; i < samples.length; i++) {
        filtered[i] = filtered[i-1] + alpha * (samples[i] - filtered[i-1]);
    }
    return filtered;
}

function computeSpectrum(samples) {
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
        freqs[k] = k * SAMPLE_RATE / n;
    }
    return { freqs, spectrum };
}

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

function plotSpectrum(samples, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const { freqs, spectrum } = computeSpectrum(samples);
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const maxFreq = Math.min(5000, freqs[freqs.length-1]);
    
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    
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
    const freq1 = document.getElementById('freq1');
    const freq2 = document.getElementById('freq2');
    const amp1 = document.getElementById('amp1');
    const amp2 = document.getElementById('amp2');
    const cutoff = document.getElementById('cutoff');
    const info = document.getElementById('info2');
    
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
    
    document.getElementById('genSignal').onclick = () => {
        currentSamples = generateSignal(
            parseFloat(freq1.value), parseFloat(freq2.value),
            parseFloat(amp1.value), parseFloat(amp2.value)
        );
        processedSamples = [...currentSamples];
        plotSignal(currentSamples, 'signalPlot', '#00ff88');
        plotSpectrum(currentSamples, 'spectrumPlot');
        info.innerHTML = `✅ Сигнал сгенерирован: ${freq1.value} Гц + ${freq2.value} Гц`;
    };
    
    document.getElementById('applyNormalize').onclick = () => {
        if (!currentSamples) {
            info.innerHTML = '⚠️ Сначала сгенерируйте сигнал!';
            return;
        }
        processedSamples = normalize(currentSamples);
        plotSignal(processedSamples, 'signalPlot', '#88ff88');
        plotSpectrum(processedSamples, 'spectrumPlot');
        info.innerHTML = '📊 Нормализация: амплитуда масштабирована до 1.0';
    };
    
    document.getElementById('applyApodize').onclick = () => {
        if (!currentSamples) {
            info.innerHTML = '⚠️ Сначала сгенерируйте сигнал!';
            return;
        }
        processedSamples = apodize(currentSamples);
        plotSignal(processedSamples, 'signalPlot', '#ff88ff');
        plotSpectrum(processedSamples, 'spectrumPlot');
        info.innerHTML = '📉 Аподизация: края сигнала сглажены окном Хэмминга';
    };
    
    document.getElementById('applyLowpass').onclick = () => {
        if (!currentSamples) {
            info.innerHTML = '⚠️ Сначала сгенерируйте сигнал!';
            return;
        }
        const cutoffFreq = parseFloat(cutoff.value);
        processedSamples = lowPassFilter(currentSamples, cutoffFreq);
        plotSignal(processedSamples, 'signalPlot', '#ff8888');
        plotSpectrum(processedSamples, 'spectrumPlot');
        info.innerHTML = `🔽 Low-pass фильтр: частота среза ${cutoffFreq} Гц`;
    };
    
    document.getElementById('playOriginal').onclick = () => {
        if (currentSamples) {
            playSignal(currentSamples, SAMPLE_RATE);
            info.innerHTML += `<br>🎵 Воспроизведение исходного сигнала`;
        } else {
            info.innerHTML = '⚠️ Нет сигнала!';
        }
    };
    
    document.getElementById('playProcessed').onclick = () => {
        if (processedSamples) {
            playSignal(processedSamples, SAMPLE_RATE);
            info.innerHTML += `<br>🎵 Воспроизведение обработанного сигнала`;
        } else {
            info.innerHTML = '⚠️ Нет обработанного сигнала!';
        }
    };
    
    document.getElementById('stopAudio').onclick = () => {
        if (currentSource) {
            currentSource.stop();
            currentSource = null;
            info.innerHTML += `<br>⏹️ Остановлено`;
        }
    };
    
    // Инициализация
    currentSamples = generateSignal(440, 880, 1.0, 0.7);
    processedSamples = [...currentSamples];
    plotSignal(currentSamples, 'signalPlot', '#00ff88');
    plotSpectrum(currentSamples, 'spectrumPlot');
    info.innerHTML = '⚡ Готово! Сигнал 440+880 Гц. Применяйте обработку';
});
