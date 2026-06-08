// ПЗ №7: Белый шум
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
    
    // Средняя линия
    let avgSpec = 0;
    for (let i = 100; i < spectrum.length && i < 500; i++) avgSpec += spectrum[i];
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
    const durationSlider = document.getElementById('duration7');
    const ampSlider = document.getElementById('amp7');
    const info = document.getElementById('info7');
    
    document.getElementById('duration7Val').textContent = durationSlider.value;
    document.getElementById('amp7Val').textContent = ampSlider.value;
    
    durationSlider.oninput = () => document.getElementById('duration7Val').textContent = durationSlider.value;
    ampSlider.oninput = () => document.getElementById('amp7Val').textContent = ampSlider.value;
    
    document.getElementById('genWhiteNoise').onclick = () => {
        const duration = parseFloat(durationSlider.value);
        const amp = parseFloat(ampSlider.value);
        
        currentSamples = generateWhiteNoise(duration, amp, 44100);
        plotSignal(currentSamples, 'whitePlot', '#00ff88');
        plotSpectrum(currentSamples, 'whiteSpectrum', 44100);
        
        info.innerHTML = `🔊 Белый шум: ${duration} секунд<br>📊 Спектр равномерный (плоский) - энергия распределена по всем частотам<br>Красная пунктирная линия - средний уровень спектра`;
    };
    
    document.getElementById('playWhite').onclick = () => {
        if (currentSamples) {
            playSignal(currentSamples, 44100);
            info.innerHTML += `<br>🎵 Воспроизведение...`;
        } else {
            info.innerHTML = '⚠️ Сначала сгенерируйте сигнал!';
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
    currentSamples = generateWhiteNoise(2, 0.8, 44100);
    plotSignal(currentSamples, 'whitePlot', '#00ff88');
    plotSpectrum(currentSamples, 'whiteSpectrum', 44100);
    info.innerHTML = '🔊 Белый шум. Спектр равномерный (плоский)';
});
