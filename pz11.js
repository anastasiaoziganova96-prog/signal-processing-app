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

function generatePoissonNoise(lambda, duration, sampleRate = 22050) {
    const numSamples = Math.floor(duration * sampleRate);
    const samples = new Array(numSamples).fill(0);
    const p = lambda;
    
    if (lambda < 1) {
        for (let i = 0; i < numSamples; i++) {
            if (Math.random() < p) {
                samples[i] = 1;
                if (i + 10 < numSamples) {
                    for (let j = 1; j < 5 && i+j < numSamples; j++) {
                        samples[i+j] += 0.5 / j;
                    }
                }
            }
        }
    } else {
        for (let i = 0; i < numSamples; i++) {
            let u = 0, v = 0;
            while (u === 0) u = Math.random();
            while (v === 0) v = Math.random();
            const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
            let val = lambda + Math.sqrt(lambda) * z;
            val = Math.max(0, val);
            samples[i] = (val - lambda) / lambda;
        }
    }
    
    const maxAmp = Math.max(...samples.map(Math.abs));
    if (maxAmp > 0 && maxAmp > 1) {
        for (let i = 0; i < samples.length; i++) {
            samples[i] = samples[i] / maxAmp;
        }
    }
    return samples;
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

function plotSignal(samples, canvasId, color = '#9370DB') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const displaySamples = samples.slice(0, 2000);
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
    
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    
    const barWidth = width / numBins;
    for (let i = 0; i < numBins; i++) {
        const barHeight = (bins[i] / maxCount) * height;
        ctx.fillStyle = '#9370DB';
        ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
    }
}

function plotSpectrum(samples, canvasId, sampleRate) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const { freqs, spectrum } = computeSpectrum(samples, sampleRate);
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const maxFreq = Math.min(8000, freqs[freqs.length-1]);
    
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    
    ctx.beginPath();
    ctx.fillStyle = '#9370DB33';
    
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
    const lambdaSlider = document.getElementById('lambda');
    const durationSlider = document.getElementById('duration11');
    const info = document.getElementById('info11');
    
    document.getElementById('lambdaVal').textContent = lambdaSlider.value;
    document.getElementById('duration11Val').textContent = durationSlider.value;
    
    lambdaSlider.oninput = () => document.getElementById('lambdaVal').textContent = parseFloat(lambdaSlider.value).toFixed(3);
    durationSlider.oninput = () => document.getElementById('duration11Val').textContent = durationSlider.value;
    
    document.getElementById('genPoisson').onclick = () => {
        const lambda = parseFloat(lambdaSlider.value);
        const duration = parseFloat(durationSlider.value);
        
        currentSamples = generatePoissonNoise(lambda, duration, 22050);
        
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
        if (currentSamples) {
            playSignal(currentSamples, 22050);
            info.innerHTML += `<br>🎵 Воспроизведение...`;
        } else {
            info.innerHTML = '⚠️ Сначала сгенерируйте сигнал!';
        }
    };
    
    document.getElementById('stopPoisson').onclick = () => {
        if (currentSource) {
            currentSource.stop();
            currentSource = null;
            info.innerHTML += `<br>⏹️ Остановлено`;
        }
    };
    
    // Инициализация
    currentSamples = generatePoissonNoise(0.01, 2, 22050);
    plotSignal(currentSamples, 'poissonPlot', '#9370DB');
    plotHistogram(currentSamples, 'poissonHistogram');
    plotSpectrum(currentSamples, 'poissonSpectrum', 22050);
    info.innerHTML = '⚛️ Пуассоновский шум с λ=0.01 - имитация счётчика Гейгера';
});
