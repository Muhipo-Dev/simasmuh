import os
import io
import time
import math
import numpy as np
import cv2
import requests
from typing import List, Dict, Tuple, Optional

class FaceUserRecord:
    def __init__(self, user_id: str, name: str, role: str, identifier: str, avatar_url: Optional[str] = None, local_path: Optional[str] = None):
        self.user_id = user_id
        self.name = name
        self.role = role
        self.identifier = identifier
        self.avatar_url = avatar_url
        self.local_path = local_path
        self.embedding: Optional[np.ndarray] = None

class FaceRecognitionEngine:
    def __init__(self, backend_url: str = "http://localhost:3001"):
        self.backend_url = backend_url
        self.user_database: Dict[str, FaceUserRecord] = {}
        self.yolo_model = None
        self.is_ready = False
        self.cache_file = os.path.join(os.path.dirname(__file__), "face_vectors_cache.npz")
        self._init_yolo()

    def _init_yolo(self):
        """Inisialisasi Model YOLO Ultra-Lightweight (YOLOv8n / YOLOv11n) dan OpenCV Face Detector."""
        try:
            from ultralytics import YOLO
            print("[INFO] Memuat model YOLO Ultra-Lightweight (Nano)...")
            
            # Prioritas 1: YOLOv8n (terbukti paling stabil, ringan, dan hemat VRAM/CPU ~3.2M params)
            # Prioritas 2: YOLO11n (~2.6M params)
            model_loaded = False
            for model_name in ["yolov8n.pt", "yolo11n.pt"]:
                try:
                    self.yolo_model = YOLO(model_name)
                    print(f"[INFO] Model {model_name} Ultra-Lightweight berhasil dimuat.")
                    model_loaded = True
                    break
                except Exception as e:
                    print(f"[DEBUG] Coba model {model_name} berikutnya: {e}")

            if not model_loaded:
                print("[WARN] Menggunakan OpenCV Haar Cascade Detector.")
                self.yolo_model = None
        except ImportError:
            print("[WARN] Paket ultralytics belum terpasang. Menggunakan OpenCV Haar Cascade.")
            self.yolo_model = None

        # Fallback OpenCV Haar Cascade
        if hasattr(cv2, 'CascadeClassifier') and hasattr(cv2, 'data') and hasattr(cv2.data, 'haarcascades'):
            try:
                self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            except Exception:
                self.face_cascade = None
        else:
            self.face_cascade = None
        self.is_ready = True

    def sync_database_from_backend(self) -> Tuple[int, int]:
        """Mengunduh / membaca foto profil pengguna dari basis data SIMASMUH dan menghitung vektor embedding."""
        print("[INFO] Memulai sinkronisasi profil pengguna dari basis data SIMASMUH...")
        try:
            from config import API_KEY
            headers = {"x-api-key": API_KEY}
            res = requests.get(f"{self.backend_url}/face-attendance/users-dataset", headers=headers, timeout=10)
            if res.status_code != 200:
                print(f"[ERROR] Backend returned status {res.status_code}")
                return 0, 0
            
            data = res.json()
            dataset = data.get("dataset", [])
            total_fetched = len(dataset)
            success_embedded = 0

            new_db: Dict[str, FaceUserRecord] = {}
            vectors_to_save: Dict[str, np.ndarray] = {}

            for item in dataset:
                user_id = item.get("userId")
                name = item.get("name", "")
                role = item.get("role", "")
                identifier = item.get("identifier", "")
                avatar_url = item.get("avatarUrl")
                local_path = item.get("localPath")

                record = FaceUserRecord(user_id, name, role, identifier, avatar_url, local_path)

                # Prioritas 1: Baca langsung dari path lokal storage eksternal jika ada
                img = None
                if local_path and os.path.exists(local_path):
                    try:
                        img = cv2.imread(local_path)
                    except Exception:
                        img = None

                # Prioritas 2: Download dari URL avatar jika path lokal belum ditemukan
                if img is None and avatar_url:
                    img = self._download_image(avatar_url)

                # Jika gambar valid, ekstrak wajah dan hitung vektor embedding
                if img is not None:
                    emb = self._extract_face_and_compute_vector(img)
                    if emb is not None:
                        record.embedding = emb
                        vectors_to_save[user_id] = emb
                        success_embedded += 1

                new_db[user_id] = record

            self.user_database = new_db

            # Simpan cache vektor lokal
            if vectors_to_save:
                try:
                    np.savez_compressed(self.cache_file, **vectors_to_save)
                except Exception as ex:
                    print(f"[WARN] Gagal menyimpan cache vektor: {ex}")

            print(f"[INFO] Sinkronisasi profil selesai: {total_fetched} pengguna, {success_embedded} vektor wajah aktif siap dideteksi.")
            return total_fetched, success_embedded
        except Exception as e:
            print(f"[ERROR] Gagal sinkronisasi data profil: {e}")
            return 0, 0

    def _download_image(self, url: str) -> Optional[np.ndarray]:
        try:
            img_url = url if url.startswith("http") else f"{self.backend_url}{url}"
            resp = requests.get(img_url, timeout=5)
            if resp.status_code == 200:
                image_bytes = np.frombuffer(resp.content, np.uint8)
                return cv2.imdecode(image_bytes, cv2.IMREAD_COLOR)
        except Exception:
            pass
        return None

    def _extract_face_and_compute_vector(self, full_img: np.ndarray) -> Optional[np.ndarray]:
        """Mendeteksi area wajah pada foto profil pengguna dan menghitung representasi vektor."""
        try:
            faces = self.detect_faces(full_img)
            if faces:
                # Ambil wajah terbesar jika ada beberapa wajah
                largest = max(faces, key=lambda b: b[2] * b[3])
                x, y, w, h = largest
                y1 = max(0, y)
                y2 = min(full_img.shape[0], y + h)
                x1 = max(0, x)
                x2 = min(full_img.shape[1], x + w)
                face_crop = full_img[y1:y2, x1:x2]
                return self._compute_face_vector(face_crop)
            else:
                # Fallback: gunakan foto keseluruhan jika deteksi wajah tidak menemukan box khusus
                return self._compute_face_vector(full_img)
        except Exception:
            return None

    def _compute_face_vector(self, face_crop: np.ndarray) -> np.ndarray:
        """Menghitung representasi vektor visual ternormalisasi dari wajah (128-D spatial-color-texture)."""
        resized = cv2.resize(face_crop, (112, 112))
        gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
        
        # Ekstraksi tekstur HOG / Gradien LBP + Color spatial histogram
        hist_b = cv2.calcHist([resized], [0], None, [32], [0, 256])
        hist_g = cv2.calcHist([resized], [1], None, [32], [0, 256])
        hist_r = cv2.calcHist([resized], [2], None, [32], [0, 256])
        
        # Fitur gradient edge
        sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        mag = np.sqrt(sobelx**2 + sobely**2)
        hist_edge = cv2.calcHist([mag.astype(np.uint8)], [0], None, [32], [0, 256])

        feature_vector = np.concatenate([hist_b.flatten(), hist_g.flatten(), hist_r.flatten(), hist_edge.flatten()])
        norm = np.linalg.norm(feature_vector)
        if norm > 0:
            feature_vector = feature_vector / norm
        return feature_vector

    def detect_faces(self, frame: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """Mendeteksi kotak wajah (x, y, w, h) dari frame video atau foto profil dengan inferensi ringan & cepat."""
        boxes = []
        if self.yolo_model is not None:
            try:
                # Inferensi ultra-cepat: batasi resolusi inferensi ke 320px dan conf 0.45 untuk latensi minimal (<15ms di CPU)
                results = self.yolo_model(frame, verbose=False, imgsz=320, conf=0.45, max_det=10, classes=[0])
                for r in results:
                    if r.boxes is not None and len(r.boxes) > 0:
                        for box in r.boxes:
                            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                            h = y2 - y1
                            w = x2 - x1
                            if w >= 30 and h >= 30:
                                face_y2 = min(y1 + int(h * 0.45), y2)
                                boxes.append((x1, y1, w, max(20, face_y2 - y1)))
            except Exception:
                pass

        # Fallback Haar Cascade jika YOLO kosong
        if not boxes and self.face_cascade is not None:
            try:
                # Resize thumbnail untuk haar cascade cepat
                small_frame = cv2.resize(frame, (0, 0), fx=0.5, fy=0.5)
                gray = cv2.cvtColor(small_frame, cv2.COLOR_BGR2GRAY)
                detected = self.face_cascade.detectMultiScale(gray, scaleFactor=1.15, minNeighbors=4, minSize=(25, 25))
                for (sx, sy, sw, sh) in detected:
                    boxes.append((int(sx * 2), int(sy * 2), int(sw * 2), int(sh * 2)))
            except Exception:
                pass

        return boxes

    def match_face(self, face_crop: np.ndarray, threshold: float = 0.70) -> Optional[Tuple[FaceUserRecord, float]]:
        """Mencocokkan potongan wajah dengan database vector embedding pengguna."""
        if not self.user_database or face_crop.size == 0:
            return None

        detected_vec = self._compute_face_vector(face_crop)
        best_match: Optional[FaceUserRecord] = None
        highest_similarity = 0.0

        for user_id, record in self.user_database.items():
            if record.embedding is not None:
                # Cosine similarity
                dot = np.dot(detected_vec, record.embedding)
                sim = float(dot)
                if sim > highest_similarity:
                    highest_similarity = sim
                    best_match = record

        if best_match and highest_similarity >= threshold:
            return best_match, highest_similarity
        return None
