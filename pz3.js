// ПЗ №3: Работа с аудиофайлами
let audioContext = null;
let currentSource = null;
let currentSamples = null;
let currentRate = 44100;
let originalSamples = null;
let originalRate = 44100;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

async function loadAudioFile(file) {
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

function changeSpeed(samples, rate, factor) {
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
    return { samples: result, rate: rate / factor };
}

function lowPassFilter(samples, cutoffFreq, sampleRate) {
    const dt = 1 / sampleRate;
    const RC = 1 / (2 * Math.PI * cutoffFreq);
    const alpha = dt / (RC + dt);
    
    const filtered = new Array(samples.length);
    filtered[0] = samples[0];
    
    for (let i = 1; i < samples.length; i++) {
        filtered[i] = filtered[i-1] + alpha * (samples[i] - filtered[i-1]);
    }
    return filtered;
}

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

function computeSpectrogram(samples, sampleRate) {
    const segmentSize = 512;
    const numSegments = Math.min(Math.floor(samples.length / segmentSize), 100);
    const spectrogram = [];
    
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
        spectrogram.push(spectrum);
    }
    return spectrogram;
}

function plotWaveform(samples, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    
    const displaySamples = samples.slice(0, Math.min(samples.length, 3000));
    const step = displaySamples.length / width;
    
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
    ctx.lineWidth = 1;
    
    let first = true;
    for (let x = 0; x < width; x++) {
        const idx = Math.floor(x * step);
        if (idx < displaySamples.length) {
            let y = height / 2 - displaySamples[idx] * height / 1.5;
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

function plotSpectrumFromSamples(samples, canvasId, sampleRate) {
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
}

function plotSpectrogramImage(samples, canvasId, sampleRate) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const spectrogram = computeSpectrogram(samples, sampleRate);
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    
    const numSegments = spectrogram.length;
    const numFreqs = spectrogram[0]?.length || 1;
    
    for (let x = 0; x < width && x < numSegments; x++) {
        for (let y = 0; y < height; y++) {
            const freqIdx = Math.floor((y / height) * numFreqs);
            if (freqIdx < numFreqs && spectrogram[x] && spectrogram[x][freqIdx]) {
                const intensity = Math.min(255, Math.floor(spectrogram[x][freqIdx] * 200));
                ctx.fillStyle = `rgb(${intensity}, ${100 + intensity/2}, ${100 + intensity/2})`;
                ctx.fillRect(x, height - y, 1, 1);
            }
        }
    }
}

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
    const fileInput = document.getElementById('audioFile');
    const cutoffSlider = document.getElementById('cutoffFreq');
    const cutoffVal = document.getElementById('cutoffVal');
    const info = document.getElementById('info3');
    
    cutoffSlider.oninput = () => {
        cutoffVal.textContent = cutoffSlider.value;
    };
    
    document.getElementById('loadAudio').onclick = async () => {
        if (!fileInput.files[0]) {
            info.innerHTML = '⚠️ Выберите аудиофайл!';
            return;
        }
        
        initAudio();
        info.innerHTML = '⏳ Загрузка файла...';
        
        try {
            const data = await loadAudioFile(fileInput.files[0]);
            originalSamples = data.samples;
            originalRate = data.rate;
            currentSamples = [...originalSamples];
            currentRate = originalRate;
            
            plotWaveform(currentSamples, 'waveformPlot');
            plotSpectrumFromSamples(currentSamples, 'spectrumPlot', currentRate);
            plotSpectrogramImage(currentSamples, 'spectrogramPlot', currentRate);
            
            info.innerHTML = `✅ Файл загружен!<br>📊 Длительность: ${data.duration.toFixed(2)} сек<br>🎵 Частота дискретизации: ${data.rate} Гц<br>📈 Количество отсчетов: ${data.samples.length}`;
        } catch (err) {
            info.innerHTML = `❌ Ошибка: ${err.message}`;
        }
    };
    
    document.getElementById('playOriginal').onclick = () => {
        if (currentSamples) {
            playSignal(currentSamples, currentRate);
            info.innerHTML += `<br>🎵 Воспроизведение...`;
        } else {
            info.innerHTML = '⚠️ Сначала загрузите файл!';
        }
    };
    
    document.getElementById('playSpeedUp').onclick = () => {
        if (originalSamples) {
            const result = changeSpeed(originalSamples, originalRate, 1.5);
            currentSamples = result.samples;
            currentRate = result.rate;
            plotWaveform(currentSamples, 'waveformPlot');
            plotSpectrumFromSamples(currentSamples, 'spectrumPlot', currentRate);
            plotSpectrogramImage(currentSamples, 'spectrogramPlot', currentRate);
            playSignal(currentSamples, currentRate);
            info.innerHTML = `⚡ Ускорение: x1.5<br>🎵 Новая частота дискретизации: ${currentRate.toFixed(0)} Гц`;
        } else {
            info.innerHTML = '⚠️ Сначала загрузите файл!';
        }
    };
    
    document.getElementById('playSlowDown').onclick = () => {
        if (originalSamples) {
            const result = changeSpeed(originalSamples, originalRate, 0.7);
            currentSamples = result.samples;
            currentRate = result.rate;
            plotWaveform(currentSamples, 'waveformPlot');
            plotSpectrumFromSamples(currentSamples, 'spectrumPlot', currentRate);
            plotSpectrogramImage(currentSamples, 'spectrogramPlot', currentRate);
            playSignal(currentSamples, currentRate);
            info.innerHTML = `🐌 Замедление: x0.7<br>🎵 Новая частота дискретизации: ${currentRate.toFixed(0)} Гц`;
        } else {
            info.innerHTML = '⚠️ Сначала загрузите файл!';
        }
    };
    
    document.getElementById('applyFilter').onclick = () => {
        if (originalSamples) {
            const cutoff = parseFloat(cutoffSlider.value);
            currentSamples = lowPassFilter(originalSamples, cutoff, originalRate);
            currentRate = originalRate;
            plotWaveform(currentSamples, 'waveformPlot');
            plotSpectrumFromSamples(currentSamples, 'spectrumPlot', currentRate);
            plotSpectrogramImage(currentSamples, 'spectrogramPlot', currentRate);
            info.innerHTML = `🔽 Low-pass фильтр: частота среза ${cutoff} Гц`;
        } else {
            info.innerHTML = '⚠️ Сначала загрузите файл!';
        }
    };
    
    document.getElementById('stopAudio').onclick = () => {
        if (currentSource) {
            currentSource.stop();
            currentSource = null;
            info.innerHTML += `<br>⏹️ Остановлено`;
        }
    };
});
