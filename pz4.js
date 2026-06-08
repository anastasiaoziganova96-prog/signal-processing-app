// ПЗ №4: Треугольный сигнал и DC-компонента
let audioContext = null;
let currentSource = null;
let currentSamples = null;
let currentRate = 44100;
let currentDuration = 0.5;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

// Генерация треугольного сигнала
function generateTriangle(freq, amp, duration = 0.5, sampleRate = 44100) {
    const samples = [];
    const dt = 1 / sampleRate;
    const numSamples = duration * sampleRate;
    
    for (let i = 0; i < numSamples; i++) {
        const t = i * dt;
        // Треугольный сигнал через арксинус от синуса
        let value = (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * freq * t));
        samples.push(amp * value);
    }
    return samples;
}

// Добавление DC-компоненты
function addDC(samples, dcValue) {
    return samples.map(s => s + dcValue);
}

// Вычисление спектра (БПФ)
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
function plotSignal(samples, canvasId, color = '#d4728a') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const displaySamples = samples.slice(0, 600);
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

// Построение спектра (с акцентом на DC)
function plotSpectrum(samples, canvasId, sampleRate) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const { freqs, spectrum } = computeSpectrum(samples, sampleRate);
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const maxFreq = 5000;
    ctx.clearRect(0, 0, width, height);
    
    // Столбцы для гармоник
    const barWidth = 3;
    for (let x = 0; x < width; x += barWidth + 1) {
        const freq = (x / width) * maxFreq;
        let idx = 0;
        for (let i = 0; i < freqs.length && freqs[i] <= freq; i++) idx = i;
        if (idx < spectrum.length && spectrum[idx] > 0.01) {
            const barHeight = spectrum[idx] * height * 2;
            if (barHeight > 1) {
                ctx.fillStyle = '#e8a0b5';
                ctx.fillRect(x, height - barHeight, barWidth, barHeight);
            }
        }
    }
    
    // Особый акцент на DC (freq=0)
    if (spectrum[0] > 0.01) {
        ctx.fillStyle = '#ff6666';
        ctx.fillRect(0, height - spectrum[0] * height * 2, 5, spectrum[0] * height * 2);
    }
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

// Скачивание WAV файла
function downloadWav(samples, sampleRate, filename) {
    // Нормализация и преобразование в Int16
    let maxAmp = Math.max(...samples.map(Math.abs));
    if (maxAmp === 0) maxAmp = 1;
    const int16Samples = samples.map(s => Math.max(-32768, Math.min(32767, Math.floor(s / maxAmp * 32767))));
    
    // Создание WAV заголовка
    const numSamples = samples.length;
    const numChannels = 1;
    const byteRate = sampleRate * numChannels * 2;
    const blockAlign = numChannels * 2;
    const dataSize = numSamples * 2;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    
    // RIFF chunk
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Данные
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

function writeString(view, offset, str) {
    for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const freqSlider = document.getElementById('freq4');
    const ampSlider = document.getElementById('amp4');
    const dcSlider = document.getElementById('dc4');
    
    document.getElementById('freq4Val').textContent = freqSlider.value;
    document.getElementById('amp4Val').textContent = ampSlider.value;
    document.getElementById('dc4Val').textContent = dcSlider.value;
    
    freqSlider.oninput = () => document.getElementById('freq4Val').textContent = freqSlider.value;
    ampSlider.oninput = () => document.getElementById('amp4Val').textContent = ampSlider.value;
    dcSlider.oninput = () => document.getElementById('dc4Val').textContent = dcSlider.value;
    
    const info = document.getElementById('info4');
    let originalTriangle = null;
    
    document.getElementById('genTriangle').onclick = () => {
        const freq = parseFloat(freqSlider.value);
        const amp = parseFloat(ampSlider.value);
        currentSamples = generateTriangle(freq, amp, 0.5, 44100);
        originalTriangle = [...currentSamples];
        plotSignal(currentSamples, 'trianglePlot');
        plotSpectrum(currentSamples, 'triangleSpectrum', 44100);
        info.innerHTML = `📐 Треугольный сигнал: ${freq} Гц, амплитуда ${amp}<br>Спектр содержит нечётные гармоники: ${freq}, ${3*freq}, ${5*freq}...`;
    };
    
    document.getElementById('addDC').onclick = () => {
        if (!currentSamples) {
            info.innerHTML = '⚠️ Сначала сгенерируйте сигнал!';
            return;
        }
        const dc = parseFloat(dcSlider.value);
        currentSamples = addDC(originalTriangle, dc);
        plotSignal(currentSamples, 'trianglePlot', '#a0a0d4');
        plotSpectrum(currentSamples, 'triangleSpectrum', 44100);
        info.innerHTML = `⚡ Добавлена DC-компонента = ${dc}<br>На спектре появился пик на частоте 0 Гц`;
    };
    
    document.getElementById('playTriangle').onclick = () => {
        if (currentSamples) playSignal(currentSamples, 44100);
        else info.innerHTML = '⚠️ Нет сигнала';
    };
    
    document.getElementById('stopTriangle').onclick = () => {
        if (currentSource) {
            currentSource.stop();
            currentSource = null;
        }
    };
    
    document.getElementById('createWav5sec').onclick = () => {
        const freq = parseFloat(freqSlider.value);
        const amp = parseFloat(ampSlider.value);
        const samples5sec = generateTriangle(freq, amp, 0.5, 44100);
        downloadWav(samples5sec, 44100, 'triangle_05sec.wav');
        info.innerHTML = `💾 Файл triangle_05sec.wav создан и скачан`;
    };
    
    document.getElementById('createWav30sec').onclick = () => {
        const freq = parseFloat(freqSlider.value);
        const amp = parseFloat(ampSlider.value);
        const samples30sec = generateTriangle(freq, amp, 30, 44100);
        downloadWav(samples30sec, 44100, 'triangle_30sec.wav');
        info.innerHTML = `💾 Файл triangle_30sec.wav создан и скачан (30 секунд)`;
    };
    
    // Инициализация
    currentSamples = generateTriangle(440, 1, 0.5, 44100);
    originalTriangle = [...currentSamples];
    plotSignal(currentSamples, 'trianglePlot');
    plotSpectrum(currentSamples, 'triangleSpectrum', 44100);
    info.innerHTML = 'Треугольный сигнал 440 Гц. Нажмите "Добавить DC-компоненту" чтобы увидеть эффект';
});
