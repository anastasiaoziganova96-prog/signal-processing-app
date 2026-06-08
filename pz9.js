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
    
    const maxAmp = Math.max(...pinkNoise.map(Math.abs));
    if (maxAmp > 0) {
        for (let i = 0; i < pinkNoise.length; i++) {
            pinkNoise[i] = pinkNoise[i] / maxAmp;
        }
    }
    return pinkNoise;
}

function computeSpectrum(samples, sampleRate) {
    const n = Math.min(samples.length, 8192);
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

function plotSignal(samples, canvasId, color = '#ff69b4') {
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

function plotSpectrumComparison(pinkSamples, whiteSamples, canvasId, sampleRate) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const { freqs, spectrum: pinkSpec } = computeSpectrum(pinkSamples, sampleRate);
    const { spectrum: whiteSpec } = computeSpectrum(whiteSamples, sampleRate);
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const maxFreq = Math.min(8000, freqs[freqs.length-1]);
    
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    
    // Теоретическая линия 1/f
    ctx.beginPath();
    ctx.strokeStyle = '#aaaaaa';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 6]);
    
    for (let x = 20; x < width; x++) {
        const freq = (x / width) * maxFreq;
        if (freq > 20) {
            const theoretical = 200 / freq;
            const y = height - Math.min(0.8, theoretical) * height;
            if (x === 20) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Белый шум (плоский)
    ctx.beginPath();
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 1.5;
    
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
    ctx.strokeStyle = '#ff69b4';
    ctx.lineWidth = 2;
    
    for (let x = 0; x < width; x++) {
        const freq = (x / width) * maxFreq;
        let idx = Math.floor(freq / maxFreq * pinkSpec.length);
        idx = Math.min(idx, pinkSpec.length - 1);
        if (idx > 10 && idx < pinkSpec.length) {
            let y = height - pinkSpec[idx] * height * 3;
            y = Math.max(0, Math.min(height, y));
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
    
    // Легенда
    ctx.font = '10px monospace';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText('~ 1/f (теория)', width - 130, 30);
    ctx.fillStyle = '#888888';
    ctx.fillText('Белый шум (плоский)', width - 130, 50);
    ctx.fillStyle = '#ff69b4';
    ctx.fillText('Розовый шум (1/f)', width - 130, 70);
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
    const durationSlider = document.getElementById('duration9');
    const info = document.getElementById('info9');
    
    document.getElementById('duration9Val').textContent = durationSlider.value;
    durationSlider.oninput = () => document.getElementById('duration9Val').textContent = durationSlider.value;
    
    document.getElementById('genPinkNoise').onclick = () => {
        const duration = parseFloat(durationSlider.value);
        currentSamples = generatePinkNoise(duration, 44100);
        whiteSamples = generateWhiteNoise(duration, 44100);
        
        plotSignal(currentSamples, 'pinkPlot', '#ff69b4');
        plotSpectrumComparison(currentSamples, whiteSamples, 'pinkSpectrum', 44100);
        
        info.innerHTML = `🩷 Розовый шум: ${duration} секунд<br>📊 Спектр спадает как 1/f (наклон -3 дБ/октаву)<br>Серый - белый шум (плоский), розовый - розовый шум (спадающий)`;
    };
    
    document.getElementById('comparePinkWhite').onclick = () => {
        if (!currentSamples || !whiteSamples) {
            info.innerHTML = '⚠️ Сначала сгенерируйте розовый шум!';
            return;
        }
        plotSpectrumComparison(currentSamples, whiteSamples, 'pinkSpectrum', 44100);
        info.innerHTML = '📊 Сравнение: розовый шум (розовый) спадает как 1/f, белый шум (серый) - плоский';
    };
    
    document.getElementById('playPink').onclick = () => {
        if (currentSamples) {
            playSignal(currentSamples, 44100);
            info.innerHTML += `<br>🎵 Воспроизведение розового шума...`;
        } else {
            info.innerHTML = '⚠️ Сначала сгенерируйте сигнал!';
        }
    };
    
    document.getElementById('playWhiteCompare').onclick = () => {
        if (whiteSamples) {
            playSignal(whiteSamples, 44100);
            info.innerHTML += `<br>🎵 Воспроизведение белого шума (для сравнения)...`;
        } else {
            info.innerHTML = '⚠️ Сначала сгенерируйте розовый шум!';
        }
    };
    
    document.getElementById('stopPink').onclick = () => {
        if (currentSource) {
            currentSource.stop();
            currentSource = null;
            info.innerHTML += `<br>⏹️ Остановлено`;
        }
    };
    
    // Инициализация
    currentSamples = generatePinkNoise(2, 44100);
    whiteSamples = generateWhiteNoise(2, 44100);
    plotSignal(currentSamples, 'pinkPlot', '#ff69b4');
    plotSpectrumComparison(currentSamples, whiteSamples, 'pinkSpectrum', 44100);
    info.innerHTML = '🩷 Розовый шум. Пунктир - теоретический закон 1/f. Серый - белый шум для сравнения';
});
