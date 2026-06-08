// ПЗ №9: Розовый шум + загрузка аудиофайлов
let audioContext = null;
let currentSource = null;
let pinkNoiseSamples = null;
let whiteNoiseForCompare = null;
let uploadedSamples9 = null;
let uploadedRate9 = 44100;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

// Генерация белого шума
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

// Генерация розового шума (метод Voss-McCartney)
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

// Построение графика сигнала
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

// Построение спектра сравнения
function plotSpectrumComparison(pinkSamples, whiteSamples, uploadedSamples, canvasId, sampleRate) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const { freqs, spectrum: pinkSpec } = computeSpectrum(pinkSamples, sampleRate);
    const { spectrum: whiteSpec } = whiteSamples ? computeSpectrum(whiteSamples, sampleRate) : { spectrum: null };
    const { spectrum: upSpec } = uploadedSamples ? computeSpectrum(uploadedSamples, sampleRate) : { spectrum: null };
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const maxFreq = Math.min(8000, freqs[freqs.length-1]);
    
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    
    // Теоретическая линия 1/f (серая пунктирная)
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
    
    // Белый шум (серый)
    if (whiteSpec) {
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
    }
    
    // Розовый шум (розовый)
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
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText('~ 1/f (теория)', width - 150, 30);
    ctx.fillStyle = '#888888';
    ctx.fillText('Белый шум (плоский)', width - 150, 50);
    ctx.fillStyle = '#ff69b4';
    ctx.fillText('Розовый шум (1/f)', width - 150, 70);
    if (upSpec) {
        ctx.fillStyle = '#ffaa44';
        ctx.fillText('Ваш файл', width - 150, 90);
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
    const durationSlider = document.getElementById('duration9');
    const info = document.getElementById('info9');
    
    document.getElementById('duration9Val').textContent = durationSlider.value;
    durationSlider.oninput = () => document.getElementById('duration9Val').textContent = durationSlider.value;
    
    document.getElementById('genPinkNoise').onclick = () => {
        const duration = parseFloat(durationSlider.value);
        pinkNoiseSamples = generatePinkNoise(duration, 44100);
        whiteNoiseForCompare = generateWhiteNoise(duration, 44100);
        
        plotSignal(pinkNoiseSamples, 'pinkPlot', '#ff69b4');
        plotSpectrumComparison(pinkNoiseSamples, whiteNoiseForCompare, uploadedSamples9, 'pinkSpectrum', 44100);
        
        info.innerHTML = `🩷 Розовый шум: ${duration} секунд<br>📊 Спектр спадает как 1/f (наклон -3 дБ/октаву)<br>🩷 Розовый - розовый шум, 🩶 Серый - белый шум, 🟡 Желтый - ваш файл (если загружен)`;
    };
    
    document.getElementById('comparePinkWhite').onclick = () => {
        if (pinkNoiseSamples && whiteNoiseForCompare) {
            plotSpectrumComparison(pinkNoiseSamples, whiteNoiseForCompare, uploadedSamples9, 'pinkSpectrum', 44100);
            info.innerHTML = '📊 Сравнение: розовый шум (розовый) спадает как 1/f, белый шум (серый) - плоский';
        } else {
            info.innerHTML = '⚠️ Сначала сгенерируйте розовый шум!';
        }
    };
    
    document.getElementById('loadWav9').onclick = async () => {
        const fileInput = document.getElementById('uploadWav9');
        if (!fileInput.files[0]) {
            info.innerHTML = '⚠️ Выберите аудиофайл!';
            return;
        }
        
        initAudio();
        info.innerHTML = '⏳ Загрузка файла...';
        
        try {
            const data = await loadAudioFile(fileInput.files[0]);
            uploadedSamples9 = data.samples;
            uploadedRate9 = data.rate;
            
            if (pinkNoiseSamples && whiteNoiseForCompare) {
                plotSpectrumComparison(pinkNoiseSamples, whiteNoiseForCompare, uploadedSamples9, 'pinkSpectrum', 44100);
            }
            info.innerHTML = `✅ Файл "${data.name}" загружен!<br>📊 Длительность: ${data.duration.toFixed(2)} сек<br>🟡 Желтый спектр - ваш файл`;
        } catch (err) {
            info.innerHTML = `❌ Ошибка: ${err.message}`;
        }
    };
    
    document.getElementById('playPink').onclick = () => {
        if (pinkNoiseSamples) {
            playSignal(pinkNoiseSamples, 44100);
            info.innerHTML += `<br>🎵 Воспроизведение розового шума...`;
        } else {
            info.innerHTML = '⚠️ Сначала сгенерируйте сигнал!';
        }
    };
    
    document.getElementById('playWhiteCompare').onclick = () => {
        if (whiteNoiseForCompare) {
            playSignal(whiteNoiseForCompare, 44100);
            info.innerHTML += `<br>🎵 Воспроизведение белого шума (для сравнения)...`;
        } else {
            info.innerHTML = '⚠️ Сначала сгенерируйте розовый шум!';
        }
    };
    
    document.getElementById('playUploaded9').onclick = () => {
        if (uploadedSamples9) {
            playSignal(uploadedSamples9, uploadedRate9);
            info.innerHTML += `<br>🎵 Воспроизведение загруженного файла...`;
        } else {
            info.innerHTML = '⚠️ Сначала загрузите файл!';
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
    pinkNoiseSamples = generatePinkNoise(2, 44100);
    whiteNoiseForCompare = generateWhiteNoise(2, 44100);
    plotSignal(pinkNoiseSamples, 'pinkPlot', '#ff69b4');
    plotSpectrumComparison(pinkNoiseSamples, whiteNoiseForCompare, null, 'pinkSpectrum', 44100);
    info.innerHTML = '🩷 Розовый шум. Серый - белый шум для сравнения. Загрузите свой файл для сравнения';
});
