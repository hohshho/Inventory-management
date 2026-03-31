"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { StockInsightRail } from "@/components/stock-insight-rail";
import { useStockRows } from "@/hooks/queries/use-stock-rows";
import { useZoneMap } from "@/hooks/queries/use-zone-map";
import { type InventoryStatus } from "@/lib/api";
import { useStockBrowseState } from "@/stores/stock-browse-state";

type StockStage = "all" | "normal" | "warning" | "danger";

function getBadgeTone(stockState: InventoryStatus) {
  if (stockState === "부족") return "danger";
  if (stockState === "주의") return "warn";
  return "ok";
}

function matchesStockStage(stockState: InventoryStatus, activeStage: StockStage) {
  if (activeStage === "all") return true;
  if (activeStage === "normal") return stockState === "정상";
  if (activeStage === "warning") return stockState === "주의";
  return stockState === "부족";
}

export function StockCatalogView() {
  const keyword = useStockBrowseState((state) => state.keyword);
  const selectedLocationId = useStockBrowseState((state) => state.zoneId);
  const setKeyword = useStockBrowseState((state) => state.setKeyword);
  const setSelectedLocationId = useStockBrowseState((state) => state.setZoneId);
  const delayedKeyword = useDeferredValue(keyword);
  const [activeStage, setActiveStage] = useState<StockStage>("all");

  const { data: locationRows } = useZoneMap();
  const { data: inventoryRows, isLoading: isInventoryLoading } = useStockRows({
    keyword: delayedKeyword,
    zoneId: selectedLocationId,
  });

  const visibleRows = useMemo(
    () => (inventoryRows ?? []).filter((row) => matchesStockStage(row.status, activeStage)),
    [activeStage, inventoryRows],
  );

  const visibleItemCount = visibleRows.length;
  const cautionItemCount = visibleRows.filter((row) => row.isLowStock).length;
  const aggregateQuantity = visibleRows.reduce((sum, row) => sum + row.quantity, 0);
  const shortageItemCount = visibleRows.filter((row) => row.status === "부족").length;

  const downloadVisibleRows = async () => {
    if (visibleRows.length === 0) return;

    const xlsxModule = await import("xlsx");
    const exportRows = visibleRows.map((row) => ({
      품목명: row.itemName,
      바코드: row.barcode ?? "",
      위치: row.locationName,
      수량: row.quantity,
      단위: row.unit,
      상태: row.status,
      부족기준: row.lowStockThreshold,
      업데이트: row.updatedAtLabel,
    }));
    const sheet = xlsxModule.utils.json_to_sheet(exportRows);
    const book = xlsxModule.utils.book_new();
    xlsxModule.utils.book_append_sheet(book, sheet, "Inventory");
    xlsxModule.writeFile(book, `inventory-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="view-stack workbench-page">
      <section className="stock-layout">
        <aside className="surface-card stock-filter-card">
          <div className="surface-head">
            <div>
              <span className="section-pill">Filters</span>
              <h3>재고 필터</h3>
              <p>위치와 상태 기준으로 현재 재고 목록을 빠르게 좁힙니다.</p>
            </div>
            <button
              className="stock-reset-link"
              onClick={() => {
                startTransition(() => {
                  setKeyword("");
                  setSelectedLocationId("all");
                });
                setActiveStage("all");
              }}
              type="button"
            >
              Clear All
            </button>
          </div>

          <div className="stock-filter-stack">
            <div className="input-cluster">
              <label className="input-label" htmlFor="stock-search-input">
                Search
              </label>
              <input
                id="stock-search-input"
                className="input-shell"
                placeholder="품목명 또는 바코드"
                value={keyword}
                onChange={(event) => {
                  const nextKeyword = event.target.value;
                  startTransition(() => setKeyword(nextKeyword));
                }}
              />
            </div>

            <div className="stock-filter-group">
              <p className="stock-filter-title">Location</p>
              <div className="stock-filter-list">
                <button
                  className={`stock-filter-chip${selectedLocationId === "all" ? " is-active" : ""}`}
                  onClick={() => startTransition(() => setSelectedLocationId("all"))}
                  type="button"
                >
                  <span>전체 위치</span>
                  <span className="badge">{inventoryRows?.length ?? 0}</span>
                </button>
                {locationRows?.map((locationRow) => {
                  const locationItemCount =
                    inventoryRows?.filter((row) => row.locationId === locationRow.id).length ?? 0;

                  return (
                    <button
                      key={locationRow.id}
                      className={`stock-filter-chip${selectedLocationId === locationRow.id ? " is-active" : ""}`}
                      onClick={() => startTransition(() => setSelectedLocationId(locationRow.id))}
                      type="button"
                    >
                      <span>{locationRow.name}</span>
                      <span className="badge">{locationItemCount}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="stock-filter-group">
              <p className="stock-filter-title">Status</p>
              <div className="stock-filter-list">
                {(["all", "normal", "warning", "danger"] as StockStage[]).map((stage) => (
                  <button
                    key={stage}
                    className={`stock-filter-chip${activeStage === stage ? " is-active" : ""}`}
                    onClick={() => setActiveStage(stage)}
                    type="button"
                  >
                    <span>
                      {stage === "all"
                        ? "전체"
                        : stage === "normal"
                          ? "정상"
                          : stage === "warning"
                            ? "주의"
                            : "부족"}
                    </span>
                    <span
                      className={`badge ${
                        stage === "normal" ? "ok" : stage === "warning" ? "warn" : stage === "danger" ? "danger" : ""
                      }`}
                    >
                      {stage === "all"
                        ? inventoryRows?.length ?? 0
                        : stage === "normal"
                          ? inventoryRows?.filter((row) => row.status === "정상").length ?? 0
                          : stage === "warning"
                            ? inventoryRows?.filter((row) => row.status === "주의").length ?? 0
                            : inventoryRows?.filter((row) => row.status === "부족").length ?? 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="stock-filter-summary-box">
              <div className="stock-summary-line">
                <span>노출 품목</span>
                <strong>{visibleItemCount}</strong>
              </div>
              <div className="stock-summary-line">
                <span>주의 및 부족</span>
                <strong>{cautionItemCount}</strong>
              </div>
              <div className="stock-summary-line">
                <span>총 수량</span>
                <strong>{aggregateQuantity}</strong>
              </div>
            </div>
          </div>
        </aside>

        <div className="primary-column">
          <section className="surface-card stock-table-card">
            <div className="surface-head">
              <div>
                <span className="section-pill">Products</span>
                <h3>재고 리스트</h3>
                <p>상태, 위치, 수량과 부족 알림 기준까지 한 번에 확인합니다.</p>
              </div>
              <div className="stock-header-tools">
                <div className="stock-view-switch">
                  <button className="stock-view-pill is-active" type="button">
                    List
                  </button>
                  <button className="stock-view-pill" type="button">
                    Grid
                  </button>
                </div>
                <Link className="button primary" href="/items/new">
                  품목 추가
                </Link>
              </div>
            </div>

            <div className="stock-toolbar">
              <div className="stock-stage-tabs">
                <button
                  className={`stock-stage-tab${activeStage === "all" ? " is-active" : ""}`}
                  onClick={() => setActiveStage("all")}
                  type="button"
                >
                  전체
                  <span className="badge">{inventoryRows?.length ?? 0}</span>
                </button>
                <button
                  className={`stock-stage-tab${activeStage === "warning" ? " is-active" : ""}`}
                  onClick={() => setActiveStage("warning")}
                  type="button"
                >
                  주의
                  <span className="badge warn">
                    {inventoryRows?.filter((row) => row.status === "주의").length ?? 0}
                  </span>
                </button>
                <button
                  className={`stock-stage-tab${activeStage === "danger" ? " is-active" : ""}`}
                  onClick={() => setActiveStage("danger")}
                  type="button"
                >
                  부족
                  <span className="badge danger">{shortageItemCount}</span>
                </button>
              </div>

              <button
                className="button secondary"
                disabled={visibleRows.length === 0}
                onClick={() => void downloadVisibleRows()}
                type="button"
              >
                엑셀 다운로드
              </button>
            </div>

            {isInventoryLoading ? <div className="loading-state">재고 데이터를 불러오는 중입니다.</div> : null}
            {!isInventoryLoading && visibleRows.length === 0 ? (
              <div className="loading-state">조건에 맞는 재고가 없습니다.</div>
            ) : null}

            {visibleRows.length > 0 ? (
              <>
                <div className="data-frame">
                  <table className="table data-table stock-table">
                    <thead>
                      <tr>
                        <th>품목</th>
                        <th>바코드</th>
                        <th>보관 위치</th>
                        <th>수량</th>
                        <th>부족 기준</th>
                        <th>상태</th>
                        <th>업데이트</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map((stockRow) => (
                        <tr key={stockRow.id}>
                          <td>
                            <div className="stock-name-cell">
                              <Link className="accent-link" href={`/items/${stockRow.itemId}`}>
                                <strong>{stockRow.itemName}</strong>
                              </Link>
                              <span className="stock-subtext">ID {stockRow.itemId}</span>
                            </div>
                          </td>
                          <td>
                            <span className="stock-barcode-pill">{stockRow.barcode ?? "-"}</span>
                          </td>
                          <td>{stockRow.locationName}</td>
                          <td>
                            <strong>
                              {stockRow.quantity}
                              {stockRow.unit}
                            </strong>
                          </td>
                          <td>
                            {stockRow.lowStockThreshold}
                            {stockRow.unit}
                          </td>
                          <td>
                            <span className={`badge ${getBadgeTone(stockRow.status)}`}>{stockRow.status}</span>
                          </td>
                          <td>{stockRow.updatedAtLabel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="stock-mobile-list">
                  {visibleRows.map((stockRow) => (
                    <article className="compact-card" key={stockRow.id}>
                      <div className="compact-card-head">
                        <div>
                          <Link className="accent-link" href={`/items/${stockRow.itemId}`}>
                            <h3>{stockRow.itemName}</h3>
                          </Link>
                          <div className="subtle">ID {stockRow.itemId}</div>
                        </div>
                        <span className={`badge ${getBadgeTone(stockRow.status)}`}>{stockRow.status}</span>
                      </div>
                      <div className="compact-card-grid">
                        <div className="compact-card-row">
                          <span>바코드</span>
                          <strong>{stockRow.barcode ?? "-"}</strong>
                        </div>
                        <div className="compact-card-row">
                          <span>보관 위치</span>
                          <strong>{stockRow.locationName}</strong>
                        </div>
                        <div className="compact-card-row">
                          <span>수량</span>
                          <strong>
                            {stockRow.quantity}
                            {stockRow.unit}
                          </strong>
                        </div>
                        <div className="compact-card-row">
                          <span>부족 기준</span>
                          <strong>
                            {stockRow.lowStockThreshold}
                            {stockRow.unit}
                          </strong>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : null}
          </section>
        </div>

        <StockInsightRail
          aggregateQuantity={aggregateQuantity}
          cautionItemCount={cautionItemCount}
          shortageItemCount={shortageItemCount}
          visibleItemCount={visibleItemCount}
        />
      </section>
    </div>
  );
}
