import os
import io
import time
import math
import gc
import numpy as np
import cv2
import requests
import torch
from PIL import Image
from typing import List, Dict, Tuple, Optional

# Optimasi CPU Super Eco: Batasi thread PyTorch dan OpenCV agar tidak membebani core CPU
torch.set_num_threads(1)
try:
    torch.set_num_interop_threads(1)
except Exception:
    pass
try:
    cv2.setNumThreads(1)
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
        
        # Mode CPU Ultra-Eco
        self.device = torch.device('cpu')
        self.device_name = "CPU Eco-Safe (1 Thread, Low Power)"
        
        self.facenet_model: Optional[InceptionResnetV1] = None
        self.mtcnn_detector: Optional[MTCNN] = None
        self.cascade_detector = None
        self.is_ready = False
        self.cache_file = os.path.join(os.path.dirname(__file__), "face_vectors_cache.npz")
        
        self._init_cascade_fallback()
        self._init_facenet()

    def _init_facenet(self):
        """Inisialisasi Model FaceNet Inception-ResNet-v1 (512-D) & MTCNN dengan konfigurasi CPU hemat daya."""
        print(f"[INFO] Memuat Model AI FaceNet pada compute: {self.device_name}...")
        try:
            if FACENET_AVAILABLE:
                # MTCNN detector teroptimasi untuk CPU
                self.mtcnn_detector = MTCNN(
                    image_size=160,
                    margin=16,
                    min_face_size=28,
                    thresholds=[0.65, 0.75, 0.75],
                    factor=0.709,
                    post_process=True,
                    keep_all=True,
                    device=self.device
                )
                # InceptionResnetV1 pretrained VGGFace2
                self.facenet_model = InceptionResnetV1(pretrained='vggface2').eval().to(self.device)
                print(f"[INFO] FaceNet Inception-ResNet-v1 (512-D) & MTCNN siap ({self.device_name}).")
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

    def sync_database_from_backend(self, force_refresh: bool = False) -> Tuple[int, int]:
        """Mengunduh profil pengguna dan menggunakan cache vektor untuk bootstrap instan tanpa membebani CPU."""
        print("[INFO] Memulai sinkronisasi profil pengguna ke FaceNet vector embedding...")
        
        # 1. Baca cache lama jika tersedia (kecuali jika force_refresh)
        cached_vectors: Dict[str, np.ndarray] = {}
        if not force_refresh and os.path.exists(self.cache_file):
            try:
                npz = np.load(self.cache_file)
                for k in npz.files:
                    cached_vectors[k] = npz[k]
                print(f"[INFO] Ditemukan {len(cached_vectors)} vektor wajah dari cache lokal.")
            except Exception:
                pass

        try:
            from config import API_KEY
            headers = {"x-api-key": API_KEY}
            res = requests.get(f"{self.backend_url}/face-attendance/users-dataset", headers=headers, timeout=15)
            if res.status_code != 200:
                print(f"[ERROR] Backend returned status {res.status_code}")
                return self._load_from_local_cache()
            
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

                # Cek apakah sudah ada di cache sebelumnya
                if user_id in cached_vectors and not force_refresh:
                    record.embedding = cached_vectors[user_id]
                    vectors_to_save[user_id] = cached_vectors[user_id]
                    success_embedded += 1
                else:
                    # Hitung embedding baru hanya jika ada foto
                    embedding = self._extract_user_embedding(record)
                    if embedding is not None:
                        record.embedding = embedding
                        vectors_to_save[user_id] = embedding
                        success_embedded += 1

                new_db[user_id] = record

            self.user_database = new_db

            # Simpan cache vektor lokal untuk bootstrap instan berikutnya
            self._save_cache()

            # Bersihkan garbage collection
            gc.collect()
            print(f"[INFO] Sinkronisasi FaceNet selesai: {total_fetched} pengguna ({success_embedded} bervektor wajah).")
            return total_fetched, success_embedded

        except Exception as e:
            print(f"[ERROR] Exception saat sinkronisasi database: {e}")
            return self._load_from_local_cache()

    def _save_cache(self):
        """Menyimpan seluruh vektor pengguna berfoto ke file cache .npz terkompresi."""
        vectors_to_save: Dict[str, np.ndarray] = {}
        for uid, rec in self.user_database.items():
            if rec.embedding is not None:
                vectors_to_save[uid] = rec.embedding
        if vectors_to_save:
            try:
                np.savez_compressed(self.cache_file, **vectors_to_save)
            except Exception as e:
                print(f"[WARN] Gagal menyimpan cache vektor FaceNet: {e}")

    def sync_single_user(self, item: Dict) -> Tuple[bool, str]:
        """Menyinkronkan satu profil pengguna secara langsung setelah foto diupload (Supabase / direktori lokal)."""
        user_id = item.get("userId") or item.get("id")
        if not user_id:
            return False, "User ID tidak valid"

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
            self.user_database[user_id] = record
            self._save_cache()
            print(f"[INFO] Vektor wajah baru FaceNet berhasil ditambahkan: [{role}] {name} ({identifier})")
            return True, f"Vektor wajah {name} ({role}) berhasil disinkronkan ke AI FaceNet."
        else:
            self.user_database[user_id] = record
            print(f"[WARN] Pengguna {name} tersinkronisasi tetapi wajah tidak terdeteksi pada foto.")
            return False, f"Pengguna {name} tersinkronisasi, namun wajah tidak terdeteksi pada foto."

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
        
        # 1. Coba baca dari record.local_path jika ada
        if record.local_path and os.path.exists(record.local_path):
            try:
                img = cv2.imdecode(np.fromfile(record.local_path, dtype=np.uint8), cv2.IMREAD_COLOR)
                if img is None:
                    img = cv2.imread(record.local_path)
            except Exception:
                img = None

        # 2. Coba cari di storage root lokal jika avatar_url mengarah ke /uploads/
        if img is None and record.avatar_url:
            storage_root = os.environ.get("STORAGE_PATH", "D:/simasmuh_storage" if os.name == 'nt' else os.path.expanduser("~/simasmuh_storage"))
            clean_rel = record.avatar_url.replace("/uploads/", "").lstrip("/\\")
            possible_paths = [
                os.path.join(storage_root, clean_rel),
                os.path.join(storage_root, "profiles", clean_rel),
                os.path.join(storage_root, os.path.basename(clean_rel)),
                os.path.join(storage_root, "profiles", os.path.basename(clean_rel))
            ]
            for p in possible_paths:
                if os.path.exists(p):
                    try:
                        img = cv2.imdecode(np.fromfile(p, dtype=np.uint8), cv2.IMREAD_COLOR)
                        if img is not None:
                            break
                    except Exception:
                        pass

        # 3. Fallback: Download via HTTP dari backend
        if img is None and record.avatar_url:
            try:
                url = record.avatar_url
                if url.startswith("/"):
                    url = f"{self.backend_url}{url}"
                r = requests.get(url, timeout=10)
                if r.status_code == 200:
                    arr = np.frombuffer(r.content, np.uint8)
                    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            except Exception:
                img = None

        if img is None:
            return None

        return self._extract_face_crop_and_embed(img)

    def _extract_face_crop_and_embed(self, full_img: np.ndarray) -> Optional[np.ndarray]:
        """Ekstraksi embedding wajah dari foto profil utuh dengan MTCNN landmark alignment & multi-angle augmentation."""
        if full_img is None or full_img.size == 0:
            return None
        return self._compute_facenet_embedding(full_img, is_registration=True)

    def _compute_facenet_embedding(self, face_img: np.ndarray, is_registration: bool = False) -> Optional[np.ndarray]:
        """Menghitung representasi 512-D FaceNet L2-normalized deep embedding dengan MTCNN landmark alignment."""
        if face_img is None or face_img.size == 0:
            return None

        if self.facenet_model is not None:
            try:
                rgb = cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB)
                pil_img = Image.fromarray(rgb)
                
                # 1. Gunakan MTCNN direct landmark alignment (mata, hidung, mulut terlevelisasi)
                face_tensor = None
                if self.mtcnn_detector is not None:
                    try:
                        face_tensor = self.mtcnn_detector(pil_img)
                    except Exception:
                        face_tensor = None
                
                # Fallback ke standardized resize jika MTCNN tidak mendeteksi landmark pada sub-crop
                if face_tensor is None:
                    resized = cv2.resize(rgb, (160, 160), interpolation=cv2.INTER_AREA)
                    norm_img = (resized.astype(np.float32) - 127.5) / 128.0
                    face_tensor = torch.from_numpy(norm_img).permute(2, 0, 1).float()
                
                if face_tensor.dim() == 3:
                    face_tensor = face_tensor.unsqueeze(0)
                face_tensor = face_tensor.to(self.device)
                
                with torch.inference_mode():
                    raw_emb = self.facenet_model(face_tensor).cpu().numpy()[0]
                
                # Jika registration (foto profil), kombinasikan dengan embedding mirrored untuk toleransi webcam flip
                if is_registration:
                    try:
                        pil_flip = pil_img.transpose(Image.FLIP_LEFT_RIGHT)
                        face_tensor_flip = None
                        if self.mtcnn_detector is not None:
                            try:
                                face_tensor_flip = self.mtcnn_detector(pil_flip)
                            except Exception:
                                pass
                        if face_tensor_flip is None:
                            rgb_flip = cv2.flip(rgb, 1)
                            resized_flip = cv2.resize(rgb_flip, (160, 160), interpolation=cv2.INTER_AREA)
                            norm_flip = (resized_flip.astype(np.float32) - 127.5) / 128.0
                            face_tensor_flip = torch.from_numpy(norm_flip).permute(2, 0, 1).float()
                        
                        if face_tensor_flip.dim() == 3:
                            face_tensor_flip = face_tensor_flip.unsqueeze(0)
                        face_tensor_flip = face_tensor_flip.to(self.device)
                        
                        with torch.inference_mode():
                            raw_emb_flip = self.facenet_model(face_tensor_flip).cpu().numpy()[0]
                        
                        combined = raw_emb + raw_emb_flip
                        norm = np.linalg.norm(combined)
                        if norm > 0:
                            return combined / norm
                    except Exception:
                        pass

                norm = np.linalg.norm(raw_emb)
                if norm > 0:
                    raw_emb = raw_emb / norm
                return raw_emb
            except Exception as e:
                print(f"[WARN] Error komputasi FaceNet embedding: {e}")

        # Fallback Histogram Features jika model belum siap
        try:
            resized = cv2.resize(face_img, (112, 112))
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
        """Mendeteksi wajah (x, y, w, h) dengan pre-filter ringan hemat CPU 320p."""
        boxes = []
        if frame is None or frame.size == 0:
            return boxes

        h_frame, w_frame = frame.shape[:2]

        # Downsample frame untuk inferensi jika resolusi lebih besar dari 320p (Ultra Cepat & Ringan)
        scale = 1.0
        if w_frame > 320:
            scale = 320.0 / float(w_frame)
            infer_w = 320
            infer_h = int(h_frame * scale)
            infer_frame = cv2.resize(frame, (infer_w, infer_h))
        else:
            infer_frame = frame

        # 1. Cek cepat Haar Cascade untuk deteksi kandidat
        if self.cascade_detector is not None:
            try:
                gray = cv2.cvtColor(infer_frame, cv2.COLOR_BGR2GRAY)
                detected = self.cascade_detector.detectMultiScale(
                    gray,
                    scaleFactor=1.18,
                    minNeighbors=4,
                    minSize=(20, 20)
                )
                if len(detected) == 0 and self.mtcnn_detector is None:
                    return []
                
                inv_scale = 1.0 / scale
                for (cx, cy, cw, ch) in detected:
                    x1 = max(0, int(cx * inv_scale))
                    y1 = max(0, int(cy * inv_scale))
                    bw = int(cw * inv_scale)
                    bh = int(ch * inv_scale)
                    boxes.append((x1, y1, bw, bh))
            except Exception:
                pass

        # 2. Jika MTCNN tersedia dan ada indikasi wajah / deteksi lanjutan
        if self.mtcnn_detector is not None and (len(boxes) > 0 or self.cascade_detector is None):
            try:
                rgb_frame = cv2.cvtColor(infer_frame, cv2.COLOR_BGR2RGB)
                pil_img = Image.fromarray(rgb_frame)
                with torch.inference_mode():
                    detected_boxes, probs = self.mtcnn_detector.detect(pil_img)

                if detected_boxes is not None and len(detected_boxes) > 0:
                    mtcnn_boxes = []
                    inv_scale = 1.0 / scale
                    for i, box in enumerate(detected_boxes):
                        prob = probs[i] if probs is not None else 1.0
                        if prob is not None and prob >= 0.60:
                            x1, y1, x2, y2 = box
                            x1 = max(0, int(x1 * inv_scale))
                            y1 = max(0, int(y1 * inv_scale))
                            x2 = min(w_frame, int(x2 * inv_scale))
                            y2 = min(h_frame, int(y2 * inv_scale))
                            bw = x2 - x1
                            bh = y2 - y1
                            if bw >= 20 and bh >= 20:
                                mtcnn_boxes.append((x1, y1, bw, bh))
                    if mtcnn_boxes:
                        return mtcnn_boxes
            except Exception:
                pass

        return boxes

    def match_face(self, face_crop: np.ndarray, threshold: float = 0.48) -> Optional[Tuple[FaceUserRecord, float]]:
        """Mencocokkan potongan wajah dengan database FaceNet 512-D vector embedding pengguna."""
        if not self.user_database or face_crop is None or face_crop.size == 0:
            return None

        detected_vec = self._compute_facenet_embedding(face_crop, is_registration=False)
        if detected_vec is None:
            return None

        best_match: Optional[FaceUserRecord] = None
        highest_similarity = 0.0

        for user_id, record in self.user_database.items():
            if record.embedding is not None:
                sim = float(np.dot(detected_vec, record.embedding))
                if sim > highest_similarity:
                    highest_similarity = sim
                    best_match = record

        effective_threshold = max(0.40, min(0.80, threshold))
        if best_match is not None and highest_similarity >= effective_threshold:
            return best_match, highest_similarity

        return None

