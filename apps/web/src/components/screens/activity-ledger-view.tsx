"use client";

import { useLedgerFeed } from "@/hooks/queries/use-ledger-feed";

function getEntryLabel(adjustmentType: string) {
  if (adjustmentType === "increase") return "입고";
  if (adjustmentType === "decrease") return "출고";
  if (adjustmentType === "transfer_in") return "이동 입고";
  if (adjustmentType === "transfer_out") return "위치 이동";
  if (adjustmentType === "create") return "초기 등록";
  if (adjustmentType === "location_create") return "위치 생성";
  if (adjustmentType === "counterparty_create") return "거래처 생성";
  return "직접 수정";
}

function getEntryTone(adjustmentType: string) {
  if (adjustmentType === "decrease" || adjustmentType === "transfer_out") return "danger";
  if (adjustmentType === "manual_edit" || adjustmentType === "counterparty_create") return "warn";
  return "ok";
}

export function ActivityLedgerView() {
  const { data: historyRows, isLoading: isHistoryLoading } = useLedgerFeed();

  if (isHistoryLoading || !historyRows) {
    return <div className="loading-state">이력 데이터를 불러오는 중입니다.</div>;
  }

  const increaseRowCount = historyRows.filter((row) => row.changeType === "increase").length;
  const decreaseRowCount = historyRows.filter((row) => row.changeType === "decrease").length;
  const transferRowCount = historyRows.filter((row) => row.changeType.startsWith("transfer")).length;
  const createRowCount = historyRows.filter((row) => row.changeType === "create").length;

  return (
    <div className="view-stack workbench-page">
      <section className="spotlight-shell is-compact">
        <div className="spotlight-copy">
          <span className="spotlight-pill">Activity Ledger</span>
          <h1>누가 어떤 재고를 언제 어떻게 바꿨는지 추적합니다.</h1>
          <p>입고, 출고, 위치 이동, 직접 수정 이력을 거래처 정보와 함께 확인할 수 있습니다.</p>
        </div>

        <div className="metric-strip compact">
          <article className="metric-card">
            <span className="metric-label">전체 로그</span>
            <strong>{historyRows.length}</strong>
          </article>
          <article className="metric-card">
            <span className="metric-label">입고</span>
            <strong>{increaseRowCount}</strong>
          </article>
          <article className="metric-card">
            <span className="metric-label">출고</span>
            <strong>{decreaseRowCount}</strong>
          </article>
          <article className="metric-card">
            <span className="metric-label">위치 이동</span>
            <strong>{transferRowCount}</strong>
          </article>
          <article className="metric-card">
            <span className="metric-label">초기 등록</span>
            <strong>{createRowCount}</strong>
          </article>
        </div>
      </section>

      <section className="surface-card">
        <div className="surface-head">
          <div>
            <span className="section-pill">Timeline</span>
            <h3>재고 변경 이력</h3>
            <p>등록된 사용자는 모든 재고 변경 기록과 거래처 정보를 확인할 수 있습니다.</p>
          </div>
          <span className="badge">{historyRows.length}건</span>
        </div>

        <div className="data-frame">
          <table className="table data-table">
            <thead>
              <tr>
                <th>품목</th>
                <th>위치</th>
                <th>변경자</th>
                <th>구분</th>
                <th>거래처/이동</th>
                <th>수량</th>
                <th>사유</th>
                <th>시간</th>
              </tr>
            </thead>
            <tbody>
              {historyRows.map((historyRow) => (
                <tr key={historyRow.id}>
                  <td>{historyRow.itemName}</td>
                  <td>{historyRow.locationName}</td>
                  <td>{historyRow.createdByName}</td>
                  <td>
                    <span className={`badge ${getEntryTone(historyRow.changeType)}`}>
                      {getEntryLabel(historyRow.changeType)}
                    </span>
                  </td>
                  <td>{historyRow.counterpartyName ?? historyRow.relatedLocationName ?? "-"}</td>
                  <td>
                    {historyRow.beforeQuantity} → {historyRow.afterQuantity}
                  </td>
                  <td>{historyRow.reason}</td>
                  <td>{historyRow.createdAtLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="stock-mobile-list">
          {historyRows.map((historyRow) => (
            <article className="compact-card" key={historyRow.id}>
              <div className="compact-card-head">
                <div>
                  <h3>{historyRow.itemName}</h3>
                  <div className="subtle">{historyRow.locationName}</div>
                </div>
                <span className={`badge ${getEntryTone(historyRow.changeType)}`}>
                  {getEntryLabel(historyRow.changeType)}
                </span>
              </div>
              <div className="compact-card-grid">
                <div className="compact-card-row">
                  <span>변경자</span>
                  <strong>{historyRow.createdByName}</strong>
                </div>
                <div className="compact-card-row">
                  <span>거래처/이동</span>
                  <strong>{historyRow.counterpartyName ?? historyRow.relatedLocationName ?? "-"}</strong>
                </div>
                <div className="compact-card-row">
                  <span>수량</span>
                  <strong>
                    {historyRow.beforeQuantity} → {historyRow.afterQuantity}
                  </strong>
                </div>
                <div className="compact-card-row">
                  <span>시간</span>
                  <strong>{historyRow.createdAtLabel}</strong>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
