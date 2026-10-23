/**
 * 눈 자르기 — 학습 때 eye_extractor.py 와 같은 방식으로 앱에서 눈 이미지를 만든다.
 *
 * 학습 때 (eye_extractor.py)                     앱 (이 파일)
 *  ① 두 눈 구석점으로 기울기 계산         →   ML Kit 눈 윤곽 16점 중 가장 왼쪽/오른쪽 점 = 구석점
 *  ② 전체 얼굴을 회전해서 눈을 수평으로     →   눈 주변만 넉넉히 잘라서 회전 (같은 결과, 훨씬 빠름)
 *  ③ 눈 윤곽 범위 × 1.8 정사각형으로 자름   →   동일
 *  ④ 64×64로 축소                           →   동일 (네이티브 resize)
 *  ⑤ (dataset.py) BGR→RGB                   →   픽셀 형식(RGBA/BGRA)을 읽어서 RGB로 맞춤
 *     /255, -1~1 정규화                      →   변환된 모델 안에서 처리 (여기선 0~255 그대로)
 *
 * 모델의 left_eye = "사진에서 왼쪽에 보이는 눈". ML Kit 이름(LEFT/RIGHT) 대신 x 좌표로 판단한다.
 *
 * planEyeCrops / rotatePoint / rawToRgbFloat 는 순수 함수 → 기기 없이 테스트 가능
 */
import type { Image, RawPixelData } from 'react-native-nitro-image';

import { GAZE_CONFIG } from './gazeConfig';

export type Pt = { x: number; y: number };

/** 한쪽 눈을 자르는 계획 (원본 사진 좌표 기준) */
export interface EyeCropPlan {
  /** 1차: 회전 여유분까지 포함한 넉넉한 직사각형 */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** 1차로 자른 이미지 중심 → 눈 중심까지의 거리 (회전 전) */
  offset: Pt;
  /** 최종 정사각형 한 변 (원본 픽셀 단위) */
  side: number;
}

export interface EyePairPlan {
  /** 사진 왼쪽에 보이는 눈 → 모델 입력 0 */
  left: EyeCropPlan;
  /** 사진 오른쪽에 보이는 눈 → 모델 입력 1 */
  right: EyeCropPlan;
  /** 두 눈을 잇는 선의 기울기 (도, 아래로 기울면 +) */
  tiltDeg: number;
  eyeDist: number;
}

const mean = (pts: Pt[]): Pt => ({
  x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
  y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
});

/** 눈 윤곽에서 양쪽 구석점(가장 왼쪽 점, 가장 오른쪽 점)의 가운데 */
function cornerCenter(pts: Pt[]): Pt {
  let minP = pts[0];
  let maxP = pts[0];
  for (const p of pts) {
    if (p.x < minP.x) minP = p;
    if (p.x > maxP.x) maxP = p;
  }
  return { x: (minP.x + maxP.x) / 2, y: (minP.y + maxP.y) / 2 };
}

/** 점 p를 c 중심으로 rad 만큼 회전 (화면 좌표: y 아래가 +, rad>0 이면 시계 방향) */
export function rotatePoint(p: Pt, c: Pt, rad: number): Pt {
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos };
}

function planOne(ring: Pt[], eyeMid: Pt, levelRad: number, imgW: number, imgH: number): EyeCropPlan | null {
  // ③ 눈을 수평으로 맞춘 상태에서 윤곽 범위(ptp)를 재고 × 1.8
  const leveled = ring.map((p) => rotatePoint(p, eyeMid, levelRad));
  const xs = leveled.map((p) => p.x);
  const ys = leveled.map((p) => p.y);
  const ptp = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const side = ptp * GAZE_CONFIG.EYE_BOX_SCALE;
  if (side < 4) return null;

  // 회전해도 정사각형이 잘리지 않게 √2 배 + 여유 2px
  const center = mean(ring);
  const half = (side / 2) * Math.SQRT2 + 2;
  const x1 = Math.max(0, Math.floor(center.x - half));
  const y1 = Math.max(0, Math.floor(center.y - half));
  const x2 = Math.min(imgW, Math.ceil(center.x + half));
  const y2 = Math.min(imgH, Math.ceil(center.y + half));
  if (x2 - x1 < 8 || y2 - y1 < 8) return null;

  return {
    x1, y1, x2, y2,
    offset: { x: center.x - (x1 + x2) / 2, y: center.y - (y1 + y2) / 2 },
    side,
  };
}

/**
 * ML Kit 눈 윤곽 두 개 → 양쪽 눈 자르기 계획
 * @param eyeA ML Kit LEFT_EYE 윤곽 / @param eyeB ML Kit RIGHT_EYE 윤곽 (순서 상관없음)
 */
export function planEyeCrops(eyeA: Pt[], eyeB: Pt[], imgW: number, imgH: number): EyePairPlan | null {
  if (eyeA.length < 4 || eyeB.length < 4) return null;
  // 사진에서 왼쪽에 있는 눈 = 모델의 left_eye
  const [imgLeft, imgRight] = mean(eyeA).x <= mean(eyeB).x ? [eyeA, eyeB] : [eyeB, eyeA];

  // ① 기울기 (eye_extractor: atan2(dy, dx))
  const lc = cornerCenter(imgLeft);
  const rc = cornerCenter(imgRight);
  const dx = rc.x - lc.x;
  const dy = rc.y - lc.y;
  const eyeDist = Math.hypot(dx, dy);
  if (eyeDist < GAZE_CONFIG.MIN_EYE_DIST_PX) return null;
  const tiltRad = Math.atan2(dy, dx);
  const eyeMid = { x: (lc.x + rc.x) / 2, y: (lc.y + rc.y) / 2 };

  const left = planOne(imgLeft, eyeMid, -tiltRad, imgW, imgH);
  const right = planOne(imgRight, eyeMid, -tiltRad, imgW, imgH);
  if (!left || !right) return null;
  return { left, right, tiltDeg: (tiltRad * 180) / Math.PI, eyeDist };
}

/** 네이티브 이미지 픽셀(RGBA/BGRA/...) → 모델 입력 Float32 [64*64*3] RGB 0~255 */
export function rawToRgbFloat(raw: RawPixelData, size: number = GAZE_CONFIG.EYE_SIZE): Float32Array {
  const fmt = raw.pixelFormat;
  const bpp = fmt === 'RGB' || fmt === 'BGR' ? 3 : 4;
  // [R, G, B] 가 각각 몇 번째 바이트인지
  const idx: Record<string, [number, number, number]> = {
    RGBA: [0, 1, 2], RGBX: [0, 1, 2], RGB: [0, 1, 2],
    BGRA: [2, 1, 0], BGRX: [2, 1, 0], BGR: [2, 1, 0],
    ARGB: [1, 2, 3], XRGB: [1, 2, 3],
    ABGR: [3, 2, 1], XBGR: [3, 2, 1],
  };
  const order = idx[fmt];
  if (!order) throw new Error(`지원하지 않는 픽셀 형식: ${fmt}`);

  const bytes = new Uint8Array(raw.buffer);
  const rowBytes = Math.floor(bytes.length / raw.height); // 줄 끝 여백(stride)이 있어도 안전
  const out = new Float32Array(size * size * 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const s = y * rowBytes + x * bpp;
      const d = (y * size + x) * 3;
      out[d] = bytes[s + order[0]];
      out[d + 1] = bytes[s + order[1]];
      out[d + 2] = bytes[s + order[2]];
    }
  }
  return out;
}

/** 계획대로 실제 이미지를 잘라서 64×64 눈 이미지 + 모델 입력값을 만든다 */
export async function cropEye(
  image: Image,
  plan: EyeCropPlan,
  tiltDeg: number,
): Promise<{ eye: Image; tensor: Float32Array }> {
  const size = GAZE_CONFIG.EYE_SIZE;
  // ② 1차로 넉넉히 자른 뒤, 눈이 수평이 되도록 -tilt 만큼 회전
  const rough = await image.cropAsync(plan.x1, plan.y1, plan.x2, plan.y2);
  const levelDeg = -tiltDeg;
  const rotated = await rough.rotateAsync(GAZE_CONFIG.ROTATE_CLOCKWISE_POSITIVE ? levelDeg : -levelDeg, false);

  // 회전 후에도 "이미지 중심"은 그대로 → 눈 중심 = 새 중심 + 회전된 offset
  const off = rotatePoint(plan.offset, { x: 0, y: 0 }, (levelDeg * Math.PI) / 180);
  const cx = rotated.width / 2 + off.x;
  const cy = rotated.height / 2 + off.y;
  const h = plan.side / 2;
  const sx1 = Math.max(0, Math.round(cx - h));
  const sy1 = Math.max(0, Math.round(cy - h));
  const sx2 = Math.min(rotated.width, Math.round(cx + h));
  const sy2 = Math.min(rotated.height, Math.round(cy + h));

  // ③ 정사각형으로 자르고 ④ 64×64 축소
  const square = await rotated.cropAsync(sx1, sy1, sx2, sy2);
  const eye = await square.resizeAsync(size, size);
  const raw = await eye.toRawPixelDataAsync(false);
  const tensor = rawToRgbFloat(raw, size);

  rough.dispose();
  rotated.dispose();
  square.dispose();
  return { eye, tensor };
}
