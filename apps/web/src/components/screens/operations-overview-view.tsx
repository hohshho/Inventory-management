"use client";

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
        {summaryError instanceof Error ? summaryError.message : "잠시 후 다시 시도해주세요."}
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
          <span className="spotlight-pill">Operations Console</span>
          <h1>재고 운영 지표와 최근 흐름을 한 화면에서 확인합니다.</h1>
          <p>
            전체 품목 수, 부족 재고, 위치별 요약, 최근 변경 이력을 보고 오른쪽 일정 보드에서 메모와
            반복 작업까지 같이 관리할 수 있습니다.
          </p>
        </div>

        <div className="spotlight-sidecar">
          <span className="section-pill">Today</span>
          <h3>오늘의 확인 항목</h3>
          <div className="spotlight-list">
            <div className="spotlight-item">
              <span>부족 재고 점검</span>
              <strong>{summaryData.lowStockCount}건</strong>
            </div>
            <div className="spotlight-item">
              <span>운영 위치</span>
              <strong>{summaryData.locationCount}개</strong>
            </div>
            <div className="spotlight-item">
              <span>최근 변경 로그</span>
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
          <p>모든 위치 재고를 합산한 총 수량입니다.</p>
        </article>
        <article className="metric-card">
          <span className="metric-label">주의 및 부족</span>
          <strong>{summaryData.lowStockCount}</strong>
          <p>즉시 확인이 필요한 재고 건수입니다.</p>
        </article>
        <article className="metric-card">
          <span className="metric-label">운영 위치</span>
          <strong>{summaryData.locationCount}</strong>
          <p>창고, 냉장, 선반 등 보관 위치 수입니다.</p>
        </article>
      </section>

      <section className="content-split">
        <div className="primary-column">
          <section className="surface-card">
            <div className="surface-head">
              <div>
                <span className="section-pill">Live Activity</span>
                <h3>최근 재고 조정</h3>
                <p>입고, 차감, 수동 조정 이력을 시간순으로 보여줍니다.</p>
              </div>
              <span className="badge ok">실시간 로그</span>
            </div>

            {summaryData.recentAdjustments.length === 0 ? (
              <div className="empty-state">최근 변경 이력이 없습니다.</div>
            ) : (
              <div className="log-stream">
                {summaryData.recentAdjustments.map((historyItem) => (
                  <article className="log-row" key={historyItem.id}>
                    <div className={`log-dot ${pickLedgerTone(historyItem.changeType)}`} />
                    <div className="log-copy">
                      <strong>{historyItem.itemName}</strong>
                      <div className="subtle">
                        {historyItem.locationName} · {historyItem.reason} · {historyItem.createdByName}
                      </div>
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
                <span className="section-pill">Storage Zones</span>
                <h3>위치별 재고 현황</h3>
                <p>각 위치에 몇 개 품목이 있고, 현재 수량이 얼마인지 요약합니다.</p>
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
          subtitle="캘린더 메모와 반복 업무를 같은 화면에서 관리합니다."
          title="운영 일정"
        />
      </section>
    </div>
  );
}
