"use client";

import { useLocationsQuery } from "@/hooks/queries/use-locations-query";

export function LocationsScreen() {
  const { data, isLoading } = useLocationsQuery();

  if (isLoading || !data) {
    return <div className="loading-state">위치 데이터를 불러오는 중입니다.</div>;
  }

  return (
    <div className="page-stack">
      <section className="card">
        <div className="card-title">
          <h2>보관 위치 운영</h2>
          <span className="badge">{data.length}개 구역</span>
        </div>
        <div className="card-grid">
          {data.map((location) => (
            <article className="card" key={location.id}>
              <div className="card-title">
                <h3>{location.name}</h3>
                <span className="badge">{location.type}</span>
              </div>
              <div className="stack">
                <div className="subtle">{location.description}</div>
                <div>
                  <strong>{location.itemCount}개 품목</strong>
                </div>
                <div className="subtle">현재 수량 {location.quantity}개</div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
