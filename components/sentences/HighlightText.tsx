// components/sentences/HighlightText.tsx
// 문자열 안에서 검색어(terms)와 일치하는 부분만 형광펜처럼 강조해서 보여줍니다.
//
// 원리: 정규식 split에 "캡처 그룹 ( )"을 쓰면 잘라낸 구분자(=일치한 단어)도 결과 배열에 남습니다.
//   "용기를 내는 용기".split(/(용기)/gi) → ["", "용기", "를 내는 ", "용기", ""]
//   → 홀수 인덱스가 항상 "일치한 조각"이 되므로 그 조각만 강조 스타일을 입히면 됩니다.
import { P } from "@/constants/palette";
import React, { useMemo } from "react";
import { StyleProp, StyleSheet, Text, TextStyle } from "react-native";

type Props = {
  text: string;
  terms: string[];
  style?: StyleProp<TextStyle>;
  highlightStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
};

// 검색어에 ( ) . * ? 같은 정규식 특수문자가 있어도 "글자 그대로" 찾도록 이스케이프
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default function HighlightText({ text, terms, style, highlightStyle, numberOfLines }: Props) {
  const parts = useMemo(() => {
    const valid = terms.filter(Boolean);
    if (valid.length === 0) return [text];
    // 긴 단어부터 매칭해야 "용기"와 "용"이 같이 있을 때 "용기" 전체가 강조됩니다.
    const pattern = [...valid]
      .sort((a, b) => b.length - a.length)
      .map(escapeRegExp)
      .join("|");
    return text.split(new RegExp(`(${pattern})`, "gi"));
  }, [text, terms]);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <Text key={i} style={[styles.highlight, highlightStyle]}>
            {part}
          </Text>
        ) : (
          part
        )
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  highlight: {
    backgroundColor: P.accentTint,
    color: P.ink,
    fontWeight: "700",
  },
});
