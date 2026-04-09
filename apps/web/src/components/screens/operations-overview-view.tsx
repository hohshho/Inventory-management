"use client";

import { HelpHint } from "@/components/help-hint";
import { ScheduleBoard } from "@/components/schedule-board";
import { useOperationsDigest } from "@/hooks/queries/use-operations-digest";

function pickLedgerTone(adjustmentType: string) {
  if (adjustmentType === "decrease") {
    return "danger";
  }

  if (adjustmentType === "manual_edit") {
    return "warn";
  }

  return "ok";
}

export function OperationsOverviewView() {
  const {
    data: summaryData,
    error: summaryError,
    isLoading: isSummaryLoading,
  } = useOperationsDigest();

  if (isSummaryLoading) {
    return <div className="loading-state">대시보드 데이터를 불러오는 중입니다.</div>;
  }

  if (summaryError) {
    return (
      <div className="empty-state">
        대시보드 데이터를 불러오지 못했습니다.
        <br />
        {summaryError instanceof Error ? summaryError.message : "잠시 후 다시 시도해 주세요."}
      </div>
    );
  }

  if (!summaryData) {
    return <div className="empty-state">표시할 대시보드 데이터가 없습니다.</div>;
  }

  return (
    <div className="view-stack workbench-page">
      <section className="spotlight-shell">
        <div className="spotlight-copy">
          <span className="spotlight-pill">운영 요약</span>
          <h1>오늘 확인할 재고 흐름을 봅니다.</h1>
          <p>
            전체 품목 수량, 부족 재고, 위치별 요약, 최근 변경과 일정 메모를 같은 화면에서 이어서 확인할 수
            있습니다.
          </p>
        </div>

        <div className="spotlight-sidecar">
          <div className="surface-head">
            <div className="section-head-inline">
              <h3>오늘의 확인 항목</h3>
              <HelpHint description="오늘 우선 확인할 항목을 빠르게 모아 둔 카드입니다. 부족 재고, 운영 위치 수, 최근 조정 건수를 기준으로 점검하면 됩니다." />
            </div>
          </div>
          <div className="spotlight-list">
            <div className="spotlight-item">
              <span>부족 재고 점검</span>
              <strong>{summaryData.lowStockCount}건</strong>
            </div>
            <div className="spotlight-item">
              <span>운영 위치 확인</span>
              <strong>{summaryData.locationCount}곳</strong>
            </div>
            <div className="spotlight-item">
              <span>최근 변경 검토</span>
              <strong>{summaryData.recentAdjustments.length}건</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="metric-strip">
        <article className="metric-card">
          <span className="metric-label">전체 품목</span>
          <strong>{summaryData.itemCount}</strong>
          <p>현재 그룹 기준으로 관리 중인 전체 품목 수입니다.</p>
        </article>
        <article className="metric-card">
          <span className="metric-label">전체 수량</span>
          <strong>{summaryData.totalQuantity}</strong>
          <p>모든 보관 위치의 재고를 합산한 총 수량입니다.</p>
        </article>
        <article className="metric-card">
          <span className="metric-label">주의 및 부족</span>
          <strong>{summaryData.lowStockCount}</strong>
          <p>즉시 확인이 필요한 재고 건수입니다.</p>
        </article>
        <article className="metric-card">
          <span className="metric-label">운영 위치</span>
          <strong>{summaryData.locationCount}</strong>
          <p>창고, 선반, 냉장 보관 위치를 포함합니다.</p>
        </article>
      </section>

      <section className="content-split">
        <div className="primary-column">
          <section className="surface-card">
            <div className="surface-head">
              <div>
                <h3>최근 재고 조정</h3>
                <p>입출고, 수동 수정, 위치 이동 기록에서 사유를 우선 확인할 수 있게 정리했습니다.</p>
              </div>
              <span className="badge ok">최근 {summaryData.recentAdjustments.length}건</span>
            </div>

            {summaryData.recentAdjustments.length === 0 ? (
              <div className="empty-state">최근 변경 이력이 없습니다.</div>
            ) : (
              <div className="log-stream">
                {summaryData.recentAdjustments.map((historyItem) => (
                  <article className="log-row" key={historyItem.id}>
                    <div className={`log-dot ${pickLedgerTone(historyItem.changeType)}`} />
                    <div className="log-copy">
                      <strong>{historyItem.reason}</strong>
                      <div className="subtle">
                        물품: {historyItem.itemName} / 대상 재고: {historyItem.locationName}
                      </div>
                      <div className="subtle">변경자: {historyItem.createdByName}</div>
                    </div>
                    <div className="log-meta">
                      <span className={`badge ${pickLedgerTone(historyItem.changeType)}`}>
                        {historyItem.beforeQuantity} → {historyItem.afterQuantity}
                      </span>
                      <small>{historyItem.createdAtLabel}</small>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="surface-card">
            <div className="surface-head">
              <div>
                <h3>위치별 재고 요약</h3>
                <p>각 보관 위치의 품목 수와 현재 수량을 한 번에 비교합니다.</p>
              </div>
            </div>

            {summaryData.locationSummary.length === 0 ? (
              <div className="empty-state">등록된 위치 요약이 없습니다.</div>
            ) : (
              <div className="zone-grid">
                {summaryData.locationSummary.map((zoneItem) => (
                  <article className="zone-card" key={zoneItem.locationId}>
                    <div className="zone-headline">
                      <strong>{zoneItem.locationName}</strong>
                      <span className="badge">{zoneItem.itemCount}품목</span>
                    </div>
                    <div className="zone-qty">{zoneItem.quantity}</div>
                    <p>현재 위치 누적 수량</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <ScheduleBoard
          compact
          subtitle="캘린더 메모와 반복 점검 일정을 같은 패널에서 관리합니다."
          title="운영 일정"
        />
      </section>
    </div>
  );
}
