# Danny_Owerri_Ai_Archive: AI Training Dataset Collector

🎙️ **Preserving and structuralizing the Owerri dialect of the Igbo language for next-generation speech AI models.**

This repository contains the application framework and data management schema for the **Owerri Voice Archive**. The platform provides crowdsourced contributors with a streamlined interface to record, transcribe, metadata-tag, and export acoustic training data tailored specifically for the phonetic nuances of the Owerri ($I\mathit{gbo}$) dialect.

---

## 🎯 Project Objective
Most automatic speech recognition (ASR) systems fail to capture regional African dialects accurately. This project bridges that gap by gathering clean, localized audio paired with explicit text transcriptions to train text-to-speech (TTS) and speech-to-text (STT) neural networks.

---

## 📋 Acoustic Standard & Best Practices
To ensure high-fidelity signals optimized for deep learning models, all collected datasets follow strict recording constraints:
*   **Audio Specification:** Native `.wav` format, $16\text{kHz}$ sampling rate, uncompressed lossless audio.
*   **Environment Control:** Quiet rooms with soft furnishings, closed apertures, and isolated background noises (fans, traffic, external speech).
*   **Capture Metrics:** Variable taking (ideal 3–5 iterations per prompt) with consistent 6-inch microphone proximity.

---

## ⚡ Key Platform Features
*   **Web Audio Pipeline:** Direct browser-based recording with integrated countdown timers and secondary file drag-and-drop support (WAV, MP3, M4A, OGG).
*   **Granular Metadata Matrix:** Captures critical categorical vectors including Speaker Gender, Speech Type, and Domain/Topic fields to allow for stratified dataset balancing.
*   **Multi-Format Serialization:** Built-in extraction layer allowing administrators to export compiled translation packages directly into `CSV`, `JSON`, or `Excel` sheets.

---
