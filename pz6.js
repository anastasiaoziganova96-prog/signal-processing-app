// ПЗ №6: Chirp сигналы
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

function generateChirp(f0, f1, duration, type, sampleRate = 44100) {
    const samples = [];
    const dt = 1 / sampleRate;
    const numSamples = duration * sampleRate;
    
    for (let i = 0; i < numSamples; i++) {
        const t = i * dt;
        let phase = 0;
        
        if (type === 'linear') {
            const k = (f1 - f0) / duration;
            phase = 2 * Math.PI * (f0 * t + 0.5 * k * t * t);
        } else if (type === 'quadratic') {
            const k = (f1 - f0) / (duration * duration);
            phase = 2 * Math.PI * (f0 * t + (k * t * t * t) / 3);
        } else {
            if (f0 > 0 && f1 > 0) {
                const k = Math.log(f1 / f0) / duration;
                phase = 2 * Math.PI * f0 * (Math.exp(k * t) - 1) / k;
            } else {
                phase = 2 * Math.PI * f0 * t;
            }
        }
        
        samples.push(Math.sin(phase));
    }
    return samples;
}

function plotSignal(samples, canvasId, color = '#00ff88') {
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

function plotSpectrogram(samples, canvasId, sampleRate) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const segmentSize = 256;
    const numSegments = Math.min(Math.floor(samples.length / segmentSize), width);
    
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    
    const maxFreq = Math.min(8000, sampleRate / 2);
    
    for (let seg = 0; seg < numSegments; seg++) {
        const start = seg * segmentSize;
        const segment = samples.slice(start, start + segmentSize);
        
        const spectrum = new Array(segmentSize / 2);
        for (let k = 0; k < segmentSize / 2; k++) {
            let real = 0, imag = 0;
            for (let i = 0; i < segmentSize; i++) {
                const windowVal = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / segmentSize);
                const angle = -2 * Math.PI * k * i / segmentSize;
                real += segment[i] * windowVal * Math.cos(angle);
                imag += segment[i] * windowVal * Math.sin(angle);
            }
            spectrum[k] = Math.sqrt(real*real + imag*imag) / segmentSize;
        }
        
        for (let y = 0; y < height; y++) {
            const freq = (y / height) * maxFreq;
            let idx = Math.floor(freq / maxFreq * (segmentSize / 2));
            idx = Math.min(idx, spectrum.length - 1);
            if (idx >= 0 && spectrum[idx] > 0.02) {
                const intensity = Math.min(255, Math.floor(spectrum[idx] * 200));
                ctx.fillStyle = `rgb(${intensity}, ${100 + intensity/2}, ${100 + intensity/2})`;
                ctx.fillRect(seg, height - y, 1, 1);
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
    const f0Slider = document.getElementById('f0');
    const f1Slider = document.getElementById('f1');
    const durationSlider = document.getElementById('duration6');
    const chirpType = document.getElementById('chirpType');
    const info = document.getElementById('info6');
    
    document.getElementById('f0Val').textContent = f0Slider.value;
    document.getElementById('f1Val').textContent = f1Slider.value;
    document.getElementById('duration6Val').textContent = durationSlider.value;
    
    f0Slider.oninput = () => document.getElementById('f0Val').textContent = f0Slider.value;
    f1Slider.oninput = () => document.getElementById('f1Val').textContent = f1Slider.value;
    durationSlider.oninput = () => document.getElementById('duration6Val').textContent = durationSlider.value;
    
    document.getElementById('genChirp').onclick = () => {
        const f0 = parseFloat(f0Slider.value);
        const f1 = parseFloat(f1Slider.value);
        const duration = parseFloat(durationSlider.value);
        const type = chirpType.value;
        
        currentSamples = generateChirp(f0, f1, duration, type, 44100);
        plotSignal(currentSamples, 'chirpPlot', '#00ff88');
        plotSpectrogram(currentSamples, 'chirpSpectrogram', 44100);
        
        const typeNames = {
            linear: 'Линейный',
            quadratic: 'Квадратичный',
            logarithmic: 'Логарифмический'
        };
        
        info.innerHTML = `📈 ${typeNames[type]} Chirp сигнал<br>Частота: ${f0} → ${f1} Гц<br>Длительность: ${duration} с<br>На спектрограмме видно изменение частоты во времени`;
    };
    
    document.getElementById('playChirp').onclick = () => {
        if (currentSamples) {
            playSignal(currentSamples, 44100);
            info.innerHTML += `<br>🎵 Воспроизведение...`;
        } else {
            info.innerHTML = '⚠️ Сначала сгенерируйте сигнал!';
        }
    };
    
    document.getElementById('stopChirp').onclick = () => {
        if (currentSource) {
            currentSource.stop();
            currentSource = null;
            info.innerHTML += `<br>⏹️ Остановлено`;
        }
    };
    
    // Инициализация
    currentSamples = generateChirp(100, 3000, 2, 'linear', 44100);
    plotSignal(currentSamples, 'chirpPlot', '#00ff88');
    plotSpectrogram(currentSamples, 'chirpSpectrogram', 44100);
    info.innerHTML = '📈 Линейный Chirp от 100 до 3000 Гц. На спектрограмме видно "восходящую" полосу';
});
