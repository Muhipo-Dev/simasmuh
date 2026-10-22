import os
import sys
import numpy as np
import requests

BACKEND_URL = os.environ.get("BACKEND_URL", "http://127.0.0.1:3001")
API_KEY = "nailar-muhipo55"
CACHE_FILE = os.path.join(os.path.dirname(__file__), "face_vectors_cache.npz")

def migrate_vectors_to_postgres():
    print("=== MEMULAI MIGRASI VEKTOR FACE AI CACHE KE POSTGRESQL ===")
    if not os.path.exists(CACHE_FILE):
        print(f"[ERR] File cache vektor tidak ditemukan di: {CACHE_FILE}")
        return

    try:
        npz = np.load(CACHE_FILE)
        user_ids = list(npz.files)
        print(f"Ditemukan {len(user_ids)} vektor pengguna di {CACHE_FILE}")
    except Exception as e:
        print(f"[ERR] Gagal membaca cache npz: {e}")
        return

    success_count = 0
    fail_count = 0

    headers = {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
    }

    for uid in user_ids:
        vec = npz[uid]
        if vec is None or len(vec) != 512:
            print(f"[WARN] Vektor tidak valid untuk user {uid}")
            continue

        payload = {
            "userId": uid,
            "embedding": vec.tolist(),
            "modelName": "Inception-ResNet-v1 (Bio-Fusion AI)",
        }

        try:
            res = requests.post(f"{BACKEND_URL}/face-attendance/save-vector", json=payload, headers=headers, timeout=5)
            if res.status_code in (200, 201):
                success_count += 1
                res_data = res.json()
                print(f"[OK] Vektor 512-D tersimpan utuh di PostgreSQL untuk userId: {uid}")
            else:
                fail_count += 1
                print(f"[FAIL] Server return {res.status_code} untuk userId {uid}: {res.text}")
        except Exception as err:
            fail_count += 1
            print(f"[FAIL] Error menghubungkan ke backend untuk userId {uid}: {err}")

    print("\n=== RINGKASAN MIGRASI VEKTOR KE POSTGRESQL ===")
    print(f"Vektor Berhasil Disimpan ke PostgreSQL : {success_count}")
    print(f"Vektor Gagal/Tertunda                 : {fail_count}")

if __name__ == "__main__":
    migrate_vectors_to_postgres()
