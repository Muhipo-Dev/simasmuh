import os
import io
import time
import math
import numpy as np
import cv2
import requests
import torch
from PIL import Image
from typing import List, Dict, Tuple, Optional

try:
    from facenet_pytorch import MTCNN, InceptionResnetV1
    FACENET_AVAILABLE = True
except ImportError:
    FACENET_AVAILABLE = False


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
        self.device = torch.device('cuda:0' if torch.cuda.is_available() else 'cpu')
        if torch.cuda.is_available():
            try:
                torch.backends.cudnn.benchmark = True
                self.device_name = torch.cuda.get_device_name(0)
            except Exception:
                self.device_name = "NVIDIA CUDA GPU"
        else:
            self.device_name = "CPU"
        self.facenet_model: Optional[InceptionResnetV1] = None
        self.mtcnn_detector: Optional[MTCNN] = None
        self.is_ready = False
        self.cache_file = os.path.join(os.path.dirname(__file__), "face_vectors_cache.npz")
        self._init_facenet()

    def _init_facenet(self):
        """Inisialisasi Model FaceNet (Inception-ResNet-v1 pretrained VGGFace2) & MTCNN Face Detector pada GPU/CPU."""
        print(f"[INFO] Memuat Model AI FaceNet pada hardware compute: {self.device_name} ({self.device})...")
        try:
            if FACENET_AVAILABLE:
                # MTCNN dengan akselerasi GPU / CPU
                self.mtcnn_detector = MTCNN(
                    image_size=160,
                    margin=15,
                    min_face_size=15,
                    thresholds=[0.4, 0.5, 0.5],
                    factor=0.709,
                    post_process=True,
                    keep_all=True,
                    device=self.device
                )
                # InceptionResnetV1 untuk representasi 512-D embedding pada GPU
                self.facenet_model = InceptionResnetV1(pretrained='vggface2').eval().to(self.device)
                print(f"[INFO] FaceNet (Inception-ResNet-v1 512-D) & MTCNN berhasil dimuat pada GPU: {self.device_name}.")
            else:
                print("[WARN] facenet-pytorch belum terpasang.")
        except Exception as e:
            print(f"[ERROR] Gagal memuat FaceNet / MTCNN: {e}")
            self.facenet_model = None
            self.mtcnn_detector = None

        self.is_ready = True

    def sync_database_from_backend(self) -> Tuple[int, int]:
        """Mengunduh / membaca foto profil pengguna dari basis data SIMASMUH dan menghitung FaceNet 512-D embedding."""
        print("[INFO] Memulai sinkronisasi profil pengguna ke representasi FaceNet embedding...")
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
                role = item.get("role", "SISWA")
                identifier = item.get("identifier") or item.get("username", "")
                avatar_url = item.get("avatarUrl")
                local_path = item.get("localPath")

                record = FaceUserRecord(
                    user_id=user_id,
                    name=name,
                    role=role,
                    identifier=identifier,
                    avatar_url=avatar_url,
                    local_path=local_path,
                )

                # Ekstraksi vector embedding dari foto profil
                embedding = self._extract_user_embedding(record)
                if embedding is not None:
                    record.embedding = embedding
                    vectors_to_save[user_id] = embedding
                    success_embedded += 1

                new_db[user_id] = record

            self.user_database = new_db

            # Simpan cache vektor lokal untuk bootstrap cepat
            if vectors_to_save:
                try:
                    np.savez_compressed(self.cache_file, **vectors_to_save)
                except Exception as e:
                    print(f"[WARN] Gagal menyimpan cache vektor FaceNet: {e}")

            print(f"[INFO] Sinkronisasi FaceNet selesai: {total_fetched} pengguna, {success_embedded} vektor wajah aktif siap dideteksi.")
            return total_fetched, success_embedded

        except Exception as e:
            print(f"[ERROR] Exception saat sinkronisasi database: {e}")
            return self._load_from_local_cache()

    def _load_from_local_cache(self) -> Tuple[int, int]:
        """Memuat vektor embedding dari cache offline jika backend offline sementara."""
        if not os.path.exists(self.cache_file):
            return 0, 0
        try:
            cached = np.load(self.cache_file)
            loaded_count = 0
            for user_id in cached.files:
                if user_id in self.user_database:
                    self.user_database[user_id].embedding = cached[user_id]
                    loaded_count += 1
            print(f"[INFO] Memuat {loaded_count} vektor FaceNet dari file cache offline.")
            return len(self.user_database), loaded_count
        except Exception as e:
            print(f"[WARN] Gagal membaca cache npz FaceNet: {e}")
            return 0, 0

    def _extract_user_embedding(self, record: FaceUserRecord) -> Optional[np.ndarray]:
        """Ekstraksi embedding wajah dari file lokal atau download avatar URL."""
        img = None
        # 1. Coba baca dari file lokal storage
        if record.local_path and os.path.exists(record.local_path):
            try:
                img = cv2.imread(record.local_path)
            except Exception:
                img = None

        # 2. Jika file lokal tidak ada, coba fetch HTTP dari avatarUrl
        if img is None and record.avatar_url:
            try:
                url = record.avatar_url
                if url.startswith("/"):
                    url = f"{self.backend_url}{url}"
                r = requests.get(url, timeout=5)
                if r.status_code == 200:
                    arr = np.frombuffer(r.content, np.uint8)
                    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            except Exception:
                img = None

        if img is None:
            return None

        # Deteksi dan potong area wajah
        return self._extract_face_crop_and_embed(img)

    def _extract_face_crop_and_embed(self, full_img: np.ndarray) -> Optional[np.ndarray]:
        """Deteksi area wajah pada foto dan hitung FaceNet embedding."""
        try:
            faces = self.detect_faces(full_img)
            if faces:
                largest = max(faces, key=lambda b: b[2] * b[3])
                x, y, w, h = largest
                y1 = max(0, y)
                y2 = min(full_img.shape[0], y + h)
                x1 = max(0, x)
                x2 = min(full_img.shape[1], x + w)
                face_crop = full_img[y1:y2, x1:x2]
                return self._compute_facenet_embedding(face_crop)
            else:
                return self._compute_facenet_embedding(full_img)
        except Exception:
            return None

    def _compute_facenet_embedding(self, face_crop: np.ndarray) -> Optional[np.ndarray]:
        """Menghitung representasi 512-D FaceNet L2-normalized deep embedding dari potongan wajah."""
        if face_crop is None or face_crop.size == 0:
            return None

        if self.facenet_model is not None:
            try:
                rgb = cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)
                resized = cv2.resize(rgb, (160, 160))
                # Normalisasi FaceNet: (pixel - 127.5) / 128.0
                norm_img = (resized.astype(np.float32) - 127.5) / 128.0
                tensor = torch.from_numpy(norm_img).permute(2, 0, 1).unsqueeze(0).to(self.device)
                
                with torch.no_grad():
                    raw_emb = self.facenet_model(tensor).cpu().numpy()[0]
                
                norm = np.linalg.norm(raw_emb)
                if norm > 0:
                    raw_emb = raw_emb / norm
                return raw_emb
            except Exception as e:
                print(f"[DEBUG] Error kalkulasi FaceNet embedding: {e}")

        # Fallback LBP / Color Histogram
        try:
            resized = cv2.resize(face_crop, (112, 112))
            gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
            hist_b = cv2.calcHist([resized], [0], None, [32], [0, 256])
            hist_g = cv2.calcHist([resized], [1], None, [32], [0, 256])
            hist_r = cv2.calcHist([resized], [2], None, [32], [0, 256])
            sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
            sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
            mag = np.sqrt(sobelx**2 + sobely**2)
            hist_edge = cv2.calcHist([mag.astype(np.uint8)], [0], None, [32], [0, 256])
            feature_vector = np.concatenate([hist_b.flatten(), hist_g.flatten(), hist_r.flatten(), hist_edge.flatten()])
            norm = np.linalg.norm(feature_vector)
            if norm > 0:
                feature_vector = feature_vector / norm
            return feature_vector
        except Exception:
            return None

    def detect_faces(self, frame: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """Mendeteksi kotak wajah (x, y, w, h) dari frame video atau foto profil dengan inferensi FaceNet MTCNN."""
        boxes = []
        if frame is None or frame.size == 0:
            return boxes

        h_frame, w_frame = frame.shape[:2]

        if self.mtcnn_detector is not None:
            try:
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_img = Image.fromarray(rgb_frame)
                detected_boxes, probs = self.mtcnn_detector.detect(pil_img)

                if detected_boxes is not None:
                    for i, box in enumerate(detected_boxes):
                        prob = probs[i] if probs is not None else 1.0
                        if prob is not None and prob >= 0.40:
                            x1, y1, x2, y2 = box
                            x1 = max(0, int(x1))
                            y1 = max(0, int(y1))
                            x2 = min(w_frame, int(x2))
                            y2 = min(h_frame, int(y2))
                            bw = x2 - x1
                            bh = y2 - y1
                            if bw >= 16 and bh >= 16:
                                boxes.append((x1, y1, bw, bh))
            except Exception as e:
                pass

        return boxes

    def match_face(self, face_crop: np.ndarray, threshold: float = 0.65) -> Optional[Tuple[FaceUserRecord, float]]:
        """Mencocokkan potongan wajah dengan database FaceNet 512-D vector embedding pengguna."""
        if not self.user_database or face_crop.size == 0:
            return None

        detected_vec = self._compute_facenet_embedding(face_crop)
        if detected_vec is None:
            return None

        best_match: Optional[FaceUserRecord] = None
        highest_similarity = 0.0

        for user_id, record in self.user_database.items():
            if record.embedding is not None:
                # Cosine Similarity: dot(u, v) / (|u| * |v|)
                sim = float(np.dot(detected_vec, record.embedding))
                if sim > highest_similarity:
                    highest_similarity = sim
                    best_match = record

        if best_match is not None and highest_similarity >= threshold:
            return best_match, highest_similarity

        return None
