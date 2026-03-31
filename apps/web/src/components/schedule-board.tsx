"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useScheduleDigest } from "@/hooks/queries/use-schedule-digest";
import {
  apiPost,
  type CreatePlannerTaskInput,
  type PlannerCadence,
  type PlannerMemo,
  type TogglePlannerTaskInput,
  type UpsertPlannerMemoInput,
} from "@/lib/api";

type ScheduleBoardProps = {
  title: string;
  subtitle: string;
  compact?: boolean;
};

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function buildMonthDays(monthKey: string) {
  const [year, monthValue] = monthKey.split("-").map(Number);
  if (!year || !monthValue) return [];

  const monthLength = new Date(year, monthValue, 0).getDate();
  return Array.from({ length: monthLength }, (_, index) => {
    const dayToken = String(index + 1).padStart(2, "0");
    return `${monthKey}-${dayToken}`;
  });
}

function getCadenceText(cadence: PlannerCadence) {
  if (cadence === "daily") return "매일";
  if (cadence === "weekly") return "매주";
  return "매월";
}

function findMemo(memoRows: PlannerMemo[] | undefined, dateKey: string) {
  return memoRows?.find((memoRow) => memoRow.memoDate === dateKey) ?? null;
}

export function ScheduleBoard({ title, subtitle, compact = false }: ScheduleBoardProps) {
  const queryClient = useQueryClient();
  const [activeMonthKey, setActiveMonthKey] = useState(getMonthKey());
  const [selectedDateKey, setSelectedDateKey] = useState(getTodayKey());
  const [taskTitleDraft, setTaskTitleDraft] = useState("");
  const [taskCadence, setTaskCadence] = useState<PlannerCadence>("daily");
  const [taskDueDate, setTaskDueDate] = useState(getTodayKey());
  const [taskReminderAt, setTaskReminderAt] = useState("");
  const [taskStageFilter, setTaskStageFilter] = useState<"all" | PlannerCadence>("all");
  const [memoDraft, setMemoDraft] = useState("");
  const [successToast, setSuccessToast] = useState("");
  const [errorToast, setErrorToast] = useState("");

  const plannerBundleQuery = useScheduleDigest(activeMonthKey);

  useEffect(() => {
    const dateKeys = buildMonthDays(activeMonthKey);
    if (!dateKeys.includes(selectedDateKey)) {
      setSelectedDateKey(dateKeys[0] ?? getTodayKey());
    }
  }, [activeMonthKey, selectedDateKey]);

  useEffect(() => {
    const memoRecord = findMemo(plannerBundleQuery.data?.memos, selectedDateKey);
    setMemoDraft(memoRecord?.note ?? "");
  }, [plannerBundleQuery.data?.memos, selectedDateKey]);

  const refreshPlannerBundle = async (message: string) => {
    setSuccessToast(message);
    setErrorToast("");
    await queryClient.invalidateQueries({ queryKey: ["schedule-digest"] });
  };

  const createTaskMutation = useMutation({
    mutationFn: (payload: CreatePlannerTaskInput) => apiPost("/planner/tasks", payload),
    onSuccess: async () => {
      setTaskTitleDraft("");
      setTaskReminderAt("");
      await refreshPlannerBundle("작업을 등록했습니다.");
    },
    onError: (error) => {
      setSuccessToast("");
      setErrorToast(error instanceof Error ? error.message : "작업 등록에 실패했습니다.");
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: (payload: TogglePlannerTaskInput) => apiPost("/planner/tasks/toggle", payload),
    onSuccess: async () => {
      await refreshPlannerBundle("작업 상태를 변경했습니다.");
    },
    onError: (error) => {
      setSuccessToast("");
      setErrorToast(error instanceof Error ? error.message : "작업 상태 변경에 실패했습니다.");
    },
  });

  const saveMemoMutation = useMutation({
    mutationFn: (payload: UpsertPlannerMemoInput) => apiPost("/planner/memos", payload),
    onSuccess: async () => {
      await refreshPlannerBundle("캘린더 메모를 저장했습니다.");
    },
    onError: (error) => {
      setSuccessToast("");
      setErrorToast(error instanceof Error ? error.message : "캘린더 메모 저장에 실패했습니다.");
    },
  });

  const visibleTasks =
    plannerBundleQuery.data?.tasks.filter((taskRow) => {
      if (taskStageFilter === "all") return true;
      return taskRow.cadence === taskStageFilter;
    }) ?? [];

  const monthDays = buildMonthDays(activeMonthKey);
  const activeMemoRecord = findMemo(plannerBundleQuery.data?.memos, selectedDateKey);

  return (
    <section className={`surface-card schedule-board${compact ? " is-compact" : ""}`}>
      <div className="surface-head">
        <div>
          <span className="section-pill">Planner</span>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <input
          className="input-shell schedule-month-input"
          type="month"
          value={activeMonthKey}
          onChange={(event) => setActiveMonthKey(event.target.value)}
        />
      </div>

      {successToast ? <div className="badge ok">{successToast}</div> : null}
      {errorToast ? <div className="badge danger">{errorToast}</div> : null}

      <div className="schedule-grid">
        <div className="schedule-calendar-card">
          <div className="schedule-headline">
            <h4>캘린더 메모</h4>
            <span className="badge">{plannerBundleQuery.data?.memos.length ?? 0}건</span>
          </div>

          <div className="schedule-calendar-grid">
            {monthDays.map((dateKey) => {
              const memoRecord = findMemo(plannerBundleQuery.data?.memos, dateKey);
              const isSelected = dateKey === selectedDateKey;
              const isToday = dateKey === getTodayKey();

              return (
                <button
                  key={dateKey}
                  className={`schedule-day-cell${isSelected ? " is-selected" : ""}${memoRecord ? " has-note" : ""}${isToday ? " is-today" : ""}`}
                  onClick={() => setSelectedDateKey(dateKey)}
                  type="button"
                >
                  <span>{Number(dateKey.slice(-2))}</span>
                  {memoRecord ? <small>memo</small> : null}
                </button>
              );
            })}
          </div>

          <div className="schedule-note-editor">
            <div className="schedule-headline">
              <h4>{selectedDateKey}</h4>
              {activeMemoRecord ? <span className="badge ok">저장됨</span> : <span className="badge">메모 없음</span>}
            </div>
            {activeMemoRecord ? (
              <div className="subtle">
                {activeMemoRecord.createdByName} · {activeMemoRecord.updatedAtLabel}
              </div>
            ) : null}
            <textarea
              className="input-area"
              placeholder="선택 날짜의 메모를 입력하세요"
              value={memoDraft}
              onChange={(event) => setMemoDraft(event.target.value)}
            />
            <button
              className="button secondary"
              disabled={saveMemoMutation.isPending || !memoDraft.trim()}
              onClick={() => saveMemoMutation.mutate({ memoDate: selectedDateKey, note: memoDraft })}
              type="button"
            >
              {saveMemoMutation.isPending ? "저장 중..." : "메모 저장"}
            </button>
          </div>
        </div>

        <div className="schedule-task-card">
          <div className="schedule-headline">
            <h4>작업 리스트</h4>
            <span className="badge">{visibleTasks.length}개</span>
          </div>

          <div className="choice-row">
            {(["all", "daily", "weekly", "monthly"] as const).map((filterValue) => (
              <button
                key={filterValue}
                className={`choice-pill${taskStageFilter === filterValue ? " is-active" : ""}`}
                onClick={() => setTaskStageFilter(filterValue)}
                type="button"
              >
                {filterValue === "all"
                  ? "전체"
                  : filterValue === "daily"
                    ? "매일"
                    : filterValue === "weekly"
                      ? "매주"
                      : "매월"}
              </button>
            ))}
          </div>

          <div className="schedule-task-form">
            <input
              className="input-shell"
              placeholder="예: 냉장 재고 확인"
              value={taskTitleDraft}
              onChange={(event) => setTaskTitleDraft(event.target.value)}
            />
            <div className="inline-fields">
              <select
                className="input-shell"
                value={taskCadence}
                onChange={(event) => setTaskCadence(event.target.value as PlannerCadence)}
              >
                <option value="daily">매일</option>
                <option value="weekly">매주</option>
                <option value="monthly">매월</option>
              </select>
              <input
                className="input-shell"
                type="date"
                value={taskDueDate}
                onChange={(event) => setTaskDueDate(event.target.value)}
              />
            </div>
            <input
              className="input-shell"
              type="datetime-local"
              value={taskReminderAt}
              onChange={(event) => setTaskReminderAt(event.target.value)}
            />
            <button
              className="button primary"
              disabled={createTaskMutation.isPending || !taskTitleDraft.trim()}
              onClick={() =>
                createTaskMutation.mutate({
                  title: taskTitleDraft,
                  cadence: taskCadence,
                  dueDate: taskDueDate,
                  reminderAt: taskReminderAt || null,
                })
              }
              type="button"
            >
              {createTaskMutation.isPending ? "등록 중..." : "작업 추가"}
            </button>
          </div>

          {plannerBundleQuery.isLoading ? (
            <div className="loading-state">일정 데이터를 불러오는 중입니다.</div>
          ) : visibleTasks.length === 0 ? (
            <div className="loading-state">등록된 작업이 없습니다.</div>
          ) : (
            <div className="schedule-task-list">
              {visibleTasks.map((taskRow) => (
                <article className={`schedule-task-item${taskRow.isDone ? " is-done" : ""}`} key={taskRow.id}>
                  <label className="schedule-task-check">
                    <input
                      checked={taskRow.isDone}
                      onChange={(event) =>
                        toggleTaskMutation.mutate({
                          taskId: taskRow.id,
                          isDone: event.target.checked,
                        })
                      }
                      type="checkbox"
                    />
                    <span />
                  </label>
                  <div className="schedule-task-copy">
                    <div className="schedule-task-topline">
                      <strong>{taskRow.title}</strong>
                      <span className="badge">{getCadenceText(taskRow.cadence)}</span>
                    </div>
                    <div className="subtle">마감일 {taskRow.dueDate}</div>
                    <div className="subtle">
                      {taskRow.reminderAtLabel ? `알림 예정 ${taskRow.reminderAtLabel}` : "알림 시간 미설정"}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
