from flask import Flask, render_template, request, jsonify, send_file
import os
import threading
import base64
import time
import pandas as pd
from datetime import datetime
import soundfile as sf
import io
from scipy.signal import resample
from google_servicesxy import upload_audio_to_drive, append_to_sheet

app = Flask(__name__)

# -----------------------------
# Folder setup
# -----------------------------
RECORDINGS = "recordings"
DATA = "data"
META = os.path.join(DATA, "metadata.csv")

os.makedirs(RECORDINGS, exist_ok=True)
os.makedirs(DATA, exist_ok=True)

# -----------------------------
# Upload status tracker
# -----------------------------
upload_status = {}

# -----------------------------
# Audio processing
# -----------------------------
def convert_to_16khz(audio_bytes):
    data, samplerate = sf.read(io.BytesIO(audio_bytes))
    target_rate = 16000

    if samplerate != target_rate:
        length = int(len(data) * target_rate / samplerate)
        data = resample(data, length)

    output = io.BytesIO()
    sf.write(output, data, target_rate, format="MP3")
    return output.getvalue()

# -----------------------------
# Background upload
# -----------------------------
def background_upload(upload_id, filepath, data):
    max_retries = 3
    upload_status[upload_id] = "uploading"

    for attempt in range(max_retries):
        try:
            drive_link = upload_audio_to_drive(filepath)
            append_to_sheet([
                drive_link,
                data.get("transcription"),
                data.get("gender"),
                data.get("speech_type"),
                data.get("domain"),
                data.get("contributor"),
                data.get("session_id"),
                data.get("recording_number")
            ])
            upload_status[upload_id] = "success"
            print(f"✅ Uploaded: {drive_link}")
            return
        except Exception as e:
            print(f"⚠️ Attempt {attempt+1} failed: {e}")
            with open("upload_errors.log", "a") as log:
                log.write(f"{datetime.now()} - Upload attempt {attempt+1} failed: {e}\n")
            time.sleep(3)

    upload_status[upload_id] = "failed"
    print("❌ All upload attempts failed")

# -----------------------------
# Flask routes
# -----------------------------
@app.route("/")
def home():
    return render_template("indexxy.html")

@app.route("/dashboard")
def dashboard():
    stats = {"total": 0, "male": 0, "female": 0, "native": 0}

    if os.path.exists(META):
        try:
            df = pd.read_csv(META)
            if not df.empty:
                stats = {
                    "total": len(df),
                    "male": len(df[df.gender == "Male"]),
                    "female": len(df[df.gender == "Female"]),
                    "native": len(df[df.native == "Yes"])
                }
        except pd.errors.EmptyDataError:
            pass

    return render_template("dashboard.html", stats=stats)

@app.route("/upload", methods=["POST"])
def upload():
    data = request.json
    header, encoded = data["audio"].split(",", 1)
    audio_bytes = base64.b64decode(encoded)
    audio_bytes = convert_to_16khz(audio_bytes)

    filename = datetime.now().strftime("owerri_%Y%m%d_%H%M%S.mp3")
    filepath = os.path.join(RECORDINGS, filename)

    with open(filepath, "wb") as f:
        f.write(audio_bytes)

    upload_id = filename
    threading.Thread(target=background_upload, args=(upload_id, filepath, data), daemon=True).start()

    data["audio"] = filename
    data["file"] = filename
    row = data.copy()
    row["audio"] = filename

    if os.path.exists(META):
        try:
            df = pd.read_csv(META)
            df = pd.concat([df, pd.DataFrame([row])], ignore_index=True)
        except pd.errors.EmptyDataError:
            df = pd.DataFrame([row])
    else:
        df = pd.DataFrame([row])

    df.to_csv(META, index=False)
    return jsonify({"status": "saved", "upload_id": upload_id})

@app.route("/upload-status/<upload_id>")
def get_upload_status(upload_id):
    return jsonify({"status": upload_status.get(upload_id, "unknown")})

@app.route("/export/<type>")
def export(type):
    if not os.path.exists(META):
        return jsonify({"error": "No data available"}), 400

    try:
        df = pd.read_csv(META)
        if df.empty:
            return jsonify({"error": "No data available"}), 400
    except pd.errors.EmptyDataError:
        return jsonify({"error": "No data available"}), 400

    if type == "csv":
        path = os.path.join(DATA, "dataset.csv")
        df.to_csv(path, index=False)
    elif type == "json":
        path = os.path.join(DATA, "dataset.json")
        df.to_json(path, orient="records")
    elif type == "excel":
        path = os.path.join(DATA, "dataset.xlsx")
        df.to_excel(path, index=False)
    else:
        return jsonify({"error": "Invalid export type"}), 400

    return send_file(path, as_attachment=True)

# -----------------------------
# Main
# -----------------------------
if __name__ == "__main__":
    app.run(debug=True)