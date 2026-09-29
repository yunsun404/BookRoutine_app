import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type Task = {
  id: string;
  text: string;
  done: boolean;
  dueDate: string;
};

type Props = {
  goal: string;
  tasks: Task[];
  onGoalEdit?: () => void;
  onTaskEdit?: (id: string) => void;
  onTaskToggle: (taskId: string) => void;
};

/* 리디자인 색상 (이 파일 안에서만 사용) */
const C = {
  primary: "#6B7BFF",
  ink: "#1F2233",
  inkSub: "#6E7191",
  inkMute: "#A0A3BD",
  card: "#FFFFFF",
  line: "#ECECF3",
  primarySoft: "#EEF0FF",
  peach: "#FF8A7C",
  peachSoft: "#FFF1EE",
};

function getWhenLabel(dueDate: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // 완료되지 않은 체크리스트는 기한이 지나도 계속 '오늘'로 롤오버해서 보여준다
  if (diff <= 0) return "오늘";
  if (diff === 1) return "내일";
  if (diff === 2) return "모레";
  return `${diff}일 후`;
}

export default function GoalSection({ goal, tasks, onGoalEdit, onTaskEdit, onTaskToggle }: Props) {
  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headTitle}>목표</Text>
          <Text style={styles.headBook} numberOfLines={1}>{goal}</Text>
        </View>
        <Text style={styles.count}>
          <Text style={{ color: C.primary, fontWeight: "800" }}>{doneCount}</Text> / {tasks.length}
        </Text>
        <TouchableOpacity onPress={onGoalEdit} hitSlop={8} style={styles.editChip}>
          <Text style={styles.editChipText}>수정</Text>
        </TouchableOpacity>
      </View>

      {tasks.map((task, idx) => (
        <TaskItem
          key={task.id}
          task={task}
          isLast={idx === tasks.length - 1}
          whenLabel={getWhenLabel(task.dueDate)}
          onEdit={() => onTaskEdit?.(task.id)}
          onToggle={() => onTaskToggle(task.id)}
        />
      ))}
    </View>
  );
}

type TaskItemProps = {
  task: Task;
  isLast: boolean;
  whenLabel: string;
  onEdit: () => void;
  onToggle: () => void;
};

function TaskItem({ task, isLast, whenLabel, onEdit, onToggle }: TaskItemProps) {
  const isToday = whenLabel === "오늘";

  return (
    <View style={[styles.taskItem, !isLast && styles.taskBorder]}>
      <Pressable
        onPress={onToggle}
        hitSlop={8}
        style={[styles.checkbox, task.done && styles.checkboxDone]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.done }}
      >
        {task.done && <Ionicons name="checkmark" size={15} color="#fff" />}
      </Pressable>

      <Text style={[styles.taskText, task.done && styles.taskTextDone]} numberOfLines={1}>
        {task.text}
      </Text>

      {isToday && !task.done && (
        <TouchableOpacity onPress={onEdit} hitSlop={8}>
          <Text style={styles.editText}>수정</Text>
        </TouchableOpacity>
      )}

      <View
        style={[
          styles.when,
          isToday && { backgroundColor: C.primarySoft },
        ]}
      >
        <Text
          style={[
            styles.whenText,
            isToday && { color: C.primary },
          ]}
        >
          {whenLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    marginTop: 4,
    shadowColor: "#4B55C8",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  head: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  headTitle: { fontSize: 17, fontWeight: "700", color: C.ink, letterSpacing: -0.3 },
  headBook: { fontSize: 12, fontWeight: "500", color: C.inkSub, marginTop: 2 },
  count: { fontSize: 13, fontWeight: "600", color: C.inkSub },
  editChip: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  editChipText: { fontSize: 12, fontWeight: "600", color: C.inkSub },

  taskItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  taskBorder: { borderBottomWidth: 1, borderBottomColor: C.line },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: C.inkMute,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: { backgroundColor: C.primary, borderColor: C.primary },
  taskText: { flex: 1, fontSize: 15, fontWeight: "500", color: C.ink },
  taskTextDone: { color: C.inkMute, textDecorationLine: "line-through" },
  editText: { fontSize: 12, fontWeight: "600", color: C.inkSub },
  when: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: "#F7F7FA" },
  whenText: { fontSize: 11, fontWeight: "700", color: C.inkMute },
});
