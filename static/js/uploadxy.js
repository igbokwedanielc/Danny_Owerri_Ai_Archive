let uploadedAudioData = null;

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("uploadAudio");

if (dropZone) {

dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {

    e.preventDefault();
    dropZone.classList.remove("dragover");

    const file = e.dataTransfer.files[0];

    // sync dragged file with file input so filename updates
    if(fileInput){
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
    }

    handleFile(file);

});

}

if (fileInput) {

fileInput.addEventListener("change", () => {

    const file = fileInput.files[0];

    handleFile(file);

});

}


function handleFile(file){

if(!file) return;

const maxSize = 50 * 1024 * 1024;

if(file.size > maxSize){

alert("File too large. Max 50MB.");

return;

}

const reader = new FileReader();

reader.readAsDataURL(file);

reader.onload = () => {

uploadedAudioData = reader.result;

audioData = uploadedAudioData;

// preview audio
if(typeof playbackEl !== "undefined" && playbackEl){
    playbackEl.src = audioData;
    playbackEl.controls = true;
}

// load waveform if available
if(typeof loadWaveform === "function"){
    loadWaveform(audioData);
}

// 🔹 detect duration so session timer works
const tempAudio = new Audio();
tempAudio.src = audioData;

tempAudio.onloadedmetadata = () => {

    currentRecordingSeconds = Math.floor(tempAudio.duration);

};

alert("Audio file loaded successfully and ready to save");

};

}


// clear uploaded file UI
function clearUploadedFile(){

uploadedAudioData = null;

if(fileInput){
fileInput.value = "";
}

}


// hook into save function
if(typeof saveRecording === "function"){

const originalSave = saveRecording;

saveRecording = async function(){

await originalSave();

clearUploadedFile();

}

}


// hook into new session
if(typeof startNewSession === "function"){

const originalSession = startNewSession;

startNewSession = function(){

originalSession();

clearUploadedFile();

}

}