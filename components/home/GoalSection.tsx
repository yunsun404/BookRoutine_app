import {
  Colors,
  FontSize,
  Radius,
  Spacing,
} from "@/components/constants/tokens";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
  onTaskToggle?: (id: string) => void; // ✅ 추가: 체크박스 토글용
};

// 기존 getWhenLabel 전체를 아래로 교체
function getWhenLabel(dueDate: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diff === 0) return "오늘";
  if (diff === 1) return "내일";
  if (diff === 2) return "모레";
  if (diff < 0) return "지남";

  // ✅ 3일 이상은 날짜 직접 표시
  const month = due.getMonth() + 1;
  const day = due.getDate();
  return `${month}월 ${day}일`;
}

export default function GoalSection({
  goal,
  tasks,
  onGoalEdit,
  onTaskEdit,
  onTaskToggle, // ✅ 추가
}: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.goalRow}>
        <Text style={styles.goalLabel}>목표</Text>
        <Text style={styles.goalText}>{goal}</Text>
        <TouchableOpacity onPress={onGoalEdit}>
          <Text style={styles.editBtn}>수정</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tasksCard}>
        {tasks.map((task, idx) => (
          <TaskItem
            key={task.id}
            task={task}
            isLast={idx === tasks.length - 1}
            whenLabel={getWhenLabel(task.dueDate)}
            onEdit={() => onTaskEdit?.(task.id)}
            onToggle={() => onTaskToggle?.(task.id)} // ✅ 추가
          />
        ))}
      </View>
    </View>
  );
}

type TaskItemProps = {
  task: Task;
  isLast: boolean;
  whenLabel: string;
  onEdit: () => void;
  onToggle: () => void; // ✅ 추가
};

function TaskItem({
  task,
  isLast,
  whenLabel,
  onEdit,
  onToggle,
}: TaskItemProps) {
  // 오늘 것만 체크박스 활성화, 내일/모레는 비활성화
  const isToday = whenLabel === "오늘";

  return (
    <View style={[styles.taskItem, !isLast && styles.taskBorder]}>
      {/* ✅ 수정: 체크박스에 onPress 연결, 오늘만 누를 수 있게 */}
      <TouchableOpacity
        onPress={isToday ? onToggle : undefined}
        activeOpacity={isToday ? 0.6 : 1}
      >
        <View
          style={[
            styles.checkbox,
            task.done && isToday && styles.checkboxDone, // ✅ isToday일 때만 색 채움
          ]}
        >
          {task.done && isToday && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>

      <Text
        style={[
          styles.taskText,
          task.done && isToday && styles.taskTextDone, // ✅ isToday 조건 추가
          !isToday && styles.taskTextDisabled,
        ]}
        numberOfLines={1}
      >
        {task.text}
      </Text>

      {whenLabel === "오늘" && (
        <TouchableOpacity onPress={onEdit}>
          <Text style={styles.editBtn}>수정</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.whenLabel}>{whenLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 10,
  },
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    paddingHorizontal: 14,
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.md,
  },
  goalLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    minWidth: 36,
  },
  goalText: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: "500",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  editBtn: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  tasksCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.lg,
    marginTop: 10,
    overflow: "hidden",
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  taskBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: Colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: {
    backgroundColor: Colors.check,
  },
  // ✅ 추가: 내일/모레 체크박스 흐리게
  checkboxDisabled: {
    opacity: 0.3,
  },
  checkmark: {
    fontSize: 11,
    color: "#fff",
    fontWeight: "700",
  },
  taskText: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  taskTextDone: {
    textDecorationLine: "line-through",
    opacity: 0.5,
  },
  // ✅ 추가: 내일/모레 텍스트 흐리게
  taskTextDisabled: {
    opacity: 0.4,
  },
  whenLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginLeft: 4,
  },
});
