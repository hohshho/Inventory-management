"use client";

import { useDashboardQuery } from "@/hooks/queries/use-dashboard-query";

export function DashboardScreen() {
  const { data, isLoading } = useDashboardQuery();

  if (isLoading || !data) {
    return <div className="loading-state">대시보드 데이터를 불러오는 중입니다.</div>;
  }

  return (
    <div className="page-stack">
      <section className="hero">
        <div className="hero-grid">
          <div className="stack">
            <span className="badge">MVP 운영 모드</span>
            <h1>현장 입력과 위치 기반 재고관리를 한 흐름으로.</h1>
            <p>
              품목 등록, 바코드 진입, 위치별 재고 확인, 이력 추적까지 같은 화면 언어로
              이어지도록 설계된 운영 콘솔입니다.
            </p>
          </div>
          <div className="hero-panel">
            <strong>오늘 우선 처리</strong>
            <div className="hero-list">
              <div className="hero-list-item">
                <span>부족 재고 확인</span>
                <strong>{data.lowStockCount}건</strong>
              </div>
              <div className="hero-list-item">
                <span>운영 위치 수</span>
                <strong>{data.locationCount}구역</strong>
              </div>
              <div className="hero-list-item">
                <span>최근 변경</span>
                <strong>{data.recentAdjustments.length}건</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid-3">
        <article className="card metric">
          <span className="subtle">전체 품목</span>
          <div className="metric-value">{data.itemCount}</div>
          <div className="metric-meta">활성 품목 기준</div>
        </article>
        <article className="card metric">
          <span className="subtle">전체 재고 수량</span>
          <div className="metric-value">{data.totalQuantity}</div>
          <div className="metric-meta">모든 위치 합산</div>
        </article>
        <article className="card metric">
          <span className="subtle">부족 재고</span>
          <div className="metric-value">{data.lowStockCount}</div>
          <div className="metric-meta">즉시 보충 후보</div>
        </article>
      </section>

      <section className="grid-2">
        <article className="card">
          <div className="card-title">
            <h2>최근 재고 변경</h2>
            <span className="badge ok">실시간 로그</span>
          </div>
          <div className="stack">
            {data.recentAdjustments.map((entry) => (
              <div className="list-item" key={entry.id}>
                <div>
                  <strong>{entry.itemName}</strong>
                  <div className="subtle">
                    {entry.locationName} · {entry.reason}
                  </div>
                </div>
                <div>
                  <span
                    className={`badge ${
                      entry.changeType === "decrease"
                        ? "danger"
                        : entry.changeType === "increase"
                          ? "ok"
                          : "warn"
                    }`}
                  >
                    {entry.beforeQuantity} → {entry.afterQuantity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="card">
          <div className="card-title">
            <h2>위치별 운영 메모</h2>
            <span className="badge">공간 중심</span>
          </div>
          <div className="stack">
            {data.locationSummary.map((location) => (
              <div className="list-item" key={location.locationId}>
                <div>
                  <strong>{location.locationName}</strong>
                  <div className="subtle">{location.itemCount}개 품목 운영 중</div>
                </div>
                <strong>{location.quantity}개</strong>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
