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
};

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
  return `${diff}일 후`;
}

export default function GoalSection({
  goal,
  tasks,
  onGoalEdit,
  onTaskEdit,
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
};

function TaskItem({ task, isLast, whenLabel, onEdit }: TaskItemProps) {
  return (
    <View style={[styles.taskItem, !isLast && styles.taskBorder]}>
      <View style={[styles.checkbox, task.done && styles.checkboxDone]}>
        {task.done && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text
        style={[styles.taskText, task.done && styles.taskTextDone]}
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
  whenLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginLeft: 4,
  },
});
