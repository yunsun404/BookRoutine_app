// .tflite 모델 파일을 앱에 포함시키기 위한 설정 (fast-tflite 문서 안내 사항)
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('tflite');

module.exports = config;