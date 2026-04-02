from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import os
import base64
from typing import Optional

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "debug_images"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@app.get("/")
def read_root():
    return {"message": "Evaluation API is running"}

def encode_img_to_base64(img):
    _, buffer = cv2.imencode('.png', img)
    return base64.b64encode(buffer).decode('utf-8')

@app.post("/api/evaluate")
async def evaluate_image(
    sketch: UploadFile = File(...), 
    reference: Optional[UploadFile] = File(None),
    mode: str = Form("object") # フロントエンドからのモード情報
):
    try:
        # スケッチ画像の読み込み
        sketch_bytes = await sketch.read()
        nparr_s = np.frombuffer(sketch_bytes, np.uint8)
        img_sketch = cv2.imdecode(nparr_s, cv2.IMREAD_UNCHANGED)
        
        # アルファチャンネルから線画マスクを作成
        if img_sketch.shape[2] == 4:
            sketch_alpha = img_sketch[:, :, 3]
            _, sketch_mask = cv2.threshold(sketch_alpha, 10, 255, cv2.THRESH_BINARY)
        else:
            gray_s = cv2.cvtColor(img_sketch, cv2.COLOR_BGR2GRAY)
            _, sketch_mask = cv2.threshold(gray_s, 240, 255, cv2.THRESH_BINARY_INV)

        score = 0
        eval_msg = "お手本画像がありません。"
        res_images = {}
        
        if reference:
            ref_bytes = await reference.read()
            nparr_r = np.frombuffer(ref_bytes, np.uint8)
            img_ref = cv2.imdecode(nparr_r, cv2.IMREAD_COLOR)
            
            # --- フロントエンドのキャンバスサイズに素直にリサイズ ---
            # フロント側で比率を合わせているため、ここでそのままリサイズしても画像は歪みません
            img_ref_resized = cv2.resize(img_ref, (img_sketch.shape[1], img_sketch.shape[0]))
            
            if mode == "object":
                # --- 【ものモード】素直に重ねて評価 ---
                gray_ref = cv2.cvtColor(img_ref_resized, cv2.COLOR_BGR2GRAY)
                edges_ref = cv2.Canny(gray_ref, 50, 150)
                
                kernel = np.ones((5,5), np.uint8)
                edges_ref_dilated = cv2.dilate(edges_ref, kernel, iterations=1)

                overlap = cv2.bitwise_and(sketch_mask, edges_ref_dilated)
                overlap_count = cv2.countNonZero(overlap)
                sketch_count = cv2.countNonZero(sketch_mask)

                if sketch_count > 100:
                    score = int((overlap_count / sketch_count) * 100)
                    if score > 70: eval_msg = "素晴らしい！形を正確に捉えられています。"
                    elif score > 40: eval_msg = "良い調子です。全体のバランスを意識しましょう。"
                    else: eval_msg = "もっとお手本をよく観察してみましょう！"
                else:
                    eval_msg = "もう少し描き込んでから評価してみましょう。"

                H, W = img_sketch.shape[:2]
                
                b64_ref = encode_img_to_base64(img_ref_resized)
                
                sketch_vis = np.full((H, W, 3), 255, dtype=np.uint8)
                sketch_vis[sketch_mask > 0] = [0, 0, 0]
                b64_sketch = encode_img_to_base64(sketch_vis)
                
                b64_edge = encode_img_to_base64(cv2.cvtColor(cv2.bitwise_not(edges_ref), cv2.COLOR_GRAY2BGR))
                
                white_bg = np.full((H, W, 3), 255, dtype=np.uint8)
                overlay_vis = cv2.addWeighted(img_ref_resized, 0.4, white_bg, 0.6, 0)
                miss = cv2.bitwise_and(sketch_mask, cv2.bitwise_not(edges_ref_dilated))
                overlay_vis[miss > 0] = [0, 0, 255] # 赤
                overlay_vis[overlap > 0] = [0, 255, 0] # 緑
                b64_overlay = encode_img_to_base64(overlay_vis)

                res_images = {
                    "reference": b64_ref,
                    "sketch": b64_sketch,
                    "edge": b64_edge,
                    "overlay": b64_overlay
                }

            elif mode == "human":
                # --- 【人体モード】今後の骨格検出ロジック用 ---
                gray_ref = cv2.cvtColor(img_ref_resized, cv2.COLOR_BGR2GRAY)
                edges_ref = cv2.Canny(gray_ref, 50, 150)
                kernel = np.ones((5,5), np.uint8)
                edges_ref_dilated = cv2.dilate(edges_ref, kernel, iterations=1)
                overlap = cv2.bitwise_and(sketch_mask, edges_ref_dilated)
                overlap_count = cv2.countNonZero(overlap)
                sketch_count = cv2.countNonZero(sketch_mask)
                
                if sketch_count > 100:
                    score = int((overlap_count / sketch_count) * 100)
                    eval_msg = "【人体モード】現在はものモードと同じ判定です。次に骨格検出AIを実装します！"
                else:
                    eval_msg = "もう少し描き込んでください。"

                H, W = img_sketch.shape[:2]
                sketch_vis = np.full((H, W, 3), 255, dtype=np.uint8)
                sketch_vis[sketch_mask > 0] = [0, 0, 0]
                white_bg = np.full((H, W, 3), 255, dtype=np.uint8)
                overlay_vis = cv2.addWeighted(img_ref_resized, 0.4, white_bg, 0.6, 0)
                miss = cv2.bitwise_and(sketch_mask, cv2.bitwise_not(edges_ref_dilated))
                overlay_vis[miss > 0] = [0, 0, 255]
                overlay_vis[overlap > 0] = [0, 255, 0]

                res_images = {
                    "reference": encode_img_to_base64(img_ref_resized),
                    "sketch": encode_img_to_base64(sketch_vis),
                    "edge": encode_img_to_base64(cv2.cvtColor(cv2.bitwise_not(edges_ref), cv2.COLOR_GRAY2BGR)),
                    "overlay": encode_img_to_base64(overlay_vis)
                }

        density = (cv2.countNonZero(sketch_mask) / (img_sketch.shape[0] * img_sketch.shape[1])) * 100

        return {
            "status": "success",
            "score": score,
            "evaluation_message": eval_msg,
            "image_info": {"density": f"{density:.2f}%"},
            "images": res_images
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e), "status": "failed"}