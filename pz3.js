// ПЗ №3: Работа с WAV файлами (ПОЛНАЯ КОПИЯ ФУНКЦИОНАЛА ИЗ COLAB)
let audioContext = null;
let currentSource = null;
let currentSamples = null;
let loadedSamples1 = null;
let loadedSamples2 = null;
let loadedRate1 = 44100, loadedRate2 = 44100;
let currentRate = 44100;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

// Чтение аудиофайла (как в Colab)
function readAudioFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const arrayBuffer = e.target.result;
            try {
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                const samples = audioBuffer.getChannelData(0);
                resolve({ samples: Array.from(samples), rate: audioBuffer.sampleRate });
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// Микширование двух сигналов
function mixSamples(samples1, samples2, gain1, gain2) {
    const maxLen = Math.max(samples1.length, samples2.length);
    const result = new Array(maxLen);
    
    for (let i = 0; i < maxLen; i++) {
        let val1 = i < samples1.length ? samples1[i] : 0;
        let val2 = i < samples2.length ? samples2[i] : 0;
        result[i] = val1 * gain1 + val2 * gain2;
    }
    
    const maxAmp = Math.max(...result.map(Math.abs));
    if (maxAmp > 0) {
        for (let i = 0; i < result.length; i++) {
            result[i] = result[i] / maxAmp;
        }
    }
    return result;
}

// Изменение скорости (stretch) как в Colab
function stretchSamples(samples, factor) {
    const newLength = Math.floor(samples.length / factor);
    const result = new Array(newLength);
    
    for (let i = 0; i < newLength; i++) {
        const srcIdx = i * factor;
        const idx1 = Math.floor(srcIdx);
        const idx2 = Math.min(idx1 + 1, samples.length - 1);
        const frac = srcIdx - idx1;
        
        if (idx1 < samples.length && idx2 < samples.length) {
            result[i] = samples[idx1] * (1 - frac) + samples[idx2] * frac;
        } else if (idx1 < samples.length) {
            result[i] = samples[idx1];
        } else {
            result[i] = 0;
        }
    }
    
    const maxAmp = Math.max(...result.map(Math.abs));
    if (maxAmp > 0) {
        for (let i = 0; i < result.length; i++) {
            result[i] = result[i] / maxAmp;
        }
    }
    return result;
}

// Вычисление спектра (БПФ)
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

// Построение графика сигнала
function plotSignal(samples, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const displaySamples = samples.slice(0, Math.min(1000, samples.length));
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
    ctx.strokeStyle = '#00ff88';
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

// Построение спектра
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
    const file1 = document.getElementById('file1');
    const file2 = document.getElementById('file2');
    const mix1 = document.getElementById('mix1');
    const mix2 = document.getElementById('mix2');
    const stretchFactor = document.getElementById('stretchFactor');
    const info = document.getElementById('info3');
    
    document.getElementById('mix1Val').textContent = mix1.value;
    document.getElementById('mix2Val').textContent = mix2.value;
    document.getElementById('stretchVal').textContent = stretchFactor.value;
    
    mix1.oninput = () => document.getElementById('mix1Val').textContent = mix1.value;
    mix2.oninput = () => document.getElementById('mix2Val').textContent = mix2.value;
    stretchFactor.oninput = () => document.getElementById('stretchVal').textContent = stretchFactor.value;
    
    // ЗАГРУЗКА ФАЙЛОВ (как в Colab)
    document.getElementById('loadFiles').onclick = async () => {
        initAudio();
        if (!file1.files[0] || !file2.files[0]) {
            info.innerHTML = '⚠️ Выберите два аудиофайла!';
            return;
        }
        
        try {
            info.innerHTML = '⏳ Загрузка файлов...';
            const [data1, data2] = await Promise.all([
                readAudioFile(file1.files[0]),
                readAudioFile(file2.files[0])
            ]);
            
            loadedSamples1 = data1.samples;
            loadedSamples2 = data2.samples;
            loadedRate1 = data1.rate;
            loadedRate2 = data2.rate;
            
            currentRate = Math.max(loadedRate1, loadedRate2);
            currentSamples = mixSamples(loadedSamples1, loadedSamples2, 
                                        parseFloat(mix1.value), parseFloat(mix2.value));
            
            plotSignal(currentSamples, 'signalPlot');
            plotSpectrum(currentSamples, 'spectrumPlot', currentRate);
            info.innerHTML = `✅ Файлы загружены!<br>📁 ${file1.files[0].name}: ${(loadedSamples1.length/loadedRate1).toFixed(1)}с<br>📁 ${file2.files[0].name}: ${(loadedSamples2.length/loadedRate2).toFixed(1)}с`;
        } catch (err) {
            info.innerHTML = `❌ Ошибка: ${err.message}`;
        }
    };
    
    // МИКШИРОВАНИЕ
    document.getElementById('applyMix').onclick = () => {
        if (!loadedSamples1 || !loadedSamples2) {
            info.innerHTML = '⚠️ Сначала загрузите файлы!';
            return;
        }
        currentSamples = mixSamples(loadedSamples1, loadedSamples2, 
                                    parseFloat(mix1.value), parseFloat(mix2.value));
        plotSignal(currentSamples, 'signalPlot');
        plotSpectrum(currentSamples, 'spectrumPlot', currentRate);
        info.innerHTML = `🎛️ Микширование: баланс ${mix1.value} : ${mix2.value}`;
    };
    
    // STRETCH (изменение скорости)
    document.getElementById('applyStretch').onclick = () => {
        if (!currentSamples) {
            info.innerHTML = '⚠️ Нет сигнала для обработки!';
            return;
        }
        const factor = parseFloat(stretchFactor.value);
        currentSamples = stretchSamples(currentSamples, factor);
        plotSignal(currentSamples, 'signalPlot');
        plotSpectrum(currentSamples, 'spectrumPlot', currentRate);
        info.innerHTML = `🐌 Изменение скорости: фактор ${factor} (${factor>1 ? 'ускорение' : 'замедление'})`;
    };
    
    // ПРОСЛУШИВАНИЕ
    document.getElementById('playSound').onclick = () => {
        if (currentSamples) {
            playSignal(currentSamples, currentRate);
            info.innerHTML += `<br>🎵 Воспроизведение...`;
        } else {
            info.innerHTML = '⚠️ Нет сигнала! Сначала загрузите файлы';
        }
    };
    
    document.getElementById('stopSound').onclick = () => {
        if (currentSource) {
            currentSource.stop();
            currentSource = null;
            info.innerHTML += `<br>⏹️ Остановлено`;
        }
    };
});
