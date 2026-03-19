// static/js/waveform.js

let audioContext;
let analyser;
let dataArray;
let animationId;

const canvas = document.getElementById("waveform");
const ctx = canvas.getContext("2d");

let volume = 0;


// Ensure canvas size fits container
function resizeCanvas() {
    canvas.width = canvas.offsetWidth || 600;
    canvas.height = 120;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);


// Setup waveform when recording starts
async function setupWaveform(stream) {

    audioContext = new (window.AudioContext || window.AudioContext)();

    const source = audioContext.createMediaStreamSource(stream);

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;

    source.connect(analyser);

    dataArray = new Uint8Array(analyser.fftSize);

    drawWaveform();
}


// Draw waveform continuously
function drawWaveform() {

    if (!analyser) return;

    animationId = requestAnimationFrame(drawWaveform);

    analyser.getByteTimeDomainData(dataArray);

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#3b82f6";
    ctx.beginPath();

    const sliceWidth = canvas.width / dataArray.length;

    let x = 0;

    volume = 0;

    for (let i = 0; i < dataArray.length; i++) {

        const v = (dataArray[i] - 128) / 128.0;

        const y = (v * canvas.height) / 2 + canvas.height / 2;

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }

        volume += Math.abs(v);

        x += sliceWidth;
    }

    ctx.stroke();

    drawVolumeMeter();
}


// Draw volume meter on right side
function drawVolumeMeter() {

    const avgVolume = volume / dataArray.length;

    const meterHeight = Math.min(avgVolume * canvas.height * 4, canvas.height);

    ctx.fillStyle = "#ef4444";

    ctx.fillRect(
        canvas.width - 18,
        canvas.height - meterHeight,
        12,
        meterHeight
    );
}


// Stop waveform animation
function stopWaveform() {

    if (animationId) {
        cancelAnimationFrame(animationId);
    }

    clearWaveform();
}


// Clear waveform display
function clearWaveform() {

    ctx.fillStyle = "#000";

    ctx.fillRect(0, 0, canvas.width, canvas.height);
}


// Optional: load recorded waveform preview
function loadWaveform(audioURL) {

    clearWaveform();

    const audio = new Audio(audioURL);

    const audioCtx = new (window.AudioContext || window.AudioContext)();

    const source = audioCtx.createMediaElementSource(audio);

    const analyserNode = audioCtx.createAnalyser();

    source.connect(analyserNode);
    analyserNode.connect(audioCtx.destination);

}
