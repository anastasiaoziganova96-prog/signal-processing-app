// ПЗ №10: Гауссов шум + загрузка аудиофайлов + сравнение с другими шумами
let audioContext = null;
let currentSource = null;
let gaussianSamples = null;
let pinkForCompare = null;
let brownForCompare = null;
let uploadedSamples10 = null;
let uploadedRate10 = 44100;

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

// Генерация белого шума (для розового)
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

// Генерация розового шума
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

// Генерация броуновского шума
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

// Загрузка аудиофайла
function loadAudioFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target.result;
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                const samples = audioBuffer.getChannelData(0);
                resolve({
                    samples: Array.from(samples),
                    rate: audioBuffer.sampleRate,
                    name: file.name,
                    duration: audioBuffer.duration
                });
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// Вычисление спектра
function computeSpectrum(samples, sampleRate) {
    const n = Math.min(samples.length, 16384);
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

// Построение гистограммы
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

// Построение спектра сравнения
function plotSpectrumComparison(gaussianSamples, pinkSamples, brownSamples, uploadedSamples, canvasId, sampleRate) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const { freqs, spectrum: gaussSpec } = computeSpectrum(gaussianSamples, sampleRate);
    const { spectrum: pinkSpec } = pinkSamples ? computeSpectrum(pinkSamples, sampleRate) : { spectrum: null };
    const { spectrum: brownSpec } = brownSamples ? computeSpectrum(brownSamples, sampleRate) : { spectrum: null };
    const { spectrum: upSpec } = uploadedSamples ? computeSpectrum(uploadedSamples, sampleRate) : { spectrum: null };
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const maxFreq = Math.min(8000, freqs[freqs.length-1]);
    
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    
    // Гауссов шум (зеленый)
    ctx.beginPath();
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    
    for (let x = 0; x < width; x++) {
        const freq = (x / width) * maxFreq;
        let idx = 0;
        for (let i = 0; i < freqs.length && freqs[i] <= freq; i++) idx = i;
        if (idx < gaussSpec.length) {
            const y = height - gaussSpec[idx] * height * 2;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
    
    // Розовый шум (розовый)
    if (pinkSpec) {
        ctx.beginPath();
        ctx.strokeStyle = '#ff69b4';
        ctx.lineWidth = 1.5;
        
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
    }
    
    // Броуновский шум (коричневый)
    if (brownSpec) {
        ctx.beginPath();
        ctx.strokeStyle = '#d4728a';
        ctx.lineWidth = 1.5;
        
        for (let x = 0; x < width; x++) {
            const freq = (x / width) * maxFreq;
            let idx = Math.floor(freq / maxFreq * brownSpec.length);
            idx = Math.min(idx, brownSpec.length - 1);
            if (idx > 10 && idx < brownSpec.length) {
                let y = height - brownSpec[idx] * height * 3;
                y = Math.max(0, Math.min(height, y));
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }
    
    // Загруженный файл (желтый)
    if (upSpec) {
        ctx.beginPath();
        ctx.strokeStyle = '#ffaa44';
        ctx.lineWidth = 1.5;
        
        for (let x = 0; x < width; x++) {
            const freq = (x / width) * maxFreq;
            let idx = Math.floor(freq / maxFreq * upSpec.length);
            idx = Math.min(idx, upSpec.length - 1);
            if (idx > 10 && idx < upSpec.length) {
                let y = height - upSpec[idx] * height * 3;
                y = Math.max(0, Math.min(height, y));
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }
    
    // Легенда
    ctx.font = '10px monospace';
    ctx.fillStyle = '#00ff88';
    ctx.fillText('Гауссов шум (плоский)', width - 200, 30);
    ctx.fillStyle = '#ff69b4';
    ctx.fillText('Розовый шум (1/f)', width - 200, 50);
    ctx.fillStyle = '#d4728a';
    ctx.fillText('Броуновский шум (1/f²)', width - 200, 70);
    if (upSpec) {
        ctx.fillStyle = '#ffaa44';
        ctx.fillText('Ваш файл', width - 200, 90);
    }
}

// Прослушивание
function playSignal(samples, rate) {
    initAudio();
    if (currentSource) {
        try { currentSource.stop(); } catch(e) {}
    }
    
    const buffer = audioContext.createBuffer(1, samples.length, rate);
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
    
    // Генерация гауссова шума
    document.getElementById('genGaussian').onclick = () => {
        const duration = parseFloat(durationSlider.value);
        const mean = parseFloat(meanSlider.value);
        const variance = parseFloat(varSlider.value);
        
        gaussianSamples = generateGaussianNoise(duration, mean, variance, 44100);
        
        // Генерируем другие шумы для сравнения
        pinkForCompare = generatePinkNoise(duration, 44100);
        brownForCompare = generateBrownNoise(duration, 44100);
        
        plotSignal(gaussianSamples, 'gaussianPlot', '#00ff88');
        plotHistogram(gaussianSamples, 'gaussianHistogram');
        plotSpectrumComparison(gaussianSamples, pinkForCompare, brownForCompare, uploadedSamples10, 'gaussianSpectrum', 44100);
        
        const actualMean = gaussianSamples.reduce((a,b) => a+b, 0) / gaussianSamples.length;
        const actualVar = gaussianSamples.reduce((a,b) => a + b*b, 0) / gaussianSamples.length;
        
        info.innerHTML = `📊 Гауссов шум: ${duration} секунд<br>📈 Заданные параметры: μ=${mean}, σ²=${variance}<br>📉 Фактические: μ≈${actualMean.toFixed(3)}, σ²≈${actualVar.toFixed(3)}<br>🎨 Гистограмма должна повторять форму "колокола" (красная линия)<br>📊 На спектре: 🟢 Гауссов (плоский), 🩷 Розовый, 🟣 Броуновский, 🟡 Ваш файл (если загружен)`;
    };
    
    // Сравнение шумов
    document.getElementById('compareNoises').onclick = () => {
        if (gaussianSamples && pinkForCompare && brownForCompare) {
            plotSpectrumComparison(gaussianSamples, pinkForCompare, brownForCompare, uploadedSamples10, 'gaussianSpectrum', 44100);
            info.innerHTML = '📊 Сравнение спектров: 🟢 Гауссов (плоский), 🩷 Розовый (1/f), 🟣 Броуновский (1/f²)';
        } else {
            info.innerHTML = '⚠️ Сначала сгенерируйте гауссов шум!';
        }
    };
    
    // Загрузка файла
    document.getElementById('loadWav10').onclick = async () => {
        const fileInput = document.getElementById('uploadWav10');
        if (!fileInput.files[0]) {
            info.innerHTML = '⚠️ Выберите аудиофайл!';
            return;
        }
        
        initAudio();
        info.innerHTML = '⏳ Загрузка файла...';
        
        try {
            const data = await loadAudioFile(fileInput.files[0]);
            uploadedSamples10 = data.samples;
            uploadedRate10 = data.rate;
            
            if (gaussianSamples && pinkForCompare && brownForCompare) {
                plotSpectrumComparison(gaussianSamples, pinkForCompare, brownForCompare, uploadedSamples10, 'gaussianSpectrum', 44100);
            }
            info.innerHTML = `✅ Файл "${data.name}" загружен!<br>📊 Длительность: ${data.duration.toFixed(2)} сек<br>🟡 Желтый спектр - ваш файл`;
        } catch (err) {
            info.innerHTML = `❌ Ошибка: ${err.message}`;
        }
    };
    
    // Прослушивание
    document.getElementById('playGaussian').onclick = () => {
        if (gaussianSamples) {
            playSignal(gaussianSamples, 44100);
            info.innerHTML += `<br>🎵 Воспроизведение гауссова шума...`;
        } else {
            info.innerHTML = '⚠️ Сначала сгенерируйте сигнал!';
        }
    };
    
    document.getElementById('playPinkCompare').onclick = () => {
        if (pinkForCompare) {
            playSignal(pinkForCompare, 44100);
            info.innerHTML += `<br>🎵 Воспроизведение розового шума...`;
        } else {
            info.innerHTML = '⚠️ Сначала сгенерируйте гауссов шум!';
        }
    };
    
    document.getElementById('playBrownCompare').onclick = () => {
        if (brownForCompare) {
            playSignal(brownForCompare, 44100);
            info.innerHTML += `<br>🎵 Воспроизведение броуновского шума...`;
        } else {
            info.innerHTML = '⚠️ Сначала сгенерируйте гауссов шум!';
        }
    };
    
    document.getElementById('playUploaded10').onclick = () => {
        if (uploadedSamples10) {
            playSignal(uploadedSamples10, uploadedRate10);
            info.innerHTML += `<br>🎵 Воспроизведение загруженного файла...`;
        } else {
            info.innerHTML = '⚠️ Сначала загрузите файл!';
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
    gaussianSamples = generateGaussianNoise(2, 0, 0.5, 44100);
    pinkForCompare = generatePinkNoise(2, 44100);
    brownForCompare = generateBrownNoise(2, 44100);
    plotSignal(gaussianSamples, 'gaussianPlot', '#00ff88');
    plotHistogram(gaussianSamples, 'gaussianHistogram');
    plotSpectrumComparison(gaussianSamples, pinkForCompare, brownForCompare, null, 'gaussianSpectrum', 44100);
    info.innerHTML = '📊 Гауссов шум. Красная линия на гистограмме - теоретическое распределение. Загрузите свой файл для сравнения спектров';
});
