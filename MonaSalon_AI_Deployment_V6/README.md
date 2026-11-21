# Mona Salon AI Backend

Model: EfficientNet-B4 V6
Input: Foto wajah
Output: Prediksi bentuk wajah + confidence

## Instalasi
Gunakan Python yang kompatibel dengan seluruh dependensi.

pip install -r requirements.txt

## Jalankan API
uvicorn mona_api:app --host 127.0.0.1 --port 8000

## Endpoint
GET /health
POST /predict

Contoh:
curl -X POST http://127.0.0.1:8000/predict   -F "file=@foto.jpg"

## Catatan
- Tidak membutuhkan Google Colab untuk inferensi.
- Secara default model berjalan di CPU.
- Akurasi test V6: 70.50%.
- Confidence threshold 60% masih eksperimental.
- Jangan publikasikan API tanpa autentikasi,
  pembatasan permintaan, dan validasi keamanan.
