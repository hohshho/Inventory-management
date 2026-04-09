"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useLedgerFeed } from "@/hooks/queries/use-ledger-feed";
import { useLowStockAlerts } from "@/hooks/queries/use-low-stock-alerts";
import { useScheduleDigest } from "@/hooks/queries/use-schedule-digest";
import { useAutoClearingText } from "@/hooks/use-auto-clearing-text";
import { useToastFeedback } from "@/hooks/use-toast-feedback";
import { apiPost } from "@/lib/api";

type StockInsightRailProps = {
  visibleItemCount: number;
  cautionItemCount: number;
  shortageItemCount: number;
  aggregateQuantity: number;
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

export function StockInsightRail({
  visibleItemCount,
  cautionItemCount,
  shortageItemCount,
  aggregateQuantity,
}: StockInsightRailProps) {
  const queryClient = useQueryClient();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [activeMonthKey, setActiveMonthKey] = useState(getMonthKey());
  const [activeDateKey, setActiveDateKey] = useState(getTodayKey());
  const [orderMemoDraft, setOrderMemoDraft] = useState("");
  const [successToast, setSuccessToast] = useState("");
  const [errorToast, setErrorToast] = useState("");
  const { data: recentHistoryRows } = useLedgerFeed();
  const { data: schedulerBundle } = useScheduleDigest(activeMonthKey);
  const { data: lowStockAlerts } = useLowStockAlerts();

  useAutoClearingText(successToast, setSuccessToast);
  useAutoClearingText(errorToast, setErrorToast);
  useToastFeedback(successToast, errorToast);

  const activeMemoRecord = useMemo(
    () => schedulerBundle?.memos.find((memo) => memo.memoDate === activeDateKey) ?? null,
    [activeDateKey, schedulerBundle?.memos],
  );
  const monthDays = useMemo(() => buildMonthDays(activeMonthKey), [activeMonthKey]);

  useEffect(() => {
    setOrderMemoDraft(activeMemoRecord?.note ?? "");
  }, [activeMemoRecord]);

  useEffect(() => {
    if (!monthDays.includes(activeDateKey)) {
      setActiveDateKey(monthDays[0] ?? getTodayKey());
    }
  }, [activeDateKey, monthDays]);

  const saveOrderMemoMutation = useMutation({
    mutationFn: (note: string) =>
      apiPost("/planner/memos", {
        memoDate: activeDateKey,
        note,
      }),
    onSuccess: async () => {
      setSuccessToast("발주 메모를 저장했습니다.");
      setErrorToast("");
      await queryClient.invalidateQueries({ queryKey: ["schedule-digest"] });
    },
    onError: (error) => {
      setSuccessToast("");
      setErrorToast(error instanceof Error ? error.message : "발주 메모 저장에 실패했습니다.");
    },
  });

  const timelineRows = (recentHistoryRows ?? []).slice(0, 4);
  const lowStockRows = (lowStockAlerts ?? []).slice(0, 5);

  return (
    <aside className="primary-column">
      <section className="surface-card stock-rail-card">
        <div className="surface-head">
          <div>
            <h3>재고 상태 카드</h3>
            <p>현재 재고 상태와 부족 수량을 빠르게 확인합니다.</p>
          </div>
        </div>

        <div className="stock-rail-stats">
          <article className="stock-rail-stat">
            <span>노출 품목</span>
            <strong>{visibleItemCount}</strong>
          </article>
          <article className="stock-rail-stat">
            <span>주의 및 부족</span>
            <strong>{cautionItemCount}</strong>
          </article>
          <article className="stock-rail-stat">
            <span>부족 재고</span>
            <strong>{shortageItemCount}</strong>
          </article>
          <article className="stock-rail-stat">
            <span>총 수량</span>
            <strong>{aggregateQuantity}</strong>
          </article>
        </div>
      </section>

      <section className="surface-card stock-rail-card">
        <div className="surface-head">
          <div>
            <h3>부족 재고 알림</h3>
            <p>기준 수량 이하 재고를 위치별로 바로 확인합니다.</p>
          </div>
        </div>

        {lowStockRows.length === 0 ? (
          <div className="loading-state">현재 부족 재고 알림이 없습니다.</div>
        ) : (
          <div className="stock-rail-timeline">
            {lowStockRows.map((alertRow) => (
              <article className="stock-rail-timeline-item" key={alertRow.inventoryId}>
                <div>
                  <strong>{alertRow.itemName}</strong>
                  <div className="subtle">
                    위치: {alertRow.locationName} / 기준 {alertRow.lowStockThreshold}
                    {alertRow.unit}
                  </div>
                </div>
                <div className="stock-rail-timeline-meta">
                  <strong>
                    {alertRow.quantity}
                    {alertRow.unit}
                  </strong>
                  <span>{alertRow.status}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="surface-card stock-rail-card">
        <div className="surface-head">
          <div>
            <h3>최근 변경</h3>
            <p>최근 재고 변경 사유와 변경자를 함께 확인합니다.</p>
          </div>
        </div>

        {timelineRows.length === 0 ? (
          <div className="loading-state">최근 변경 이력이 없습니다.</div>
        ) : (
          <div className="stock-rail-timeline">
            {timelineRows.map((timelineRow) => (
              <article className="stock-rail-timeline-item" key={timelineRow.id}>
                <div>
                  <strong>{timelineRow.reason}</strong>
                  <div className="subtle">
                    물품: {timelineRow.itemName} / 변경자: {timelineRow.createdByName}
                  </div>
                  <div className="subtle">대상 재고: {timelineRow.locationName}</div>
                </div>
                <div className="stock-rail-timeline-meta">
                  <strong>
                    {timelineRow.beforeQuantity} → {timelineRow.afterQuantity}
                  </strong>
                  <span>{timelineRow.createdAtLabel}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="surface-card stock-rail-card">
        <div className="surface-head">
          <div>
            <h3>발주 메모</h3>
            <p>날짜별 메모를 확인하고 저장합니다.</p>
          </div>
          <button
            className="badge schedule-date-trigger"
            onClick={() => setCalendarOpen((prev) => !prev)}
            type="button"
          >
            {activeDateKey}
          </button>
        </div>

        {calendarOpen ? (
          <div className="schedule-popover">
            <input
              className="input-shell schedule-month-input"
              type="month"
              value={activeMonthKey}
              onChange={(event) => setActiveMonthKey(event.target.value)}
            />
            <div className="schedule-calendar-grid">
              {monthDays.map((dateKey) => {
                const memoRecord = schedulerBundle?.memos.find((memo) => memo.memoDate === dateKey);
                const isSelected = activeDateKey === dateKey;
                const isToday = getTodayKey() === dateKey;

                return (
                  <button
                    key={dateKey}
                    className={`schedule-day-cell${isSelected ? " is-selected" : ""}${memoRecord ? " has-note" : ""}${isToday ? " is-today" : ""}`}
                    onClick={() => {
                      setActiveDateKey(dateKey);
                      setCalendarOpen(false);
                    }}
                    type="button"
                  >
                    <span>{Number(dateKey.slice(-2))}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="stock-order-note">
          <textarea
            className="input-area"
            placeholder="예: 교체용 20개 추가 발주, 다음 주 예산 확인 후 구매"
            value={orderMemoDraft}
            onChange={(event) => setOrderMemoDraft(event.target.value)}
          />
          {activeMemoRecord ? (
            <div className="subtle">
              {activeMemoRecord.createdByName} / {activeMemoRecord.updatedAtLabel}
            </div>
          ) : (
            <div className="subtle">선택한 날짜에 저장된 메모가 없습니다.</div>
          )}
          <button
            className="button primary"
            disabled={saveOrderMemoMutation.isPending || !orderMemoDraft.trim()}
            onClick={() => saveOrderMemoMutation.mutate(orderMemoDraft)}
            type="button"
          >
            {saveOrderMemoMutation.isPending ? "저장 중..." : "발주 메모 저장"}
          </button>
        </div>
      </section>
    </aside>
  );
}
