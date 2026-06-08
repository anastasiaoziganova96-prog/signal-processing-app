// ПЗ №10: Гауссов шум
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

// Генерация гауссовского шума
function generateGaussianNoise(duration, mean, variance, sampleRate = 44100) {
    const numSamples = duration * sampleRate;
    const samples = new Array(numSamples);
    const stdDev = Math.sqrt(variance);
    
    for (let i = 0; i < numSamples; i++) {
        // Метод Бокса-Мюллера
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        samples[i] = mean + z * stdDev;
    }
    
    // Нормализация для аудио
    const maxAmp = Math.max(...samples.map(Math.abs));
    if (maxAmp > 0 && maxAmp > 1) {
        for (let i = 0; i < samples.length; i++) {
            samples[i] = samples[i] / maxAmp;
        }
    }
    
    return samples;
}

// Вычисление спектра
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

// Построение графика сигнала
function plotSignal(samples, canvasId, color = '#2E8B57') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const displaySamples = samples.slice(0, 800);
    const step = displaySamples.length / width;
    
    ctx.clearRect(0, 0, width, height);
    
    ctx.beginPath();
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 0.5;
    const zeroY = height / 2;
    ctx.moveTo(0, zeroY);
    ctx.lineTo(width, zeroY);
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

// Построение гистограммы (распределение)
function plotHistogram(samples, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Создаем гистограмму с 50 бинами
    const numBins = 50;
    const bins = new Array(numBins).fill(0);
    const minVal = -1;
    const maxVal = 1;
    
    for (const s of samples) {
        let binIdx = Math.floor((s - minVal) / (maxVal - minVal) * numBins);
        if (binIdx >= 0 && binIdx < numBins) bins[binIdx]++;
    }
    
    const maxCount = Math.max(...bins);
    
    ctx.clearRect(0, 0, width, height);
    
    // Теоретическая кривая Гаусса
    ctx.beginPath();
    ctx.strokeStyle = '#ff6666';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    for (let x = 0; x < width; x++) {
        const val = minVal + (x / width) * (maxVal - minVal);
        const gauss = Math.exp(-val * val / 0.5) / Math.sqrt(2 * Math.PI * 0.25);
        const y = height - gauss * height * 0.8;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Гистограмма
    const barWidth = width / numBins;
    for (let i = 0; i < numBins; i++) {
        const barHeight = (bins[i] / maxCount) * height;
        ctx.fillStyle = '#2E8B57';
        ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
    }
    
    ctx.font = '10px Arial';
    ctx.fillStyle = '#ff6666';
    ctx.fillText('Теоретическое распределение Гаусса', width - 180, 20);
    ctx.fillStyle = '#2E8B57';
    ctx.fillText('Гистограмма сигнала', width - 180, 40);
}

// Построение спектра
function plotSpectrum(samples, canvasId, sampleRate) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const { freqs, spectrum } = computeSpectrum(samples, sampleRate);
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const maxFreq = Math.min(8000, freqs[freqs.length-1]);
    ctx.clearRect(0, 0, width, height);
    
    ctx.beginPath();
    ctx.strokeStyle = '#2E8B57';
    ctx.fillStyle = '#90EE90';
    ctx.lineWidth = 1;
    
    let avgSpec = 0;
    for (let x = 0; x < width; x++) {
        const freq = (x / width) * maxFreq;
        let idx = Math.floor(freq / maxFreq * spectrum.length);
        idx = Math.min(idx, spectrum.length - 1);
        if (idx > 10 && idx < spectrum.length) {
            const y = height - spectrum[idx] * height * 2;
            avgSpec += spectrum[idx];
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
    
    // Средняя линия
    avgSpec = avgSpec / width;
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
    const durationSlider = document.getElementById('duration10');
    const meanSlider = document.getElementById('mean10');
    const varSlider = document.getElementById('var10');
    
    document.getElementById('duration10Val').textContent = durationSlider.value;
    document.getElementById('mean10Val').textContent = meanSlider.value;
    document.getElementById('var10Val').textContent = varSlider.value;
    
    durationSlider.oninput = () => document.getElementById('duration10Val').textContent = durationSlider.value;
    meanSlider.oninput = () => document.getElementById('mean10Val').textContent = meanSlider.value;
    varSlider.oninput = () => document.getElementById('var10Val').textContent = varSlider.value;
    
    const info = document.getElementById('info10');
    
    document.getElementById('genGaussian').onclick = () => {
        const duration = parseFloat(durationSlider.value);
        const mean = parseFloat(meanSlider.value);
        const variance = parseFloat(varSlider.value);
        
        currentSamples = generateGaussianNoise(duration, mean, variance, 44100);
        plotSignal(currentSamples, 'gaussianPlot', '#2E8B57');
        plotHistogram(currentSamples, 'gaussianHistogram');
        plotSpectrum(currentSamples, 'gaussianSpectrum', 44100);
        
        const actualMean = currentSamples.reduce((a,b) => a+b, 0) / currentSamples.length;
        const actualVar = currentSamples.reduce((a,b) => a + b*b, 0) / currentSamples.length;
        
        info.innerHTML = `📊 Гауссов шум: ${duration} секунд<br>📈 Заданные параметры: μ=${mean}, σ²=${variance}<br>📉 Фактические: μ≈${actualMean.toFixed(3)}, σ²≈${actualVar.toFixed(3)}<br>🎨 Гистограмма должна повторять форму "колокола"`;
    };
    
    document.getElementById('playGaussian').onclick = () => {
        if (currentSamples) playSignal(currentSamples, 44100);
        else info.innerHTML = '⚠️ Сначала сгенерируйте сигнал!';
    };
    
    document.getElementById('stopGaussian').onclick = () => {
        if (currentSource) {
            currentSource.stop();
            currentSource = null;
        }
    };
    
    // Инициализация
    currentSamples = generateGaussianNoise(2, 0, 0.5, 44100);
    plotSignal(currentSamples, 'gaussianPlot', '#2E8B57');
    plotHistogram(currentSamples, 'gaussianHistogram');
    plotSpectrum(currentSamples, 'gaussianSpectrum', 44100);
    info.innerHTML = 'Гауссов шум. Пунктир на гистограмме - теоретическое распределение';
});
