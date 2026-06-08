// ПЗ №8: Броуновский шум
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

function generateBrownNoise(duration, sampleRate = 44100) {
    const numSamples = duration * sampleRate;
    const whiteNoise = new Array(numSamples);
    
    for (let i = 0; i < numSamples; i++) {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        whiteNoise[i] = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }
    
    const brownNoise = new Array(numSamples);
    brownNoise[0] = whiteNoise[0];
    for (let i = 1; i < numSamples; i++) {
        brownNoise[i] = brownNoise[i-1] + whiteNoise[i] * 0.01;
    }
    
    const maxAmp = Math.max(...brownNoise.map(Math.abs));
    if (maxAmp > 0) {
        for (let i = 0; i < brownNoise.length; i++) {
            brownNoise[i] = brownNoise[i] / maxAmp;
        }
    }
    return brownNoise;
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

function plotSignal(samples, canvasId, color = '#d4728a') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const displaySamples = samples.slice(0, 1000);
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
    ctx.lineWidth = 1.2;
    
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
    
    // Теоретическая линия 1/f²
    ctx.beginPath();
    ctx.strokeStyle = '#ff6666';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 6]);
    
    for (let x = 10; x < width; x++) {
        const freq = (x / width) * maxFreq;
        if (freq > 20) {
            const theoretical = 50000 / (freq * freq);
            const y = height - Math.min(1, theoretical) * height;
            if (x === 10) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Реальный спектр
    ctx.beginPath();
    ctx.strokeStyle = '#d4728a';
    ctx.lineWidth = 2;
    
    for (let x = 10; x < width; x++) {
        const freq = (x / width) * maxFreq;
        let idx = 0;
        for (let i = 0; i < freqs.length && freqs[i] <= freq; i++) idx = i;
        if (idx < spectrum.length && idx > 10) {
            let y = height - spectrum[idx] * height * 3;
            y = Math.max(0, Math.min(height, y));
            if (x === 10) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
    
    // Легенда
    ctx.font = '10px monospace';
    ctx.fillStyle = '#ff6666';
    ctx.fillText('~ 1/f² (теория)', width - 130, 30);
    ctx.fillStyle = '#d4728a';
    ctx.fillText('Реальный спектр', width - 130, 50);
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
    const durationSlider = document.getElementById('duration8');
    const info = document.getElementById('info8');
    
    document.getElementById('duration8Val').textContent = durationSlider.value;
    durationSlider.oninput = () => document.getElementById('duration8Val').textContent = durationSlider.value;
    
    document.getElementById('genBrownNoise').onclick = () => {
        const duration = parseFloat(durationSlider.value);
        currentSamples = generateBrownNoise(duration, 44100);
        plotSignal(currentSamples, 'brownPlot', '#d4728a');
        plotSpectrum(currentSamples, 'brownSpectrum', 44100);
        
        info.innerHTML = `🌊 Броуновский шум: ${duration} секунд<br>📊 Спектр спадает как 1/f² (наклон -6 дБ/октаву)<br>Красная линия - теоретический закон, розовая - реальный спектр`;
    };
    
    document.getElementById('playBrown').onclick = () => {
        if (currentSamples) {
            playSignal(currentSamples, 44100);
            info.innerHTML += `<br>🎵 Воспроизведение...`;
        } else {
            info.innerHTML = '⚠️ Сначала сгенерируйте сигнал!';
        }
    };
    
    document.getElementById('stopBrown').onclick = () => {
        if (currentSource) {
            currentSource.stop();
            currentSource = null;
            info.innerHTML += `<br>⏹️ Остановлено`;
        }
    };
    
    // Инициализация
    currentSamples = generateBrownNoise(2, 44100);
    plotSignal(currentSamples, 'brownPlot', '#d4728a');
    plotSpectrum(currentSamples, 'brownSpectrum', 44100);
    info.innerHTML = '🌊 Броуновский шум. Пунктирная линия - теоретический закон 1/f²';
});
