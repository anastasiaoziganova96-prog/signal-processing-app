// ПЗ №4: Треугольный сигнал + загрузка WAV
let audioContext = null;
let currentSource = null;
let triangleSamples = null;
let uploadedSamples4 = null;
let uploadedRate4 = 44100;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

function generateTriangle(freq, amp, duration = 0.5, sampleRate = 44100) {
    const samples = [];
    const dt = 1 / sampleRate;
    const numSamples = duration * sampleRate;
    
    for (let i = 0; i < numSamples; i++) {
        const t = i * dt;
        let value = (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * freq * t));
        samples.push(amp * value);
    }
    return samples;
}

function addDC(samples, dcValue) {
    return samples.map(s => s + dcValue);
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
    
    const displaySamples = samples.slice(0, 600);
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

function plotSpectrumComparison(triangleSamples, uploadedSamples, canvasId, sampleRate) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const { freqs, spectrum: triSpec } = computeSpectrum(triangleSamples, sampleRate);
    const { spectrum: upSpec } = uploadedSamples ? computeSpectrum(uploadedSamples, sampleRate) : { spectrum: null };
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const maxFreq = 5000;
    
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    
    // Спектр треугольного сигнала (зеленый)
    ctx.beginPath();
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 1.5;
    
    for (let x = 0; x < width; x++) {
        const freq = (x / width) * maxFreq;
        let idx = 0;
        for (let i = 0; i < freqs.length && freqs[i] <= freq; i++) idx = i;
        if (idx < triSpec.length) {
            const y = height - triSpec[idx] * height * 2;
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
    
    // Легенда
    ctx.font = '10px monospace';
    ctx.fillStyle = '#00ff88';
    ctx.fillText('Треугольный сигнал', width - 150, 30);
    if (upSpec) {
        ctx.fillStyle = '#ffaa44';
        ctx.fillText('Загруженный файл', width - 150, 50);
    }
}

function downloadWav(samples, sampleRate, filename) {
    let maxAmp = Math.max(...samples.map(Math.abs));
    if (maxAmp === 0) maxAmp = 1;
    const int16Samples = samples.map(s => Math.max(-32768, Math.min(32767, Math.floor(s / maxAmp * 32767))));
    
    const numSamples = samples.length;
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);
    
    function writeString(offset, str) {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    }
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);
    
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
        view.setInt16(offset, int16Samples[i], true);
        offset += 2;
    }
    
    const blob = new Blob([buffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
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
    const freqSlider = document.getElementById('freq4');
    const ampSlider = document.getElementById('amp4');
    const dcSlider = document.getElementById('dc4');
    const info = document.getElementById('info4');
    
    document.getElementById('freq4Val').textContent = freqSlider.value;
    document.getElementById('amp4Val').textContent = ampSlider.value;
    document.getElementById('dc4Val').textContent = dcSlider.value;
    
    freqSlider.oninput = () => document.getElementById('freq4Val').textContent = freqSlider.value;
    ampSlider.oninput = () => document.getElementById('amp4Val').textContent = ampSlider.value;
    dcSlider.oninput = () => document.getElementById('dc4Val').textContent = dcSlider.value;
    
    let originalTriangle = null;
    
    document.getElementById('genTriangle').onclick = () => {
        const freq = parseFloat(freqSlider.value);
        const amp = parseFloat(ampSlider.value);
        triangleSamples = generateTriangle(freq, amp, 0.5, 44100);
        originalTriangle = [...triangleSamples];
        plotSignal(triangleSamples, 'trianglePlot', '#00ff88');
        plotSpectrumComparison(triangleSamples, uploadedSamples4, 'triangleSpectrum', 44100);
        info.innerHTML = `📐 Треугольный сигнал: ${freq} Гц<br>Спектр содержит нечётные гармоники: ${freq}, ${3*freq}, ${5*freq}...`;
    };
    
    document.getElementById('addDC').onclick = () => {
        if (!triangleSamples) {
            info.innerHTML = '⚠️ Сначала сгенерируйте сигнал!';
            return;
        }
        const dc = parseFloat(dcSlider.value);
        triangleSamples = addDC(originalTriangle, dc);
        plotSignal(triangleSamples, 'trianglePlot', '#88ff88');
        plotSpectrumComparison(triangleSamples, uploadedSamples4, 'triangleSpectrum', 44100);
        info.innerHTML = `⚡ Добавлена DC-компонента = ${dc}<br>На спектре появился пик на частоте 0 Гц`;
    };
    
    document.getElementById('loadWav4').onclick = async () => {
        const fileInput = document.getElementById('uploadWav4');
        if (!fileInput.files[0]) {
            info.innerHTML = '⚠️ Выберите WAV файл!';
            return;
        }
        
        initAudio();
        info.innerHTML = '⏳ Загрузка файла...';
        
        try {
            const data = await loadAudioFile(fileInput.files[0]);
            uploadedSamples4 = data.samples;
            uploadedRate4 = data.rate;
            
            if (triangleSamples) {
                plotSpectrumComparison(triangleSamples, uploadedSamples4, 'triangleSpectrum', 44100);
            }
            info.innerHTML = `✅ Файл "${data.name}" загружен!<br>📊 Длительность: ${(data.samples.length/data.rate).toFixed(2)} сек<br>🟡 Желтый спектр - ваш файл, зеленый - треугольный сигнал`;
        } catch (err) {
            info.innerHTML = `❌ Ошибка: ${err.message}`;
        }
    };
    
    document.getElementById('playTriangle').onclick = () => {
        if (triangleSamples) {
            playSignal(triangleSamples, 44100);
            info.innerHTML += `<br>🎵 Воспроизведение треугольного сигнала...`;
        } else {
            info.innerHTML = '⚠️ Нет сигнала!';
        }
    };
    
    document.getElementById('playUploaded4').onclick = () => {
        if (uploadedSamples4) {
            playSignal(uploadedSamples4, uploadedRate4);
            info.innerHTML += `<br>🎵 Воспроизведение загруженного файла...`;
        } else {
            info.innerHTML = '⚠️ Сначала загрузите файл!';
        }
    };
    
    document.getElementById('stopTriangle').onclick = () => {
        if (currentSource) {
            currentSource.stop();
            currentSource = null;
            info.innerHTML += `<br>⏹️ Остановлено`;
        }
    };
    
    document.getElementById('saveWav4').onclick = () => {
        const freq = parseFloat(freqSlider.value);
        const amp = parseFloat(ampSlider.value);
        const samples = generateTriangle(freq, amp, 0.5, 44100);
        downloadWav(samples, 44100, 'triangle_signal.wav');
        info.innerHTML = `💾 Файл triangle_signal.wav сохранен`;
    };
    
    // Инициализация
    triangleSamples = generateTriangle(440, 1, 0.5, 44100);
    originalTriangle = [...triangleSamples];
    plotSignal(triangleSamples, 'trianglePlot', '#00ff88');
    plotSpectrumComparison(triangleSamples, null, 'triangleSpectrum', 44100);
    info.innerHTML = '📐 Треугольный сигнал 440 Гц. Загрузите свой файл для сравнения спектров';
});
