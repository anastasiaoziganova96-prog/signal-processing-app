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
    const dt =
