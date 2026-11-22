# Mona Salon AI Backend (V7 Hybrid)

Backend inferensi klasifikasi bentuk wajah berbasis **FastAPI + PyTorch + MediaPipe**.

- **Arsitektur Model**: `ConvNeXt-Small (IN22k → IN1k)` + **24 Fitur Geometris MediaPipe 478-Landmark** (`HybridFaceShapeNet` V7)
- **File Bobot Aktif**: `mona_convnext_small_v7_best.pth` *(legacy V6: `mona_efficientnet_b4_v6_best.pth`)*
- **Detektor & Landmarker**: `blaze_face_short_range.tflite` + `face_landmarker.task` (478 landmark 3D)
- **Kelas Output (5 kelas)**: `Heart`, `Oblong`, `Oval`, `Round`, `Square`
- **Format Input**: `image/jpeg`, `image/png`, `image/webp`, `image/avif` (maksimal 10 MB)

---

## 1. Perbandingan Evaluasi Model (V6 vs V7)

Evaluasi dilakukan pada **held-out test set** yang sama (`niten19/face-shape-dataset`, **1.000 foto uji** = 200 foto/kelas, terpisah sepenuhnya dari 3.398 train & 600 val). Detail JSON lengkap tersedia di `evaluation_report_v7.json`.

| Metrik | V6 Baseline (`EfficientNet-B4`) | V7 Single-View | **V7 Hybrid + 3-View TTA** | Peningkatan vs V6 |
| :--- | :---: | :---: | :---: | :---: |
| **Accuracy** | 78.00% *(70.50% config lama)* | 90.40% | **90.80%** | **+12.80%** |
| **Macro Precision** | 78.40% | 90.36% | **90.79%** | **+12.39%** |
| **Macro Recall** | 78.00% | 90.40% | **90.80%** | **+12.80%** |
| **Macro F1-Score** | 77.88% | 90.37% | **90.78%** | **+12.90%** |
| **Weighted F1-Score** | 77.88% | 90.37% | **90.78%** | **+12.90%** |
| **Calibration Error (ECE)** | 0.0735 | 0.0481 | **0.0479** | **-34.8%** |

- **Validation Set V7 + TTA (600 foto)**: Accuracy `89.33%`, Macro F1 `89.39%`, ECE `0.0424`.
- **Akurasi High-Confidence (`confidence >= 0.85`)**: **95.69%** (mencakup 85.0% data validasi).

### Performa Per-Kelas (V7 + TTA — Held-Out Test Set)

| Kelas | Precision | Recall | F1-Score | Support |
| :--- | :---: | :---: | :---: | :-: |
| **Heart** | 91.24% | 88.50% | 89.85% | 200 |
| **Oblong** | 93.60% | 95.00% | 94.29% | 200 |
| **Oval** | 88.08% | 85.00% | 86.51% | 200 |
| **Round** | 87.92% | 91.00% | 89.43% | 200 |
| **Square** | 93.10% | 94.50% | 93.80% | 200 |

### Confusion Matrix V7 + TTA (Baris = Aktual, Kolom = Prediksi)

| Aktual \ Prediksi | Heart | Oblong | Oval | Round | Square |
| :--- | :-: | :-: | :-: | :-: | :-: |
| **Heart** | **177** | 8 | 7 | 5 | 3 |
| **Oblong** | 2 | **190** | 6 | 1 | 1 |
| **Oval** | 11 | 1 | **170** | 14 | 4 |
| **Round** | 3 | 1 | 8 | **182** | 6 |
| **Square** | 1 | 3 | 2 | 5 | **189** |

---

## 2. Pipeline & Rumus Prediksi Bentuk Wajah (`mona_inference.py` + `face_geometry.py`)

### 2.1 Preprocessing Anti-Distorsi
1. **EXIF Transpose & Deteksi Wajah**: membaca orientasi asli kamera lalu mendeteksi wajah terbesar dengan MediaPipe `FaceLandmarker` + `FaceDetector`.
2. **Eye-Roll Alignment**: menghitung sudut kemiringan garis mata kiri (`landmark 33`) dan kanan (`landmark 263`), lalu memutar gambar tegak lurus jika $| \text{roll} | \in (1.5^\circ, 35^\circ]$.
3. **Square Padded Crop**: memotong area wajah berbentuk bujur sangkar (`scale_factor = 1.65`) dengan *edge padding* bila menyentuh tepi gambar, sehingga rasio tinggi/lebar wajah **tidak pernah tertarik/gepeng** saat di-resize ke `288×288`.

### 2.2 24 Fitur Geometris Antropometrik (`face_geometry.py`)
Dari 478 landmark wajah, diekstrak 24 fitur bebas skala:
- Rasio vertikal–horizontal: `height_to_cheek_ratio`, `brow_height_to_cheek_ratio`, `cheek_width_to_height`, proporsi sepertiga atas/tengah/bawah wajah.
- Rasio lebar profil wajah: `forehead_to_cheek_ratio`, `upper_forehead_to_cheek_ratio`, `temple_to_cheek_ratio`, `jaw_to_cheek_ratio`, `lower_jaw_to_cheek_ratio`, `chin_to_cheek_ratio`, `jaw_to_forehead_ratio`, `chin_to_jaw_ratio`, `chin_to_forehead_ratio`.
- Sudut & kelengkungan: sudut rahang kiri/kanan/rata-rata, sudut dagu, kelengkungan dahi, kemiringan tirus rahang/pipi, variasi lebar (`width_std_ratio`), dan rasio simetri.
- Standarisasi Z-score terhadap statistik train split:
  $$\tilde{g}_i = \operatorname{clip}\!\left(\frac{g_i - \mu_i}{\sigma_i},\; -5,\; 5\right)$$

### 2.3 3-View Test-Time Augmentation (TTA) & Softmax Probabilitas
Model menjalankan 3 inferensi paralel (original, cermin horizontal dengan penukaran sudut rahang kiri↔kanan, dan center zoom 92%) lalu menggabungkan logit-nya:
$$\mathbf{z}_{\text{TTA}} = 0.45\,\mathbf{z}_{\text{orig}} + 0.35\,\mathbf{z}_{\text{flip}} + 0.20\,\mathbf{z}_{\text{zoom}}$$

Probabilitas masing-masing dari 5 kelas dihitung dengan **Temperature-Scaled Softmax** ($T = 1.0$, jumlah total selalu 100%):
$$P(y = k \mid x) = \frac{\exp(z_k / T)}{\sum_{j=1}^{5} \exp(z_j / T)}$$

- **`face_shape` & `confidence`**: kelas peringkat #1 beserta probabilitasnya (ditampilkan di UI sebagai `% Cocok`).
- **`predictions[1]`**: kelas peringkat #2 (ditampilkan di UI sebagai `Alternatif: ... (%)`).
- **`top2_margin`**: selisih probabilitas peringkat #1 dan #2.

### 2.4 Kalibrasi `needs_review` & Quality Warnings
`needs_review` bernilai `true` bila:
- `confidence < 0.75` (ambang terkalibrasi di `mona_ai_config.json`), **atau**
- Terdeteksi peringatan kualitas foto:
  - Pose menyamping (`yaw_asymmetry > 0.32`)
  - Wajah terlalu kecil (`face_size_px < 70`)
  - Foto buram / kurang cahaya (`sharpness < 30.0`, variansi Laplacian)

---

## 3. Rumus Rekomendasi Gaya Rambut (Frontend Multi-Criteria Engine)

Output `face_shape` dan `confidence` dari API ini dikirim ke `recommendationEngine.ts` di frontend untuk menghitung skor kecocokan (**`% Match`**) seluruh 15 gaya rambut:

$$S_{\text{wajah}} = \min\!\Big(1.0,\; \text{compat}_{\text{wajah}} \times (0.85 + 0.15 \times \text{confidence})\Big)$$

$$S_{\text{total}} = (0.50 \times S_{\text{wajah}}) + (0.25 \times S_{\text{tekstur}}) + (0.15 \times S_{\text{panjang}}) + (0.10 \times S_{\text{kesan}})$$

$$\text{Match (\%)} = \min\!\Big(98,\; \max\!\big(70,\; \operatorname{round}(S_{\text{total}} \times 100)\big)\Big)$$

- Saat filter **Panjang** / **Tekstur** = **`Semua`**: nilai netral `0.85` (Kesan default `0.90`).
- Saat filter dipilih & **cocok**: naik menjadi **`1.00`** (sehingga `% Match` meningkat).
- Saat filter dipilih & **tidak cocok**: turun ke `0.40` (Panjang) / `0.45` (Tekstur).
- Sistem mengurutkan seluruh 15 gaya rambut dari `% Match` tertinggi lalu menampilkan **Top-3**.

---

## 4. Instalasi & Menjalankan Server API

```powershell
# Instalasi dependensi (jika belum memakai .venv yang tersedia)
pip install -r requirements.txt

# Jalankan FastAPI (otomatis memakai GPU CUDA jika tersedia, fallback ke CPU)
.\.venv\Scripts\python.exe -m uvicorn mona_api:app --host 127.0.0.1 --port 8000
```

Set `MONA_DEVICE=cpu` bila ingin memaksa berjalan di CPU.

### Endpoint
- **`GET /health`** — status server, nama model aktif, device (`cuda`/`cpu`), dan metrik evaluasi test set.
- **`POST /predict`** — menerima `multipart/form-data` dengan field `file`, mengembalikan prediksi bentuk wajah, confidence terkalibrasi, ranking 5 kelas, `needs_review`, `quality_warnings`, dan `geometry_summary`.

Contoh uji via `curl`:
```bash
curl -X POST http://127.0.0.1:8000/predict -F "file=@foto.jpg"
```

---

## 5. Reproduksi Training V7 (`train_v7.py`)
```powershell
# Cache dataset & model default diarahkan ke NVMe E:\_mona_ai_cache (bisa diubah via env MONA_NVME_CACHE)
.\.venv\Scripts\python.exe train_v7.py
```
Skrip otomatis mengunduh dataset, memproses & menyimpan cache 5.000 gambar + fitur 478-landmark, mengevaluasi baseline V6, melatih Hybrid V7, melakukan kalibrasi di validation set, dan menulis laporan pembanding ke `evaluation_report_v7.json`.
