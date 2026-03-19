let recorder;
let chunks = [];
let audioData = null;
let startTime;
let timerInterval;

let recordingCount = 1;
let sessionSeconds = 0;
let currentRecordingSeconds = 0;

const timerEl = document.getElementById("recordingTimer");
const playbackEl = document.getElementById("playbackAudio");
const counterEl = document.getElementById("recordingCounter");
const durationEl = document.getElementById("sessionDuration");
const sessionEl = document.getElementById("sessionID");

let sessionID = generateSessionID();

initializeSessionUI();

function generateSessionID(){
    return "OWERRI-" + Math.random().toString(36).substring(2,8).toUpperCase();
}

function initializeSessionUI(){
    if(sessionEl) sessionEl.innerText = sessionID;
    if(counterEl) counterEl.innerText = "Recording #1";
    if(durationEl) durationEl.innerText = "00:00";
}


// START RECORDING
async function startRecording(){

    // Prevent double recording if button is tapped twice
    if(recorder && recorder.state === "recording"){
        return;
    }

    // Ensure no previous timer is running
    stopTimer();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    if(typeof setupWaveform === "function"){
        setupWaveform(stream);
    }

    recorder = new MediaRecorder(stream,{ mimeType:"audio/webm" });

    recorder.start();

    chunks = [];

    startTime = Date.now();

    startTimer();

    recorder.ondataavailable = e => chunks.push(e.data);
}


// STOP RECORDING
function stopRecording(){

    if(!recorder) return;

    recorder.stop();

    stopTimer();

    recorder.onstop = async () => {

        currentRecordingSeconds = Math.floor((Date.now() - startTime)/1000);

        const blob = new Blob(chunks,{ type:"audio/webm" });

        const arrayBuffer = await blob.arrayBuffer();

        const audioCtx = new (window.AudioContext || window.webkitAudioContext)({sampleRate:16000});

        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        audioData = encodeWAV(audioBuffer);

        if(playbackEl){
            playbackEl.src = audioData;
            playbackEl.controls = true;
        }

        if(typeof loadWaveform === "function"){
            loadWaveform(audioData);
        }

        if(typeof stopWaveform === "function"){
            stopWaveform();
        }

        alert("Recording ready to save!");
    }

}


// TIMER FUNCTIONS
function startTimer(){

    if(!timerEl) return;

    timerInterval = setInterval(()=>{

        const elapsed = Math.floor((Date.now() - startTime)/1000);

        const minutes = Math.floor(elapsed/60).toString().padStart(2,"0");
        const seconds = (elapsed%60).toString().padStart(2,"0");

        timerEl.innerText = `${minutes}:${seconds}`;

    },500);

}

function stopTimer(){
    clearInterval(timerInterval);
}


// UPDATE SESSION DURATION
function updateSessionDuration(){

    if(!durationEl) return;

    let mins = Math.floor(sessionSeconds/60);
    let secs = sessionSeconds%60;

    durationEl.innerText =
        String(mins).padStart(2,"0")+":"+
        String(secs).padStart(2,"0");

}


// AUDIO ENCODING
function encodeWAV(audioBuffer){

    const numChannels=audioBuffer.numberOfChannels;
    const sampleRate=audioBuffer.sampleRate;
    const format=1;
    const bitsPerSample=16;

    let samples;

    if(numChannels===2){

        const left=audioBuffer.getChannelData(0);
        const right=audioBuffer.getChannelData(1);

        samples=interleave(left,right);

    }else{
        samples=audioBuffer.getChannelData(0);
    }

    const buffer=new ArrayBuffer(44 + samples.length*2);
    const view=new DataView(buffer);

    // RIFF header
    writeString(view,0,'RIFF');
    view.setUint32(4,36 + samples.length*2,true);
    writeString(view,8,'WAVE');
    writeString(view,12,'fmt ');
    view.setUint32(16,16,true);
    view.setUint16(20,format,true);
    view.setUint16(22,numChannels,true);
    view.setUint32(24,sampleRate,true);
    view.setUint32(28,sampleRate*numChannels*bitsPerSample/8,true);
    view.setUint16(32,numChannels*bitsPerSample/8,true);
    view.setUint16(34,bitsPerSample,true);
    writeString(view,36,'data');
    view.setUint32(40,samples.length*2,true);

    let offset=44;

    for(let i=0;i<samples.length;i++,offset+=2){

        let s=Math.max(-1,Math.min(1,samples[i]));

        view.setInt16(offset,s<0?s*0x8000:s*0x7FFF,true);
    }

    return `data:audio/wav;base64,${arrayBufferToBase64(buffer)}`;
}


function interleave(left,right){

    const length=left.length+right.length;

    const result=new Float32Array(length);

    let index=0,inputIndex=0;

    while(index<length){

        result[index++]=left[inputIndex];
        result[index++]=right[inputIndex];

        inputIndex++;
    }

    return result;
}


function writeString(view,offset,string){

    for(let i=0;i<string.length;i++){
        view.setUint8(offset+i,string.charCodeAt(i));
    }

}


function arrayBufferToBase64(buffer){

    let binary='';

    const bytes=new Uint8Array(buffer);

    const chunkSize=0x8000;

    for(let i=0;i<bytes.length;i+=chunkSize){

        const sub=bytes.subarray(i,i+chunkSize);

        binary+=String.fromCharCode.apply(null,sub);
    }

    return btoa(binary);
}


// RESET FORM AFTER SAVE
function resetForm(){

    stopTimer();

    if(timerEl) timerEl.innerText="00:00";

    if(playbackEl) playbackEl.src="";

    if(typeof clearWaveform === "function"){
        clearWaveform();
    }

    const inputs=[
        "transcription",
    ];

    inputs.forEach(id=>{
        const el=document.getElementById(id);
        if(el) el.value="";
    });

    const selects=[
        "gender",
        "speech_type",
        "domain"
    ];

    selects.forEach(id=>{
        const el=document.getElementById(id);
        if(el) el.selectedIndex=0;
    });

    const contributor=document.getElementById("contributor");
    if(contributor) contributor.value="Anonymous";

    audioData=null;
    chunks=[];
    recorder=null;

    currentRecordingSeconds=0;

    recordingCount++;

    if(counterEl){
        counterEl.innerText="Recording #"+recordingCount;
    }

}


// SAVE RECORDING
async function saveRecording(){

    if(!audioData){
        alert("No recording found!");
        return;
    }

    await fetch("/upload",{

        method:"POST",

        headers:{
            "Content-Type":"application/json"
        },

        body:JSON.stringify({

            audio:audioData,
            transcription:document.getElementById("transcription").value,
            gender:document.getElementById("gender").value,
            speech_type:document.getElementById("speech_type").value,
            domain:document.getElementById("domain").value,
            contributor:document.getElementById("contributor").value,
            session_id:sessionID,
            recording_number:recordingCount

        })

    });

    // ADD duration ONLY AFTER SAVE
    sessionSeconds += currentRecordingSeconds;

    updateSessionDuration();

    alert("Saved to archive!");

    resetForm();
}




// START NEW SESSION
function startNewSession(){

    if(confirm("Start a new recording session? Current session data will reset.")){

        stopTimer();

        sessionSeconds=0;
        currentRecordingSeconds=0;
        recordingCount=1;

        sessionID=generateSessionID();

        initializeSessionUI();

        if(timerEl) timerEl.innerText="00:00";

        if(playbackEl) playbackEl.src="";

        if(typeof clearWaveform === "function"){
            clearWaveform();
        }

        const inputs=[
            "transcription",
        ];

        inputs.forEach(id=>{
            const el=document.getElementById(id);
            if(el) el.value="";
        });

        const selects=[
            "gender",
            "speech_type",
            "domain"
        ];

        selects.forEach(id=>{
            const el=document.getElementById(id);
            if(el) el.selectedIndex=0;
        });

        const contributor=document.getElementById("contributor");
        if(contributor) contributor.value="Anonymous";

        audioData=null;
        chunks=[];
        recorder=null;

        alert("New session started.");
    }

}


