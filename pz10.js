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

function generateGaussianNoise(duration, mean, variance, sampleRate = 44100) {
    const numSamples = duration * sampleRate;
    const samples = new Array(numSamples);
    const stdDev = Math.sqrt(variance);
    
    for (let i = 0; i < numSamples; i++) {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        samples[i] = mean + z * stdDev;
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

function plotHistogram(samples, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const numBins = 50;
    const bins = new Array(numBins).fill(0);
    const minVal = -1;
    const maxVal = 1;
    
    for (const s of samples) {
        let binIdx = Math.floor((s - minVal) / (maxVal - minVal) * numBins);
        if (binIdx >= 0 && binIdx < numBins) bins[binIdx]++;
    }
    
    const maxCount = Math.max(...bins);
    
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    
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
        ctx.fillStyle = '#00ff88';
        ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
    }
    
    ctx.font = '10px monospace';
    ctx.fillStyle = '#ff6666';
    ctx.fillText('Теоретическое распределение Гаусса', width - 200, 20);
    ctx.fillStyle = '#00ff88';
    ctx.fillText('Гистограмма сигнала', width - 200, 40);
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
    const durationSlider = document.getElementById('duration10');
    const meanSlider = document.getElementById('mean10');
    const varSlider = document.getElementById('var10');
    const info = document.getElementById('info10');
    
    document.getElementById('duration10Val').textContent = durationSlider.value;
    document.getElementById('mean10Val').textContent = meanSlider.value;
    document.getElementById('var10Val').textContent = varSlider.value;
    
    durationSlider.oninput = () => document.getElementById('duration10Val').textContent = durationSlider.value;
    meanSlider.oninput = () => document.getElementById('mean10Val').textContent = meanSlider.value;
    varSlider.oninput = () => document.getElementById('var10Val').textContent = varSlider.value;
    
    document.getElementById('genGaussian').onclick = () => {
        const duration = parseFloat(durationSlider.value);
        const mean = parseFloat(meanSlider.value);
        const variance = parseFloat(varSlider.value);
        
        currentSamples = generateGaussianNoise(duration, mean, variance, 44100);
        plotSignal(currentSamples, 'gaussianPlot', '#00ff88');
        plotHistogram(currentSamples, 'gaussianHistogram');
        plotSpectrum(currentSamples, 'gaussianSpectrum', 44100);
        
        const actualMean = currentSamples.reduce((a,b) => a+b, 0) / currentSamples.length;
        const actualVar = currentSamples.reduce((a,b) => a + b*b, 0) / currentSamples.length;
        
        info.innerHTML = `📊 Гауссов шум: ${duration} секунд<br>📈 Заданные параметры: μ=${mean}, σ²=${variance}<br>📉 Фактические: μ≈${actualMean.toFixed(3)}, σ²≈${actualVar.toFixed(3)}<br>🎨 Гистограмма должна повторять форму "колокола" (красная линия)`;
    };
    
    document.getElementById('playGaussian').onclick = () => {
        if (currentSamples) {
            playSignal(currentSamples, 44100);
            info.innerHTML += `<br>🎵 Воспроизведение...`;
        } else {
            info.innerHTML = '⚠️ Сначала сгенерируйте сигнал!';
        }
    };
    
    document.getElementById('stopGaussian').onclick = () => {
        if (currentSource) {
            currentSource.stop();
            currentSource = null;
            info.innerHTML += `<br>⏹️ Остановлено`;
        }
    };
    
    // Инициализация
    currentSamples = generateGaussianNoise(2, 0, 0.5, 44100);
    plotSignal(currentSamples, 'gaussianPlot', '#00ff88');
    plotHistogram(currentSamples, 'gaussianHistogram');
    plotSpectrum(currentSamples, 'gaussianSpectrum', 44100);
    info.innerHTML = '📊 Гауссов шум. Красная линия на гистограмме - теоретическое распределение';
});
