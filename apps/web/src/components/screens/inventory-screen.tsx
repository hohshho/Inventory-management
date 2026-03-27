"use client";

import Link from "next/link";
import { startTransition, useDeferredValue } from "react";
import { useInventoryQuery } from "@/hooks/queries/use-inventory-query";
import { useLocationsQuery } from "@/hooks/queries/use-locations-query";
import { useInventoryFiltersStore } from "@/stores/inventory-filters-store";

export function InventoryScreen() {
  const search = useInventoryFiltersStore((state) => state.search);
  const locationId = useInventoryFiltersStore((state) => state.locationId);
  const setSearch = useInventoryFiltersStore((state) => state.setSearch);
  const setLocationId = useInventoryFiltersStore((state) => state.setLocationId);
  const deferredSearch = useDeferredValue(search);

  const { data: locations } = useLocationsQuery();
  const { data, isLoading } = useInventoryQuery({
    search: deferredSearch,
    locationId,
  });

  return (
    <div className="page-stack">
      <section className="card">
        <div className="toolbar">
          <input
            className="field"
            placeholder="품목명 또는 바코드 검색"
            value={search}
            onChange={(event) => {
              const nextValue = event.target.value;
              startTransition(() => setSearch(nextValue));
            }}
          />
        </div>
        <div className="chip-row" style={{ marginTop: 14 }}>
          <button
            className={`chip${locationId === "all" ? " is-active" : ""}`}
            onClick={() => startTransition(() => setLocationId("all"))}
            type="button"
          >
            전체 위치
          </button>
          {locations?.map((location) => (
            <button
              key={location.id}
              className={`chip${locationId === location.id ? " is-active" : ""}`}
              onClick={() => startTransition(() => setLocationId(location.id))}
              type="button"
            >
              {location.name}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="card-title">
          <h2>재고 목록</h2>
          <span className="badge">{data?.length ?? 0}개 결과</span>
        </div>

        {isLoading ? <div className="loading-state">재고를 조회하는 중입니다.</div> : null}

        {!isLoading && (!data || data.length === 0) ? (
          <div className="empty-state">조건에 맞는 재고가 없습니다.</div>
        ) : null}

        {data && data.length > 0 ? (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>품목</th>
                    <th>바코드</th>
                    <th>위치</th>
                    <th>수량</th>
                    <th>상태</th>
                    <th>업데이트</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Link href={`/items/${item.itemId}`}>
                          <strong>{item.itemName}</strong>
                        </Link>
                      </td>
                      <td>{item.barcode ?? "-"}</td>
                      <td>{item.locationName}</td>
                      <td>
                        {item.quantity}
                        {item.unit}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            item.status === "부족"
                              ? "danger"
                              : item.status === "주의"
                                ? "warn"
                                : "ok"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td>{item.updatedAtLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="inventory-cards">
              {data.map((item) => (
                <article className="card" key={item.id}>
                  <div className="card-title">
                    <Link href={`/items/${item.itemId}`}>
                      <h3>{item.itemName}</h3>
                    </Link>
                    <span
                      className={`badge ${
                        item.status === "부족"
                          ? "danger"
                          : item.status === "주의"
                            ? "warn"
                            : "ok"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <div className="stack">
                    <div className="subtle">바코드 {item.barcode ?? "-"}</div>
                    <div className="subtle">위치 {item.locationName}</div>
                    <strong>
                      {item.quantity}
                      {item.unit}
                    </strong>
                    <div className="subtle">업데이트 {item.updatedAtLabel}</div>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
