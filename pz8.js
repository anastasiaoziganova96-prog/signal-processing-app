// ПЗ №8: Броуновский шум + загрузка аудиофайлов
let audioContext = null;
let currentSource = null;
let brownNoiseSamples = null;
let uploadedSamples8 = null;
let uploadedRate8 = 44100;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

// Генерация броуновского шума (интегрированный белый шум)
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

// Построение спектра с теоретической кривой
function plotSpectrumWithTheory(brownSamples, uploadedSamples, canvasId, sampleRate) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const { freqs, spectrum: brownSpec } = computeSpectrum(brownSamples, sampleRate);
    const { spectrum: upSpec } = uploadedSamples ? computeSpectrum(uploadedSamples, sampleRate) : { spectrum: null };
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const maxFreq = Math.min(5000, freqs[freqs.length-1]);
    
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    
    // Теоретическая линия 1/f² (красная пунктирная)
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
    
    // Спектр броуновского шума (розовый)
    ctx.beginPath();
    ctx.strokeStyle = '#d4728a';
    ctx.lineWidth = 2;
    
    for (let x = 10; x < width; x++) {
        const freq = (x / width) * maxFreq;
        let idx = 0;
        for (let i = 0; i < freqs.length && freqs[i] <= freq; i++) idx = i;
        if (idx < brownSpec.length && idx > 10) {
            let y = height - brownSpec[idx] * height * 3;
            y = Math.max(0, Math.min(height, y));
            if (x === 10) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
    
    // Спектр загруженного файла (желтый)
    if (upSpec) {
        ctx.beginPath();
        ctx.strokeStyle = '#ffaa44';
        ctx.lineWidth = 1.5;
        
        for (let x = 10; x < width; x++) {
            const freq = (x / width) * maxFreq;
            let idx = Math.floor(freq / maxFreq * upSpec.length);
            idx = Math.min(idx, upSpec.length - 1);
            if (idx > 10 && idx < upSpec.length) {
                let y = height - upSpec[idx] * height * 3;
                y = Math.max(0, Math.min(height, y));
                if (x === 10) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }
    
    // Легенда
    ctx.font = '10px monospace';
    ctx.fillStyle = '#ff6666';
    ctx.fillText('~ 1/f² (теория)', width - 150, 30);
    ctx.fillStyle = '#d4728a';
    ctx.fillText('Броуновский шум', width - 150, 50);
    if (upSpec) {
        ctx.fillStyle = '#ffaa44';
        ctx.fillText('Загруженный файл', width - 150, 70);
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
    const durationSlider = document.getElementById('duration8');
    const info = document.getElementById('info8');
    
    document.getElementById('duration8Val').textContent = durationSlider.value;
    durationSlider.oninput = () => document.getElementById('duration8Val').textContent = durationSlider.value;
    
    document.getElementById('genBrownNoise').onclick = () => {
        const duration = parseFloat(durationSlider.value);
        brownNoiseSamples = generateBrownNoise(duration, 44100);
        plotSignal(brownNoiseSamples, 'brownPlot', '#d4728a');
        plotSpectrumWithTheory(brownNoiseSamples, uploadedSamples8, 'brownSpectrum', 44100);
        
        info.innerHTML = `🌊 Броуновский шум: ${duration} секунд<br>📊 Спектр спадает как 1/f² (наклон -6 дБ/октаву)<br>🔴 Красная линия - теоретический закон, 🟣 Розовая - реальный спектр<br>Загрузите свой файл для сравнения (желтая линия)`;
    };
    
    document.getElementById('loadWav8').onclick = async () => {
        const fileInput = document.getElementById('uploadWav8');
        if (!fileInput.files[0]) {
            info.innerHTML = '⚠️ Выберите аудиофайл!';
            return;
        }
        
        initAudio();
        info.innerHTML = '⏳ Загрузка файла...';
        
        try {
            const data = await loadAudioFile(fileInput.files[0]);
            uploadedSamples8 = data.samples;
            uploadedRate8 = data.rate;
            
            if (brownNoiseSamples) {
                plotSpectrumWithTheory(brownNoiseSamples, uploadedSamples8, 'brownSpectrum', 44100);
            }
            info.innerHTML = `✅ Файл "${data.name}" загружен!<br>📊 Длительность: ${data.duration.toFixed(2)} сек<br>🟡 Желтый спектр - ваш файл, розовый - броуновский шум`;
        } catch (err) {
            info.innerHTML = `❌ Ошибка: ${err.message}`;
        }
    };
    
    document.getElementById('playBrown').onclick = () => {
        if (brownNoiseSamples) {
            playSignal(brownNoiseSamples, 44100);
            info.innerHTML += `<br>🎵 Воспроизведение броуновского шума...`;
        } else {
            info.innerHTML = '⚠️ Сначала сгенерируйте сигнал!';
        }
    };
    
    document.getElementById('playUploaded8').onclick = () => {
        if (uploadedSamples8) {
            playSignal(uploadedSamples8, uploadedRate8);
            info.innerHTML += `<br>🎵 Воспроизведение загруженного файла...`;
        } else {
            info.innerHTML = '⚠️ Сначала загрузите файл!';
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
    brownNoiseSamples = generateBrownNoise(2, 44100);
    plotSignal(brownNoiseSamples, 'brownPlot', '#d4728a');
    plotSpectrumWithTheory(brownNoiseSamples, null, 'brownSpectrum', 44100);
    info.innerHTML = '🌊 Броуновский шум. Красная линия - теоретический закон 1/f². Загрузите свой файл для сравнения';
});
