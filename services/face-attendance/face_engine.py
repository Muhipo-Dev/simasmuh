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

# Optimasi CPU: Batasi thread torch agar tidak membebani 100% core CPU dan mencegah perangkat panas
num_cores = os.cpu_count() or 4
cpu_threads = max(1, min(2, num_cores // 2))
torch.set_num_threads(cpu_threads)
try:
    cv2.setNumThreads(cpu_threads)
except Exception:
    pass

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
        
        # Pemrosesan tetap di CPU dengan mode hemat daya & termal aman
        self.device = torch.device('cpu')
        self.device_name = f"CPU Eco-Safe ({cpu_threads} Threads)"
        
        self.facenet_model: Optional[InceptionResnetV1] = None
        self.mtcnn_detector: Optional[MTCNN] = None
        self.cascade_detector = None
        self.is_ready = False
        self.cache_file = os.path.join(os.path.dirname(__file__), "face_vectors_cache.npz")
        
        self._init_facenet()
        self._init_cascade_fallback()

    def _init_facenet(self):
        """Inisialisasi Model FaceNet Inception-ResNet-v1 (512-D) & MTCNN dengan konfigurasi CPU hemat daya."""
        print(f"[INFO] Memuat Model AI FaceNet pada compute: {self.device_name}...")
        try:
            if FACENET_AVAILABLE:
                # MTCNN detector teroptimasi untuk CPU
                self.mtcnn_detector = MTCNN(
                    image_size=160,
                    margin=20,
                    min_face_size=24,
                    thresholds=[0.6, 0.7, 0.7],
                    factor=0.709,
                    post_process=True,
                    keep_all=True,
                    device=self.device
                )
                # InceptionResnetV1 pretrained VGGFace2
                self.facenet_model = InceptionResnetV1(pretrained='vggface2').eval().to(self.device)
                print(f"[INFO] FaceNet Inception-ResNet-v1 (512-D) & MTCNN berhasil dimuat ({self.device_name}).")
            else:
                print("[WARN] facenet-pytorch belum terpasang.")
        except Exception as e:
            print(f"[ERROR] Gagal memuat FaceNet / MTCNN: {e}")
            self.facenet_model = None
            self.mtcnn_detector = None

        self.is_ready = True

    def _init_cascade_fallback(self):
        """Inisialisasi OpenCV Haar Cascade sebagai pre-detector ringan hemat CPU."""
        try:
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            if os.path.exists(cascade_path):
                self.cascade_detector = cv2.CascadeClassifier(cascade_path)
        except Exception:
            self.cascade_detector = None

    def sync_database_from_backend(self) -> Tuple[int, int]:
        """Mengunduh foto profil pengguna dari basis data SIMASMUH dan menghitung FaceNet 512-D embedding."""
        print("[INFO] Memulai sinkronisasi profil pengguna ke FaceNet 512-D vector embedding...")
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

            print(f"[INFO] Sinkronisasi FaceNet selesai: {total_fetched} pengguna, {success_embedded} vektor wajah aktif.")
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

        return self._extract_face_crop_and_embed(img)

    def _extract_face_crop_and_embed(self, full_img: np.ndarray) -> Optional[np.ndarray]:
        """Deteksi area wajah pada foto dan hitung FaceNet embedding."""
        try:
            faces = self.detect_faces(full_img)
            if faces:
                largest = max(faces, key=lambda b: b[2] * b[3])
                x, y, w, h = largest
                pad_y = int(h * 0.1)
                pad_x = int(w * 0.1)
                y1 = max(0, y - pad_y)
                y2 = min(full_img.shape[0], y + h + pad_y)
                x1 = max(0, x - pad_x)
                x2 = min(full_img.shape[1], x + w + pad_x)
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
                pass

        # Fallback Histogram Features jika model belum siap
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
        """Mendeteksi kotak wajah (x, y, w, h) dari frame video atau foto profil dengan inferensi CPU ringan & akurat."""
        boxes = []
        if frame is None or frame.size == 0:
            return boxes

        h_frame, w_frame = frame.shape[:2]

        # Downsample frame untuk inferensi jika resolusi lebih besar dari 480p (Hemat CPU & Cepat)
        scale = 1.0
        if w_frame > 480:
            scale = 480.0 / float(w_frame)
            infer_w = 480
            infer_h = int(h_frame * scale)
            infer_frame = cv2.resize(frame, (infer_w, infer_h))
        else:
            infer_frame = frame

        # 1. Coba deteksi dengan MTCNN
        if self.mtcnn_detector is not None:
            try:
                rgb_frame = cv2.cvtColor(infer_frame, cv2.COLOR_BGR2RGB)
                pil_img = Image.fromarray(rgb_frame)
                detected_boxes, probs = self.mtcnn_detector.detect(pil_img)

                if detected_boxes is not None:
                    inv_scale = 1.0 / scale
                    for i, box in enumerate(detected_boxes):
                        prob = probs[i] if probs is not None else 1.0
                        if prob is not None and prob >= 0.50:
                            x1, y1, x2, y2 = box
                            x1 = max(0, int(x1 * inv_scale))
                            y1 = max(0, int(y1 * inv_scale))
                            x2 = min(w_frame, int(x2 * inv_scale))
                            y2 = min(h_frame, int(y2 * inv_scale))
                            bw = x2 - x1
                            bh = y2 - y1
                            if bw >= 20 and bh >= 20:
                                boxes.append((x1, y1, bw, bh))
            except Exception:
                pass

        # 2. Fallback Haar Cascade jika MTCNN tidak mendeteksi apapun
        if not boxes and self.cascade_detector is not None:
            try:
                gray = cv2.cvtColor(infer_frame, cv2.COLOR_BGR2GRAY)
                detected = self.cascade_detector.detectMultiScale(
                    gray,
                    scaleFactor=1.15,
                    minNeighbors=4,
                    minSize=(24, 24)
                )
                inv_scale = 1.0 / scale
                for (cx, cy, cw, ch) in detected:
                    x1 = max(0, int(cx * inv_scale))
                    y1 = max(0, int(cy * inv_scale))
                    bw = int(cw * inv_scale)
                    bh = int(ch * inv_scale)
                    boxes.append((x1, y1, bw, bh))
            except Exception:
                pass

        return boxes

    def match_face(self, face_crop: np.ndarray, threshold: float = 0.58) -> Optional[Tuple[FaceUserRecord, float]]:
        """Mencocokkan potongan wajah dengan database FaceNet 512-D vector embedding pengguna.
        Mengembalikan (user_record, similarity) jika cocok, atau None jika wajah Tamu / Tidak Terdaftar.
        """
        if not self.user_database or face_crop is None or face_crop.size == 0:
            return None

        detected_vec = self._compute_facenet_embedding(face_crop)
        if detected_vec is None:
            return None

        best_match: Optional[FaceUserRecord] = None
        highest_similarity = 0.0

        for user_id, record in self.user_database.items():
            if record.embedding is not None:
                # Cosine Similarity pada L2-normalized deep embedding
                sim = float(np.dot(detected_vec, record.embedding))
                if sim > highest_similarity:
                    highest_similarity = sim
                    best_match = record

        # Batas sensitivitas FaceNet (Default 0.58 - 0.65 optimal untuk Inception-ResNet-v1 VGGFace2)
        effective_threshold = max(0.45, min(0.85, threshold))
        if best_match is not None and highest_similarity >= effective_threshold:
            return best_match, highest_similarity

        return None
