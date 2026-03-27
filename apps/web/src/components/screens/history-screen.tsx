"use client";

import { useHistoryQuery } from "@/hooks/queries/use-history-query";

export function HistoryScreen() {
  const { data, isLoading } = useHistoryQuery();

  if (isLoading || !data) {
    return <div className="loading-state">이력을 불러오는 중입니다.</div>;
  }

  return (
    <div className="page-stack">
      <section className="card">
        <div className="card-title">
          <h2>재고 변경 이력</h2>
          <span className="badge">{data.length}건</span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>품목</th>
                <th>위치</th>
                <th>변경</th>
                <th>사유</th>
                <th>시간</th>
              </tr>
            </thead>
            <tbody>
              {data.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.itemName}</td>
                  <td>{entry.locationName}</td>
                  <td>
                    {entry.beforeQuantity} → {entry.afterQuantity}
                  </td>
                  <td>{entry.reason}</td>
                  <td>{entry.createdAtLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
