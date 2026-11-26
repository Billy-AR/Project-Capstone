# Mona Salon — AI Face Shape Analysis & Hairstyle Recommendation System

Sistem konsultasi gaya rambut berbasis **Artificial Intelligence (Computer Vision + Multi-Criteria Decision Support)** untuk **Mona Salon**. Pengguna mengunggah atau mengambil foto wajah, sistem mendeteksi bentuk wajah secara otomatis menggunakan model **Hybrid V7 (`ConvNeXt-Small + MediaPipe 478-Landmark`)**, lalu memberikan **Top-3 rekomendasi gaya rambut terbaik** beserta skor kecocokan, foto referensi unik, karakteristik gaya, dan tips styling.

---

## 1. Arsitektur Sistem

```text
Browser / HP (Next.js Frontend)
   │  POST /predict (multipart/form-data foto wajah)
   ▼
FastAPI Backend (mona_api.py — single-worker thread-safe executor)
   ├─ 1. MediaPipe BlazeFace + FaceLandmarker (478 landmark 3D)
   │     ├─ Eye-roll alignment (meluruskan kemiringan kepala)
   │     ├─ Square padded crop (anti-distorsi rasio wajah)
   │     ├─ Ekstraksi 24 fitur geometris antropometrik wajah
   │     └─ Deteksi kualitas foto (pose menyamping, ukuran wajah, ketajaman)
   ├─ 2. HybridFaceShapeNet V7 (ConvNeXt-Small IN22k→IN1k + GeoMLP)
   │     └─ 3-View TTA (Original + Horizontal Flip + Center Zoom 92%)
   ├─ 3. Temperature-Scaled Softmax → Distribusi Probabilitas 5 Kelas
   ▼
JSON Response → Multi-Criteria Recommendation Engine (Frontend)
   └─ Mengurutkan 15 gaya rambut unik → Menampilkan Top-3 + Detail Analisis AI
```

---

## 2. Daftar 5 Klasifikasi Bentuk Wajah & 15 Gaya Rambut

Sistem memfokuskan klasifikasi pada **5 kategori bentuk wajah standar benchmark internasional** (*Face Shape Dataset*, 5.000 foto seimbang) dengan 3 gaya rambut utama per kategori:

| No | Label Model | Label Website | 3 Rekomendasi Gaya Rambut Utama |
| :-: | :--- | :--- | :--- |
| 1 | `Oval` | **Oval** | Layer Cut, Long Wave, Hime Cut |
| 2 | `Round` | **Bulat (Round)** | Curtain Layer, Soft Beach Wave, Framing Cut |
| 3 | `Square` | **Persegi (Square)** | Soft Layer Wave, Feathered Layer, Side Swept Cut |
| 4 | `Heart` | **Hati (Heart)** | Lower Wave Cut, Wispy Layer Cut, Chin Framing Cut |
| 5 | `Oblong` | **Lonjong (Oblong)** | Voluminous Wave, Fringe Layer Cut, Shaggy Framing |

> **Catatan Batasan Ruang Lingkup (Scope):**
> - Bentuk **Persegi Panjang (*Rectangle*)** direpresentasikan dalam kategori **`Oblong`**, karena keduanya memiliki rasio tinggi wajah jauh lebih panjang daripada lebarnya dengan aturan penataan rambut yang identik (menambah volume menyamping dan/atau poni untuk menyeimbangkan proporsi vertikal).
> - Sub-kategori minor seperti ***Diamond*** atau ***Triangle/Pear*** tidak dipisahkan sebagai kelas tersendiri agar distribusi dataset tetap seimbang (1.000 foto/kelas) dan akurasi terjaga tinggi. Bila wajah *Diamond* diuji, sistem memilih kelas terdekat secara anatomis (umumnya **`Heart`** karena sama-sama bertulang pipi tinggi & berdagu runcing) dan secara otomatis menurunkan tingkat *confidence* serta menampilkan kotak peringatan `needs_review`.

---

## 3. Evaluasi & Performa Model AI (V6 vs V7)

Evaluasi dilakukan pada **held-out test set** yang sama persis dari dataset publik `niten19/face-shape-dataset` (**4.000 data latih** dibagi Stratified 85/15 → 3.398 train / 600 val, dan **1.000 data uji** terpisah = 200 foto per kelas). Data uji tidak pernah dipakai saat training maupun kalibrasi.

### 3.1 Perbandingan V6 Baseline vs V7 Hybrid

| Metrik Evaluasi | V6 Baseline (`EfficientNet-B4`) | V7 Single-View | **V7 Hybrid + 3-View TTA (Aktif)** | Peningkatan vs V6 |
| :--- | :---: | :---: | :---: | :---: |
| **Accuracy** | 78.00% *(70.50% catatan lama)* | 90.40% | **90.80%** | **+12.80%** |
| **Macro Precision** | 78.40% | 90.36% | **90.79%** | **+12.39%** |
| **Macro Recall** | 78.00% | 90.40% | **90.80%** | **+12.80%** |
| **Macro F1-Score** | 77.88% | 90.37% | **90.78%** | **+12.90%** |
| **Weighted F1-Score** | 77.88% | 90.37% | **90.78%** | **+12.90%** |
| **Calibration Error (ECE)** *(lebih kecil lebih baik)* | 0.0735 | 0.0481 | **0.0479** | **-34.8%** |

- **Validation Set V7 + TTA (600 foto)**: Accuracy `89.33%`, Macro Precision `89.56%`, Macro Recall `89.33%`, Macro F1 `89.39%`, ECE `0.0424`.
- **Reliabilitas Prediksi Berkeyakinan Tinggi**: pada prediksi dengan `confidence >= 85%` (mencakup **85%** dari data validasi), akurasi model mencapai **95.69%**.

### 3.2 Metrik Per-Kelas (V7 Hybrid + TTA pada 1.000 Data Uji)

| Bentuk Wajah | Precision | Recall | F1-Score | Support |
| :--- | :---: | :---: | :---: | :-: |
| **Heart** | 91.24% | 88.50% | 89.85% | 200 |
| **Oblong** | 93.60% | 95.00% | 94.29% | 200 |
| **Oval** | 88.08% | 85.00% | 86.51% | 200 |
| **Round** | 87.92% | 91.00% | 89.43% | 200 |
| **Square** | 93.10% | 94.50% | 93.80% | 200 |

### 3.3 Confusion Matrix V7 + TTA (Baris = Aktual, Kolom = Prediksi)

| Aktual \ Prediksi | Heart | Oblong | Oval | Round | Square |
| :--- | :-: | :-: | :-: | :-: | :-: |
| **Heart** | **177** | 8 | 7 | 5 | 3 |
| **Oblong** | 2 | **190** | 6 | 1 | 1 |
| **Oval** | 11 | 1 | **170** | 14 | 4 |
| **Round** | 3 | 1 | 8 | **182** | 6 |
| **Square** | 1 | 3 | 2 | 5 | **189** |

Laporan lengkap tersimpan di `MonaSalon_AI_Deployment_V6/evaluation_report_v7.json`.

---

## 4. Rumus & Penjelasan: Kenapa Hasil Bentuk Wajah Muncul "% Cocok" & "Alternatif %"?

### 4.1 Ekstraksi Fitur Hybrid (Visual + 24 Fitur Geometris)
1. **Cabang Visual (`ConvNeXt-Small`)**: mengekstrak representasi tekstur, kontur garis rambut, pipi, dan bayangan rahang dari foto wajah `288×288` yang sudah diluruskan sudut matanya (*eye-roll alignment*) dan dipotong persegi dengan *edge padding* (`square_padded_crop`) agar proporsi lebar-tinggi wajah tidak berubah.
2. **Cabang Geometris (`GeoMLP` — 24 fitur dari MediaPipe 478-landmark)**: menghitung 24 rasio antropometrik yang bebas skala (*scale-invariant*), antara lain:
   - Rasio tinggi terhadap lebar tulang pipi: `height_to_cheek` $= \frac{d(\text{dahi}, \text{dagu})}{w_{\text{pipi}}}$ *(membedakan Oblong vs Round)*
   - Rasio lebar dahi terhadap tulang pipi: `forehead_to_cheek` $= \frac{w_{\text{dahi}}}{w_{\text{pipi}}}$ *(membedakan Heart)*
   - Rasio lebar rahang terhadap tulang pipi: `jaw_to_cheek` $= \frac{w_{\text{rahang}}}{w_{\text{pipi}}}$ *(membedakan Square vs Oval/Heart)*
   - Sudut rahang kiri/kanan (*gonial angle*), sudut lancip dagu, rasio sepertiga wajah, kemiringan tirus pipi-rahang, serta rasio simetri.
   - Setiap fitur dinormalisasi dengan Z-score statistik data latih (dibatasi `[-5, 5]`):

     $$
     \tilde{g}_i = \mathrm{clip}\left(\frac{g_i - \mu_i}{\sigma_i}, -5, 5\right)
     $$

3. Kedua vektor fitur digabungkan (*concatenation*) di lapisan klasifikasi untuk menghasilkan 5 skor mentah (*logits*) $\mathbf{z} = (z_1, z_2, z_3, z_4, z_5)$.

### 4.2 3-View Test-Time Augmentation (TTA)
Agar prediksi stabil dan tidak sensitif terhadap variasi posisi kecil, setiap foto diuji dalam **3 sudut pandang**:
1. Foto asli ($\mathbf{z}_{\text{orig}}$) — bobot **0.45**
2. Foto cermin horizontal ($\mathbf{z}_{\text{flip}}$, sekaligus menukar sudut rahang kiri & kanan) — bobot **0.35**
3. Foto *center zoom* 92% ($\mathbf{z}_{\text{zoom}}$) — bobot **0.20**

Logit gabungan:

$$
\mathbf{z}_{\text{TTA}} = 0.45 \mathbf{z}_{\text{orig}} + 0.35 \mathbf{z}_{\text{flip}} + 0.20 \mathbf{z}_{\text{zoom}}
$$

### 4.3 Softmax + Temperature Scaling → Angka "% Cocok" & "Alternatif %"
Logit gabungan diubah menjadi probabilitas (jumlah seluruh 5 kelas selalu tepat **100%**) dengan rumus **Temperature-Scaled Softmax**:

$$
P(y = k \mid x) = \frac{\exp(z_k / T)}{\sum_{j=1}^{5} \exp(z_j / T)}, \quad k \in \{\text{Heart, Oblong, Oval, Round, Square}\}
$$

dengan $T = 1.0$ (hasil kalibrasi optimal pada validation set untuk meminimalkan *Negative Log-Likelihood* / ECE).

- **Bentuk Wajah Utama (`% Cocok`)** = kelas dengan probabilitas **peringkat #1** tertinggi.
- **Alternatif (`Alternatif: ... (%)`)** = kelas dengan probabilitas **peringkat #2** tertinggi.
  - *Contoh*: jika muncul **Persegi (Square) — `71% Cocok`** dan **`Alternatif: Bulat (Round) (23%)`**, artinya dari total 100%, model menilai 71% fitur wajah mengarah ke Persegi, 23% mirip Bulat, dan ~6% terbagi ke 3 bentuk wajah lainnya. Ini **bukan error**, melainkan transparansi probabilitas AI pada wajah manusia yang sering berada di perbatasan dua bentuk.

### 4.4 Kapan Kotak Peringatan Kuning (`needs_review`) Muncul?
Flag `needs_review = true` aktif otomatis apabila **salah satu** kondisi terpenuhi:
1. Probabilitas utama di bawah ambang kalibrasi: `confidence < 0.75` (75%).
2. **Pose menyamping**: asimetri jarak hidung ke pipi kiri/kanan (`yaw_asymmetry`) `> 0.32`.
3. **Ukuran wajah terlalu kecil**: dimensi wajah pada foto `< 70 px`.
4. **Foto buram / kurang cahaya**: variansi Laplacian ketajaman `< 30.0`.

---

## 5. Rumus & Penjelasan: Kenapa Analisis Rekomendasi Gaya Rambut Muncul "% Match" Sekian?

Setelah bentuk wajah dan *confidence* dari model AI diperoleh, frontend menjalankan **Multi-Criteria Recommendation Engine** (`src/lib/recommendationEngine.ts`) untuk menilai seluruh **15 gaya rambut** menggunakan metode **Weighted Sum (Penjumlahan Terbobot)** dari **4 kriteria**:

### 5.1 Rumus Utama

$$
S_{\text{total}} = (0.50 \times S_{\text{wajah}}) + (0.25 \times S_{\text{tekstur}}) + (0.15 \times S_{\text{panjang}}) + (0.10 \times S_{\text{kesan}})
$$

Skor akhir dikonversi ke persentase dan dibatasi di rentang **70% – 98%**:

$$
\text{Match (\%)} = \min\Big(98, \max\big(70, \mathrm{round}(S_{\text{total}} \times 100)\big)\Big)
$$

### 5.2 Rincian Bobot & Nilai Tiap Kriteria (Skala `0.0` – `1.0`)

| Kriteria | Bobot | Rumus / Aturan Penilaian |
| :--- | :-: | :--- |
| **1. Kesesuaian Bentuk Wajah** ($S_{\text{wajah}}$) | **50%** | $S_{\text{wajah}} = \min\big(1.0, \text{compat}_{\text{wajah}} \times (0.85 + 0.15 \times \text{confidence})\big)$ <br>dengan $\text{compat}_{\text{wajah}}$ diambil dari matriks kecocokan tiap gaya rambut terhadap 5 bentuk wajah (misal `0.98`, `0.95`, `0.85`). |
| **2. Tekstur Rambut** ($S_{\text{tekstur}}$) | **25%** | • Filter **`Semua`**: `0.85` *(nilai netral)*<br>• Filter **cocok** (`Lurus` / `Bergelombang` / `Keriting`): **`1.00`**<br>• Filter **tidak cocok**: `0.45` |
| **3. Panjang Rambut** ($S_{\text{panjang}}$) | **15%** | • Filter **`Semua`**: `0.85` *(nilai netral)*<br>• Filter **cocok** (`Pendek` / `Sebahu` / `Panjang`): **`1.00`**<br>• Filter **tidak cocok**: `0.40` |
| **4. Kesan / Vibe Gaya** ($S_{\text{kesan}}$) | **10%** | • Default (`Semua`): `0.90`<br>• Cocok: `1.00` • Tidak cocok: `0.60` |

### 5.3 FAQ Penting (Sering Ditanyakan Saat Demo / Sidang)

1. **Kenapa di halaman detail tertulis `90% Match` padahal `Kesesuaian Wajah: 95%`?**
   - `Kesesuaian Wajah: 95%` baru **1 kriteria saja** (nilai kecocokan murni terhadap bentuk wajah).
   - `90% Match` adalah **nilai gabungan 4 kriteria** (wajah 50% + tekstur 25% + panjang 15% + kesan 10%). Saat filter Panjang & Tekstur masih di **`Semua`**, keduanya diberi nilai netral `85%`, sehingga rata-rata gabungannya berada sedikit di bawah `95%`.
2. **Kenapa saat filter diganti dari `Semua` ke `Sebahu`, nilai `% Match` justru naik?**
   - Saat filter **`Semua`**, sistem belum tahu panjang rambut pilihan pengguna sehingga memberi nilai netral `0.85`.
   - Saat pengguna memilih **`Sebahu`**, gaya rambut bertipe sebahu langsung mendapat nilai penuh **`1.00`** di kriteria Panjang (+15% bobot → mendongkrak skor total sekitar **+2–3%**), sedangkan gaya rambut panjang/pendek turun ke `0.40`.
3. **Apa arti `Panjang: Semua` / `Tekstur: Semua`, dan kenapa hanya tampil 3 rekomendasi?**
   - **`Semua`** berarti *"bebas / tidak membatasi panjang atau tekstur tertentu"*.
   - Di belakang layar seluruh **15 gaya rambut** tetap dihitung skornya, lalu diurutkan dari skor tertinggi ke terendah dan ditampilkan **Top-3 terbaik** agar tampilan rapi dan mudah dipilih pelanggan.

### 5.4 Contoh Perhitungan Langkah demi Langkah
Misal hasil AI mendeteksi wajah **Lonjong (`Oblong`)** dengan `confidence = 0.82` (82%), dan gaya rambut yang dinilai adalah **Fringe Layer Cut** (`compat_Oblong = 0.95`, panjang `Sebahu`, tekstur `Lurus & Bergelombang`):

- **Langkah 1 — Hitung $S_{\text{wajah}}$:**

  $$
  S_{\text{wajah}} = 0.95 \times (0.85 + 0.15 \times 0.82) = 0.95 \times 0.973 = 0.9244
  $$

- **Kasus A — Filter `Panjang: Semua` (`0.85`) & `Tekstur: Semua` (`0.85`):**

  $$
  S_{\text{total}} = 0.50(0.9244) + 0.25(0.85) + 0.15(0.85) + 0.10(0.90) = 0.8922 \rightarrow \mathbf{89\%\text{–}90\%\text{ Match}}
  $$

- **Kasus B — Filter `Panjang: Sebahu` (`1.00`) & `Tekstur: Semua` (`0.85`):**

  $$
  S_{\text{total}} = 0.50(0.9244) + 0.25(0.85) + 0.15(1.00) + 0.10(0.90) = 0.9147 \rightarrow \mathbf{91\%\text{–}92\%\text{ Match}}
  $$

- **Kasus C — Filter `Panjang: Sebahu` (`1.00`) & `Tekstur: Lurus` (`1.00`):**

  $$
  S_{\text{total}} = 0.50(0.9244) + 0.25(1.00) + 0.15(1.00) + 0.10(0.90) = 0.9522 \rightarrow \mathbf{95\%\text{ Match}}
  $$

- **Kasus D — Filter `Panjang: Pendek` (`0.40`) & `Tekstur: Keriting` (`0.45`):**

  $$
  S_{\text{total}} = 0.50(0.9244) + 0.25(0.45) + 0.15(0.40) + 0.10(0.90) = 0.7247 \rightarrow \mathbf{72\%\text{ Match}}
  $$

---

## 6. Cara Menjalankan Aplikasi

### A. Menjalankan Secara Lokal (2 Terminal)

**Terminal 1 — Backend AI V7 (FastAPI di port `8000`)**
```powershell
cd MonaSalon_AI_Deployment_V6
.\.venv\Scripts\python.exe -m uvicorn mona_api:app --host 127.0.0.1 --port 8000
```
Verifikasi: buka `http://127.0.0.1:8000/health` (harus mengembalikan `"status": "ok"` dan metrik V7).

**Terminal 2 — Frontend Next.js (port `3000`)**
```powershell
cd Project-Capstone-main
npm install
npm run dev
```
Buka **`http://localhost:3000`** di browser.

### B. Deploy Online (Vercel + Cloudflare Tunnel)
1. Jalankan Backend AI V7 di port `8000`.
2. Jalankan `.\cloudflared.exe tunnel --url http://127.0.0.1:8000` dan salin URL `https://xxxx.trycloudflare.com`.
3. Set Environment Variable di Vercel: `NEXT_PUBLIC_API_URL=https://xxxx.trycloudflare.com`, lalu **Redeploy**.

---

## 7. Struktur Folder Utama

- `MonaSalon_AI_Deployment_V6/` — Backend FastAPI & Model AI V7 (`mona_api.py`, `mona_inference.py`, `face_geometry.py`, `train_v7.py`, `mona_ai_config.json`, `evaluation_report_v7.json`, `mona_convnext_small_v7_best.pth`, `face_landmarker.task`, `blaze_face_short_range.tflite`)
- `Project-Capstone-main/` — Aplikasi Frontend Next.js (`src/app/`, `src/data/recommendations.ts`, `src/lib/recommendationEngine.ts`, `public/assets/style-*.jpg`)
- `src/` & `public/assets/` — Tersinkronisasi dengan `Project-Capstone-main/`
