# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

BookRoutine: a reading-habit app (Expo SDK 54, React Native 0.81, React 19, expo-router v6 with typed routes, React Compiler and New Architecture enabled). It talks to a separate backend (not in this repo) at `${EXPO_PUBLIC_API_BASE_URL}/api/v1`, defaulting to `http://localhost:3000/api/v1`. Code comments and UI strings are in Korean, so keep new ones in Korean too.

## Commands

```bash
npm install
npx expo start            # dev server (needs a dev-client build, see below)
npm run android           # expo run:android: local native build + run
npm run lint              # expo lint (eslint-config-expo)
npx tsc --noEmit          # type check (strict mode)
eas build -p android --profile development   # dev-client APK
eas build -p android --profile preview       # internal APK pointed at https://api.bookroutine.cloud
```

**Expo Go does not work.** The gaze feature uses native modules (`react-native-vision-camera` v5, `react-native-vision-camera-face-detector`, `react-native-fast-tflite`, `react-native-nitro-image`). You need a dev-client build (`expo-dev-client`), and the camera path is Android-first: the `snapshot` capture mode is Android-only and `minSdkVersion` is 26.

**Tests:** `*.spec.ts` files exist in `lib/gaze/` and `lib/focus/` (Jest-style `describe`/`it`/`expect`), but no test runner is installed or configured in `package.json`. To run them, you would first need to add one (for example `jest-expo` or `ts-jest`). Don't assume `npm test` works.

## Architecture

- `app/` is file-based routing. `app/_layout.tsx` is the root Stack plus a global `FloatingTabMenu`; `(tabs)`, `(auth)`, `(profile)` are route groups. `app/dev/gaze-check.tsx` and `gaze-collect.tsx` are developer screens for debugging the gaze pipeline.
- **Two HTTP clients coexist:** `lib/api.ts` (fetch wrapper, used by auth/profile/group screens) and `lib/api/client.ts` (axios, used by `lib/api/ebooks.ts`, `journal.ts`, `reading-room.ts`). Both read the token from AsyncStorage key `access_token`. Match whichever client the surrounding feature already uses.
- Global auth state lives in `store/useAuthStore.ts` (zustand). `lib/supabase.ts` is also present.
- Shared types for the e-book/focus flow live in `lib/types/ebook.ts`.

### On-device gaze → focus pipeline (the core feature)

This runs entirely on the device. Images are never stored or sent; only the 30-second aggregates go to the server.

```
useGazeSampler (lib/gaze)      every 500ms (250ms during calibration): camera snapshot → ML Kit face
                               → eyeCrop → assets/models/gaze.tflite → GazeSample
  ↓ via hooks/useGazeFocusTracker.ts
FocusJudge (lib/gaze/focusJudge.ts)   GazeSample → 'focused' | 'unfocused' | 'away' (+ detail)
  ↓ onFrame = pushFrame
FocusBucketBuilder (lib/focus)  frames → 30s FocusSampleInput buckets (via hooks/useFocusBucketRecorder.ts)
  ↓ drain/requeue
lib/api/ebooks.ts               sendFocusBatch (periodic) / endReadingSession (final flush)
```

The wiring happens in `app/ebook/[bookId]/read.tsx`. It passes `onFrame: pushFrame`, forwards scroll offsets to `notifyScroll` (needed for the "staring" and "skimming" detection), shows `GazeCalibrationOverlay`, and computes live stats with `goldenStatus()`.

Key invariants:
- `lib/gaze/*` and `lib/focus/*` are pure logic with no React dependency (except `useGazeSampler.ts`), so they can be tested. Keep them that way. The hooks are thin adapters.
- **Tunable thresholds are centralized** in `GAZE_CONFIG` (`gazeConfig.ts`), `FOCUS_JUDGE_POLICY`, `CALIBRATION_POLICY`, `POSTURE_POLICY`, `BUCKET_POLICY` and `GOLDEN_TIME_POLICY`. Change values there, not inline.
- **Backend contract:** each bucket is about 30s, `focusedSec + unfocusedSec + awaySec` must equal the bucket length, and the server rejects buckets under 25s, which is why `flush()` drops a short final bucket. `BUCKET_POLICY` must match the backend's policy.
- `lib/focus/goldenTime.ts` mirrors the server's `findGoldenTime` (`utils/focus-reward.util.ts`). Change both together, or the live display and the result screen will disagree.
- `eyeCrop.ts` must reproduce the training-time preprocessing (`eye_extractor.py` / `dataset.py`: 64×64, box scale 1.8, horizontal alignment, RGB). Changing the crop breaks model accuracy.
- `FocusFrameSample.detail` is for display inside the app only. It is not sent to the server, where "staring" and "skimming" both count as `unfocused`.
- Re-entering calibration during a session calls `flushCurrentBucket()`, so calibration time isn't recorded as away time. Failed captures (`error && !faceDetected`) are skipped rather than judged.

## 우리 팀 규칙 (반드시 지킬 것)
### 스택
- Expo SDK 54, React Native 0.81, expo-router, dev client 빌드
- 카메라: VisionCamera v5 (takeSnapshot), vision-camera-face-detector 2.1
- 시선 모델: react-native-fast-tflite 3.0.1, assets/models/gaze.tflite
하고 싶은 것 방법
Claude가 답하는 도중에 멈추기 Esc
Claude Code 끄기 입력창에 /exit
어제 하던 대화 이어서 하기 폴더에서 claude --continue , 또는 켜서 /resume 으로 목록에서 고르기
완료: 첫 질문에 대한 프로젝트 설명을 받았다
Claude Code 시작 안내서
Page 6 of 16
- 시선 로직: lib/gaze/, 버킷·골든타임: lib/focus/, 읽기 화면:
app/ebook/[bookId]/read.tsx
### 절대 하지 말 것
- .env, API 키, 키스토어, .pem 파일을 커밋하거나 내용을 출력하지 않는다. 변수 이름만 말한
다.
- git 관련 명령을 직접 실행하지 않는다. 사용자에게 권장한다. 
- `git add .` 금지. 항상 파일 경로를 지정한다.
- main 브랜치에서 직접 작업하거나 push하지 않는다.
- EXPO_PUBLIC_ 변수에 비밀값(OpenAI 키, service_role 키)을 넣지 않는다.
### 먼저 물어볼 것
- 패키지 추가·버전 변경 (네이티브 모듈은 재빌드가 필요하다)
- 골든타임·버킷 규칙 변경 (서버와 같아야 한다)
- 팀원이 만든 파일(lib/supabase.ts 등) 수정
- 파일 삭제
### 작업 방식
- 코드를 고치기 전에 전체 흐름과 계획을 먼저 짧게 설명한다.
- 필요한 정보가 없으면 추측하지 말고 멈추고 물어본다.
- 수정 후 `npx tsc --noEmit`과 테스트를 실행해 통과를 확인한다.
- 설명은 한국어로, 초등학생도 이해할 수 있게 한다.

- 모든 답변, 설명, 작업 계획(Plan)은 반드시 한국어로 작성할 것.