// ПЗ №5: Пилообразный сигнал (Sawtooth)
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

function generateSawtooth(freq, amp, width = 1, duration = 0.5, sampleRate = 44100) {
    const samples = [];
    const dt = 1 / sampleRate;
    const numSamples = duration * sampleRate;
    
    for (let i = 0; i < numSamples; i++) {
        const t = i * dt;
        let value = 2 * ((freq * t) % 1);
        if (value > 1) value = 2 - value;
        value = value * 2 - 1;
        
        if (width < 1) {
            const phase = (freq * t) % 1;
            if (phase < width) {
                value = 2 * (phase / width) - 1;
            } else {
                value = 1 - 2 * ((phase - width) / (1 - width));
            }
        }
        
        samples.push(amp * value);
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
    
    const displaySamples = samples.slice(0, 400);
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

function plotSpectrum(samples, canvasId, sampleRate) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const { freqs, spectrum } = computeSpectrum(samples, sampleRate);
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const maxFreq = 8000;
    
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    
    const barWidth = 2;
    for (let x = 0; x < width; x += barWidth + 1) {
        const freq = (x / width) * maxFreq;
        let idx = 0;
        for (let i = 0; i < freqs.length && freqs[i] <= freq; i++) idx = i;
        if (idx < spectrum.length && spectrum[idx] > 0.01) {
            const barHeight = spectrum[idx] * height * 1.5;
            if (barHeight > 1) {
                ctx.fillStyle = '#ffaa44';
                ctx.fillRect(x, height - barHeight, barWidth, barHeight);
            }
        }
    }
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
    const freqSlider = document.getElementById('freq5');
    const ampSlider = document.getElementById('amp5');
    const widthSlider = document.getElementById('width5');
    const info = document.getElementById('info5');
    
    document.getElementById('freq5Val').textContent = freqSlider.value;
    document.getElementById('amp5Val').textContent = ampSlider.value;
    document.getElementById('width5Val').textContent = widthSlider.value;
    
    freqSlider.oninput = () => document.getElementById('freq5Val').textContent = freqSlider.value;
    ampSlider.oninput = () => document.getElementById('amp5Val').textContent = ampSlider.value;
    widthSlider.oninput = () => document.getElementById('width5Val').textContent = widthSlider.value;
    
    document.getElementById('genSawtooth').onclick = () => {
        const freq = parseFloat(freqSlider.value);
        const amp = parseFloat(ampSlider.value);
        const width = parseFloat(widthSlider.value);
        
        currentSamples = generateSawtooth(freq, amp, width, 0.5, 44100);
        plotSignal(currentSamples, 'sawtoothPlot', '#00ff88');
        plotSpectrum(currentSamples, 'sawtoothSpectrum', 44100);
        
        info.innerHTML = `🔺 Пилообразный сигнал: ${freq} Гц<br>Спектр содержит все гармоники: ${freq}, ${2*freq}, ${3*freq}... с амплитудой 1/n`;
        if (width < 1) {
            info.innerHTML += `<br>Ширина импульса: ${width} (изменяет форму сигнала)`;
        }
    };
    
    document.getElementById('playSawtooth').onclick = () => {
        if (currentSamples) {
            playSignal(currentSamples, 44100);
            info.innerHTML += `<br>🎵 Воспроизведение...`;
        } else {
            info.innerHTML = '⚠️ Сначала сгенерируйте сигнал!';
        }
    };
    
    document.getElementById('stopSawtooth').onclick = () => {
        if (currentSource) {
            currentSource.stop();
            currentSource = null;
            info.innerHTML += `<br>⏹️ Остановлено`;
        }
    };
    
    // Инициализация
    currentSamples = generateSawtooth(1000, 1, 1, 0.5, 44100);
    plotSignal(currentSamples, 'sawtoothPlot', '#00ff88');
    plotSpectrum(currentSamples, 'sawtoothSpectrum', 44100);
    info.innerHTML = '🔺 Пилообразный сигнал 1000 Гц. Все гармоники видны на спектре';
});
