// ПЗ №5: Пилообразный сигнал + загрузка WAV
let audioContext = null;
let currentSource = null;
let sawtoothSamples = null;
let uploadedSamples5 = null;
let uploadedRate5 = 44100;

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
                    name: file.name
                });
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
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

function plotSpectrumComparison(sawtoothSamples, uploadedSamples, canvasId, sampleRate) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const { freqs, spectrum: sawSpec } = computeSpectrum(sawtoothSamples, sampleRate);
    const { spectrum: upSpec } = uploadedSamples ? computeSpectrum(uploadedSamples, sampleRate) : { spectrum: null };
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const maxFreq = 8000;
    
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    
    // Спектр пилообразного сигнала (зеленый)
    ctx.beginPath();
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 1.5;
    
    for (let x = 0; x < width; x++) {
        const freq = (x / width) * maxFreq;
        let idx = 0;
        for (let i = 0; i < freqs.length && freqs[i] <= freq; i++) idx = i;
        if (idx < sawSpec.length) {
            const y = height - sawSpec[idx] * height * 1.5;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
    
    // Спектр загруженного файла (желтый)
    if (upSpec) {
        ctx.beginPath();
        ctx.strokeStyle = '#ffaa44';
        ctx.lineWidth = 1.5;
        
        for (let x = 0; x < width; x++) {
            const freq = (x / width) * maxFreq;
            let idx = Math.floor(freq / maxFreq * upSpec.length);
            idx = Math.min(idx, upSpec.length - 1);
            if (idx > 10 && idx < upSpec.length) {
                const y = height - upSpec[idx] * height * 2;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }
    
    ctx.font = '10px monospace';
    ctx.fillStyle = '#00ff88';
    ctx.fillText('Пилообразный сигнал', width - 150, 30);
    if (upSpec) {
        ctx.fillStyle = '#ffaa44';
        ctx.fillText('Загруженный файл', width - 150, 50);
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
        
        sawtoothSamples = generateSawtooth(freq, amp, width, 0.5, 44100);
        plotSignal(sawtoothSamples, 'sawtoothPlot', '#00ff88');
        plotSpectrumComparison(sawtoothSamples, uploadedSamples5, 'sawtoothSpectrum', 44100);
        
        info.innerHTML = `🔺 Пилообразный сигнал: ${freq} Гц<br>Спектр содержит все гармоники: ${freq}, ${2*freq}, ${3*freq}...<br>Зеленый спектр - пилообразный, желтый - ваш файл (если загружен)`;
    };
    
    document.getElementById('loadWav5').onclick = async () => {
        const fileInput = document.getElementById('uploadWav5');
        if (!fileInput.files[0]) {
            info.innerHTML = '⚠️ Выберите аудиофайл!';
            return;
        }
        
        initAudio();
        info.innerHTML = '⏳ Загрузка файла...';
        
        try {
            const data = await loadAudioFile(fileInput.files[0]);
            uploadedSamples5 = data.samples;
            uploadedRate5 = data.rate;
            
            if (sawtoothSamples) {
                plotSpectrumComparison(sawtoothSamples, uploadedSamples5, 'sawtoothSpectrum', 44100);
            }
            info.innerHTML = `✅ Файл "${data.name}" загружен!<br>🟡 Желтый спектр - ваш файл, зеленый - пилообразный сигнал`;
        } catch (err) {
            info.innerHTML = `❌ Ошибка: ${err.message}`;
        }
    };
    
    document.getElementById('playSawtooth').onclick = () => {
        if (sawtoothSamples) {
            playSignal(sawtoothSamples, 44100);
            info.innerHTML += `<br>🎵 Воспроизведение пилообразного сигнала...`;
        } else {
            info.innerHTML = '⚠️ Сначала сгенерируйте сигнал!';
        }
    };
    
    document.getElementById('playUploaded5').onclick = () => {
        if (uploadedSamples5) {
            playSignal(uploadedSamples5, uploadedRate5);
            info.innerHTML += `<br>🎵 Воспроизведение загруженного файла...`;
        } else {
            info.innerHTML = '⚠️ Сначала загрузите файл!';
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
    sawtoothSamples = generateSawtooth(1000, 1, 1, 0.5, 44100);
    plotSignal(sawtoothSamples, 'sawtoothPlot', '#00ff88');
    plotSpectrumComparison(sawtoothSamples, null, 'sawtoothSpectrum', 44100);
    info.innerHTML = '🔺 Пилообразный сигнал 1000 Гц. Загрузите свой файл для сравнения спектров';
});
