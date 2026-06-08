// ПЗ №7: Белый шум
let audioContext = null;
let currentSource = null;
let currentSamples = null;
let currentRate = 44100;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

// Генерация белого шума (нормальное распределение)
function generateWhiteNoise(duration, amp, sampleRate = 44100) {
    const numSamples = duration * sampleRate;
    const samples = new Array(numSamples);
    
    for (let i = 0; i < numSamples; i++) {
        // Метод Бокса-Мюллера для нормального распределения
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        samples[i] = amp * z;
    }
    
    // Нормализация
    const maxAmp = Math.max(...samples.map(Math.abs));
    if (maxAmp > 0) {
        for (let i = 0; i < samples.length; i++) {
            samples[i] = samples[i] / maxAmp;
        }
    }
    
    return samples;
}

// Вычисление спектра мощности (периодограмма)
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

// Построение спектрограммы
function plotSpectrogram(samples, canvasId, sampleRate) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const segmentSize = 256;
    const numSegments = Math.min(Math.floor(samples.length / segmentSize), width);
    
    ctx.clearRect(0, 0, width, height);
    
    const maxFreq = Math.min(8000, sampleRate / 2);
    
    for (let seg = 0; seg < numSegments; seg++) {
        const start = seg * segmentSize;
        const segment = samples.slice(start, start + segmentSize);
        
        // Спектр сегмента с окном Хэмминга
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
        
        // Рисуем
        for (let y = 0; y < height; y++) {
            const freq = (y / height) * maxFreq;
            let idx = Math.floor(freq / maxFreq * (segmentSize / 2));
            idx = Math.min(idx, spectrum.length - 1);
            if (idx >= 0 && spectrum[idx] > 0.02) {
                const intensity = Math.min(200, 100 + Math.floor(spectrum[idx] * 100));
                ctx.fillStyle = `rgb(${intensity}, ${150 - intensity/2}, ${200 - intensity/2})`;
                ctx.fillRect(seg, height - y, 1, 1);
            }
        }
    }
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
    
    // Нулевая линия
    ctx.beginPath();
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 0.5;
    const zeroY = height / 2;
    ctx.moveTo(0, zeroY);
    ctx.lineTo(width, zeroY);
    ctx.stroke();
    
    // Сигнал
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

// Построение спектра
function plotSpectrum(samples, canvasId, sampleRate) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const { freqs, spectrum } = computeSpectrum(samples, sampleRate);
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const maxFreq = Math.min(10000, freqs[freqs.length-1]);
    ctx.clearRect(0, 0, width, height);
    
    // Сглаженный спектр
    ctx.beginPath();
    ctx.strokeStyle = '#e8a0b5';
    ctx.fillStyle = '#ffe0e8';
    ctx.lineWidth = 1;
    
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
    
    // Добавляем горизонтальную линию среднего уровня
    let avgSpec = 0;
    for (let i = 100; i < spectrum.length && i < 500; i++) avgSpec += spectrum[i];
    avgSpec = avgSpec / 400;
    ctx.beginPath();
    ctx.strokeStyle = '#ff9999';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    const avgY = height - avgSpec * height * 1.5;
    ctx.moveTo(0, avgY);
    ctx.lineTo(width, avgY);
    ctx.stroke();
    ctx.setLineDash([]);
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

document.addEventListener('DOMContentLoaded', () => {
    const durationSlider = document.getElementById('duration7');
    const ampSlider = document.getElementById('amp7');
    
    document.getElementById('duration7Val').textContent = durationSlider.value;
    document.getElementById('amp7Val').textContent = ampSlider.value;
    
    durationSlider.oninput = () => document.getElementById('duration7Val').textContent = durationSlider.value;
    ampSlider.oninput = () => document.getElementById('amp7Val').textContent = ampSlider.value;
    
    const info = document.getElementById('info7');
    
    document.getElementById('genWhiteNoise').onclick = () => {
        const duration = parseFloat(durationSlider.value);
        const amp = parseFloat(ampSlider.value);
        
        currentSamples = generateWhiteNoise(duration, amp, 44100);
        plotSignal(currentSamples, 'whitePlot');
        plotSpectrum(currentSamples, 'whiteSpectrum', 44100);
        plotSpectrogram(currentSamples, 'whiteSpectrogram', 44100);
        
        info.innerHTML = `🔊 Белый шум: ${duration} секунд<br>📊 Спектр равномерный (плоский) - энергия распределена по всем частотам<br>🎨 Спектрограмма: равномерная "заливка", нет временной структуры`;
    };
    
    document.getElementById('playWhite').onclick = () => {
        if (currentSamples) playSignal(currentSamples, 44100);
        else info.innerHTML = '⚠️ Сначала сгенерируйте сигнал!';
    };
    
    document.getElementById('stopWhite').onclick = () => {
        if (currentSource) {
            currentSource.stop();
            currentSource = null;
        }
    };
    
    // Инициализация
    currentSamples = generateWhiteNoise(2, 0.8, 44100);
    plotSignal(currentSamples, 'whitePlot');
    plotSpectrum(currentSamples, 'whiteSpectrum', 44100);
    plotSpectrogram(currentSamples, 'whiteSpectrogram', 44100);
    info.innerHTML = 'Белый шум. Спектр равномерный (горизонтальная линия - средний уровень)';
});
