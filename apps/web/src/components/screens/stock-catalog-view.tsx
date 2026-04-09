"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { StockInsightRail } from "@/components/stock-insight-rail";
import { useStockRows } from "@/hooks/queries/use-stock-rows";
import { useZoneMap } from "@/hooks/queries/use-zone-map";
import { apiGet, type InventoryStatus, type ItemRecord } from "@/lib/api";
import { useStockBrowseState } from "@/stores/stock-browse-state";

type StockStage = "all" | "normal" | "warning" | "danger";
type DisplayMode = "list" | "grid";
type SortKey = "itemName" | "barcode" | "locationName" | "quantity" | "lowStockThreshold" | "status" | "updatedAtLabel";
type ColumnOption = {
  id: string;
  label: string;
  defaultVisible: boolean;
};

const STOCK_COLUMN_STORAGE_KEY = "im-stock-column-visibility";
const staticColumnOptions: ColumnOption[] = [
  { id: "size", label: "사이즈", defaultVisible: true },
  { id: "categoryLevel1", label: "대분류", defaultVisible: true },
  { id: "categoryLevel2", label: "중분류", defaultVisible: true },
  { id: "categoryLevel3", label: "소분류", defaultVisible: true },
  { id: "barcode", label: "바코드", defaultVisible: true },
  { id: "locationName", label: "보관 위치", defaultVisible: true },
  { id: "lowStockThreshold", label: "부족 알림 기준", defaultVisible: true },
  { id: "updatedAtLabel", label: "업데이트", defaultVisible: true },
];

function getStatusTone(stockState: InventoryStatus) {
  if (stockState.includes("부족")) return "danger";
  if (stockState.includes("주의")) return "warn";
  return "ok";
}

function matchesStockStage(stockState: InventoryStatus, activeStage: StockStage) {
  if (activeStage === "all") return true;
  const tone = getStatusTone(stockState);
  if (activeStage === "normal") return tone === "ok";
  if (activeStage === "warning") return tone === "warn";
  return tone === "danger";
}

function getCustomFieldValue(item: ItemRecord | undefined, label: string) {
  if (!item) return "-";
  return item.customFields.find((field) => field.label === label)?.value || "-";
}

function getColumnDefaultVisibility(columnId: string, columnOptions: ColumnOption[]) {
  return columnOptions.find((columnOption) => columnOption.id === columnId)?.defaultVisible ?? true;
}

function getSortMark(sortKey: SortKey, activeSortKey: SortKey, sortOrder: "asc" | "desc") {
  if (sortKey !== activeSortKey) return "↕";
  return sortOrder === "asc" ? "↑" : "↓";
}

export function StockCatalogView() {
  const keyword = useStockBrowseState((state) => state.keyword);
  const selectedLocationId = useStockBrowseState((state) => state.zoneId);
  const setKeyword = useStockBrowseState((state) => state.setKeyword);
  const setSelectedLocationId = useStockBrowseState((state) => state.setZoneId);
  const delayedKeyword = useDeferredValue(keyword);
  const [activeStage, setActiveStage] = useState<StockStage>("all");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("list");
  const [sortKey, setSortKey] = useState<SortKey>("itemName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [columnPrefsLoaded, setColumnPrefsLoaded] = useState(false);
  const [columnPanelOpen, setColumnPanelOpen] = useState(false);

  const { data: locationRows } = useZoneMap();
  const { data: inventoryRows, isLoading: isInventoryLoading } = useStockRows({
    keyword: delayedKeyword,
    zoneId: selectedLocationId,
  });
  const { data: itemRows } = useQuery({
    queryKey: ["item-records"],
    queryFn: () => apiGet<ItemRecord[]>("/items"),
  });

  const itemRecordById = useMemo(
    () => new Map((itemRows ?? []).map((itemRow) => [itemRow.id, itemRow])),
    [itemRows],
  );

  const visibleRows = useMemo(() => {
    const filteredRows = (inventoryRows ?? []).filter((row) => matchesStockStage(row.status, activeStage));
    return [...filteredRows].sort((leftRow, rightRow) => {
      const direction = sortOrder === "asc" ? 1 : -1;
      if (sortKey === "quantity" || sortKey === "lowStockThreshold") {
        return (leftRow[sortKey] - rightRow[sortKey]) * direction;
      }
      const leftValue = (leftRow[sortKey] ?? "").toString();
      const rightValue = (rightRow[sortKey] ?? "").toString();
      return leftValue.localeCompare(rightValue, "ko") * direction;
    });
  }, [activeStage, inventoryRows, sortKey, sortOrder]);

  const dynamicCustomFieldLabels = useMemo(() => {
    const labels = new Set<string>();
    visibleRows.forEach((row) => {
      itemRecordById.get(row.itemId)?.customFields.forEach((field) => {
        const trimmedLabel = field.label.trim();
        if (trimmedLabel) {
          labels.add(trimmedLabel);
        }
      });
    });
    return Array.from(labels).sort((left, right) => left.localeCompare(right, "ko"));
  }, [itemRecordById, visibleRows]);

  const availableColumnOptions = useMemo<ColumnOption[]>(
    () => [
      ...staticColumnOptions,
      ...dynamicCustomFieldLabels.map((label) => ({
        id: `custom:${label}`,
        label,
        defaultVisible: true,
      })),
    ],
    [dynamicCustomFieldLabels],
  );

  useEffect(() => {
    try {
      const savedColumns = window.localStorage.getItem(STOCK_COLUMN_STORAGE_KEY);
      setColumnVisibility(savedColumns ? (JSON.parse(savedColumns) as Record<string, boolean>) : {});
    } catch {
      setColumnVisibility({});
    } finally {
      setColumnPrefsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!columnPrefsLoaded) {
      return;
    }

    setColumnVisibility((currentVisibility) => {
      let hasChanges = false;
      const nextVisibility = { ...currentVisibility };

      availableColumnOptions.forEach((columnOption) => {
        if (!(columnOption.id in nextVisibility)) {
          nextVisibility[columnOption.id] = columnOption.defaultVisible;
          hasChanges = true;
        }
      });

      Object.keys(nextVisibility).forEach((columnId) => {
        if (!availableColumnOptions.some((columnOption) => columnOption.id === columnId)) {
          delete nextVisibility[columnId];
          hasChanges = true;
        }
      });

      return hasChanges ? nextVisibility : currentVisibility;
    });
  }, [availableColumnOptions, columnPrefsLoaded]);

  useEffect(() => {
    if (!columnPrefsLoaded) {
      return;
    }

    window.localStorage.setItem(STOCK_COLUMN_STORAGE_KEY, JSON.stringify(columnVisibility));
  }, [columnPrefsLoaded, columnVisibility]);

  const visibleColumnIds = useMemo(
    () =>
      new Set(
        availableColumnOptions
          .filter((columnOption) => columnVisibility[columnOption.id] ?? columnOption.defaultVisible)
          .map((columnOption) => columnOption.id),
      ),
    [availableColumnOptions, columnVisibility],
  );

  const visibleItemCount = visibleRows.length;
  const cautionItemCount = visibleRows.filter((row) => row.isLowStock).length;
  const aggregateQuantity = visibleRows.reduce((sum, row) => sum + row.quantity, 0);
  const shortageItemCount = visibleRows.filter((row) => getStatusTone(row.status) === "danger").length;
  const warningItemCount = visibleRows.filter((row) => getStatusTone(row.status) === "warn").length;
  const normalItemCount = visibleRows.filter((row) => getStatusTone(row.status) === "ok").length;
  const allOptionalColumnsVisible = availableColumnOptions.every(
    (columnOption) => columnVisibility[columnOption.id] ?? columnOption.defaultVisible,
  );

  const toggleColumnVisibility = (columnId: string) => {
    setColumnVisibility((currentVisibility) => ({
      ...currentVisibility,
      [columnId]: !(currentVisibility[columnId] ?? getColumnDefaultVisibility(columnId, availableColumnOptions)),
    }));
  };

  const showAllColumns = () => {
    setColumnVisibility(Object.fromEntries(availableColumnOptions.map((columnOption) => [columnOption.id, true])));
  };

  const resetColumns = () => {
    setColumnVisibility(
      Object.fromEntries(
        availableColumnOptions.map((columnOption) => [columnOption.id, columnOption.defaultVisible]),
      ),
    );
  };

  const downloadVisibleRows = async () => {
    if (visibleRows.length === 0) return;

    const xlsxModule = await import("xlsx");
    const exportRows = visibleRows.map((row) => {
      const itemRecord = itemRecordById.get(row.itemId);
      const exportRow: Record<string, string | number> = {
        품목명: row.itemName,
        수량: row.quantity,
        단위: row.unit,
        상태: row.status,
      };

      if (visibleColumnIds.has("size")) exportRow.사이즈 = itemRecord?.size || "-";
      if (visibleColumnIds.has("categoryLevel1")) exportRow.대분류 = itemRecord?.categoryLevel1 || "-";
      if (visibleColumnIds.has("categoryLevel2")) exportRow.중분류 = itemRecord?.categoryLevel2 || "-";
      if (visibleColumnIds.has("categoryLevel3")) exportRow.소분류 = itemRecord?.categoryLevel3 || "-";
      if (visibleColumnIds.has("barcode")) exportRow.바코드 = row.barcode ?? "";
      if (visibleColumnIds.has("locationName")) exportRow["보관 위치"] = row.locationName;
      if (visibleColumnIds.has("lowStockThreshold")) exportRow["부족 알림 기준"] = row.lowStockThreshold;
      if (visibleColumnIds.has("updatedAtLabel")) exportRow.업데이트 = row.updatedAtLabel;

      dynamicCustomFieldLabels.forEach((label) => {
        if (visibleColumnIds.has(`custom:${label}`)) {
          exportRow[label] = getCustomFieldValue(itemRecord, label);
        }
      });

      return exportRow;
    });

    const sheet = xlsxModule.utils.json_to_sheet(exportRows);
    const book = xlsxModule.utils.book_new();
    xlsxModule.utils.book_append_sheet(book, sheet, "Inventory");
    xlsxModule.writeFile(book, `inventory-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleSort = (nextSortKey: SortKey) => {
    if (sortKey === nextSortKey) {
      setSortOrder((currentOrder) => (currentOrder === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextSortKey);
    setSortOrder("asc");
  };

  const renderDetailRows = (row: (typeof visibleRows)[number]) => {
    const itemRecord = itemRecordById.get(row.itemId);
    const detailRows: Array<{ key: string; label: string; value: string }> = [];

    if (visibleColumnIds.has("size")) detailRows.push({ key: "size", label: "사이즈", value: itemRecord?.size || "-" });
    if (visibleColumnIds.has("categoryLevel1")) {
      detailRows.push({ key: "categoryLevel1", label: "대분류", value: itemRecord?.categoryLevel1 || "-" });
    }
    if (visibleColumnIds.has("categoryLevel2")) {
      detailRows.push({ key: "categoryLevel2", label: "중분류", value: itemRecord?.categoryLevel2 || "-" });
    }
    if (visibleColumnIds.has("categoryLevel3")) {
      detailRows.push({ key: "categoryLevel3", label: "소분류", value: itemRecord?.categoryLevel3 || "-" });
    }
    if (visibleColumnIds.has("barcode")) detailRows.push({ key: "barcode", label: "바코드", value: row.barcode ?? "-" });
    if (visibleColumnIds.has("locationName")) {
      detailRows.push({ key: "locationName", label: "보관 위치", value: row.locationName });
    }

    detailRows.push({ key: "quantity", label: "수량", value: `${row.quantity}${row.unit}` });

    if (visibleColumnIds.has("lowStockThreshold")) {
      detailRows.push({
        key: "lowStockThreshold",
        label: "부족 알림 기준",
        value: `${row.lowStockThreshold}${row.unit}`,
      });
    }

    detailRows.push({ key: "status", label: "상태", value: row.status });

    if (visibleColumnIds.has("updatedAtLabel")) {
      detailRows.push({ key: "updatedAtLabel", label: "업데이트", value: row.updatedAtLabel });
    }

    dynamicCustomFieldLabels.forEach((label) => {
      if (visibleColumnIds.has(`custom:${label}`)) {
        detailRows.push({ key: `custom:${label}`, label, value: getCustomFieldValue(itemRecord, label) });
      }
    });

    return detailRows;
  };

  return (
    <div className="view-stack workbench-page">
      <section className="stock-layout">
        <aside className="surface-card stock-filter-card">
          <div className="surface-head">
            <div>
              <h3>재고 필터</h3>
              <p>위치와 상태 기준으로 현재 재고 목록을 빠르게 좁혀 볼 수 있습니다.</p>
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
              전체 해제
            </button>
          </div>

          <div className="stock-filter-stack">
            <div className="input-cluster">
              <label className="input-label" htmlFor="stock-search-input">
                검색
              </label>
              <input
                id="stock-search-input"
                className="input-shell"
                list="stock-item-search-list"
                placeholder="품목명 검색"
                value={keyword}
                onChange={(event) => {
                  const nextKeyword = event.target.value;
                  startTransition(() => setKeyword(nextKeyword));
                }}
              />
              <datalist id="stock-item-search-list">
                {(itemRows ?? []).map((itemRow) => (
                  <option key={itemRow.id} value={itemRow.name} />
                ))}
              </datalist>
            </div>

            <div className="stock-filter-group">
              <p className="stock-filter-title">보관 위치</p>
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
              <p className="stock-filter-title">상태</p>
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
                          ? normalItemCount
                          : stage === "warning"
                            ? warningItemCount
                            : shortageItemCount}
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

        <div className="primary-column stock-main-column">
          <section className="surface-card stock-table-card">
            <div className="surface-head">
              <div>
                <h3>재고 리스트</h3>
                <p>표시는 체크한 속성만 유지하고, 길어질 때는 표 안에서 가로 스크롤됩니다.</p>
              </div>
              <div className="stock-header-tools">
                <div className="stock-view-switch">
                  <button
                    className={`stock-view-pill${displayMode === "list" ? " is-active" : ""}`}
                    onClick={() => setDisplayMode("list")}
                    type="button"
                  >
                    리스트
                  </button>
                  <button
                    className={`stock-view-pill${displayMode === "grid" ? " is-active" : ""}`}
                    onClick={() => setDisplayMode("grid")}
                    type="button"
                  >
                    카드
                  </button>
                </div>
                <button
                  className={`button secondary${columnPanelOpen ? " is-active" : ""}`}
                  onClick={() => setColumnPanelOpen((current) => !current)}
                  type="button"
                >
                  노출 항목
                </button>
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
                  <span className="badge warn">{warningItemCount}</span>
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

              <div className="stock-toolbar-actions">
                <button
                  className="button secondary"
                  disabled={visibleRows.length === 0}
                  onClick={() => void downloadVisibleRows()}
                  type="button"
                >
                  엑셀 다운로드
                </button>
              </div>
            </div>

            {columnPanelOpen ? (
              <div className="stock-column-panel">
                <div className="stock-column-panel-head">
                  <div>
                    <strong>노출할 속성 선택</strong>
                    <p>체크한 항목만 테이블, 카드, 다운로드 파일에 표시됩니다.</p>
                  </div>
                  <div className="stock-column-panel-actions">
                    <button
                      className="button secondary"
                      disabled={allOptionalColumnsVisible}
                      onClick={showAllColumns}
                      type="button"
                    >
                      전체 표시
                    </button>
                    <button className="button secondary" onClick={resetColumns} type="button">
                      기본값
                    </button>
                  </div>
                </div>
                <div className="stock-column-option-list">
                  {availableColumnOptions.map((columnOption) => (
                    <label className="stock-column-option" key={columnOption.id}>
                      <input
                        checked={visibleColumnIds.has(columnOption.id)}
                        onChange={() => toggleColumnVisibility(columnOption.id)}
                        type="checkbox"
                      />
                      <span>{columnOption.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {isInventoryLoading ? <div className="loading-state">재고 데이터를 불러오는 중입니다.</div> : null}
            {!isInventoryLoading && visibleRows.length === 0 ? (
              <div className="loading-state">조건에 맞는 재고가 없습니다.</div>
            ) : null}

            {visibleRows.length > 0 ? (
              <>
                {displayMode === "list" ? (
                  <div className="data-frame">
                    <table className="table data-table stock-table">
                      <thead>
                        <tr>
                          <th>
                            <button className="sort-header-button" onClick={() => handleSort("itemName")} type="button">
                              품목 <span>{getSortMark("itemName", sortKey, sortOrder)}</span>
                            </button>
                          </th>
                          {visibleColumnIds.has("size") ? <th>사이즈</th> : null}
                          {visibleColumnIds.has("categoryLevel1") ? <th>대분류</th> : null}
                          {visibleColumnIds.has("categoryLevel2") ? <th>중분류</th> : null}
                          {visibleColumnIds.has("categoryLevel3") ? <th>소분류</th> : null}
                          {visibleColumnIds.has("barcode") ? (
                            <th>
                              <button className="sort-header-button" onClick={() => handleSort("barcode")} type="button">
                                바코드 <span>{getSortMark("barcode", sortKey, sortOrder)}</span>
                              </button>
                            </th>
                          ) : null}
                          {visibleColumnIds.has("locationName") ? (
                            <th>
                              <button className="sort-header-button" onClick={() => handleSort("locationName")} type="button">
                                보관 위치 <span>{getSortMark("locationName", sortKey, sortOrder)}</span>
                              </button>
                            </th>
                          ) : null}
                          <th>
                            <button className="sort-header-button" onClick={() => handleSort("quantity")} type="button">
                              수량 <span>{getSortMark("quantity", sortKey, sortOrder)}</span>
                            </button>
                          </th>
                          {visibleColumnIds.has("lowStockThreshold") ? (
                            <th>
                              <button
                                className="sort-header-button"
                                onClick={() => handleSort("lowStockThreshold")}
                                type="button"
                              >
                                부족 알림 기준 <span>{getSortMark("lowStockThreshold", sortKey, sortOrder)}</span>
                              </button>
                            </th>
                          ) : null}
                          <th>
                            <button className="sort-header-button" onClick={() => handleSort("status")} type="button">
                              상태 <span>{getSortMark("status", sortKey, sortOrder)}</span>
                            </button>
                          </th>
                          {visibleColumnIds.has("updatedAtLabel") ? (
                            <th>
                              <button className="sort-header-button" onClick={() => handleSort("updatedAtLabel")} type="button">
                                업데이트 <span>{getSortMark("updatedAtLabel", sortKey, sortOrder)}</span>
                              </button>
                            </th>
                          ) : null}
                          {dynamicCustomFieldLabels
                            .filter((label) => visibleColumnIds.has(`custom:${label}`))
                            .map((label) => (
                              <th key={label}>{label}</th>
                            ))}
                        </tr>
                      </thead>
                      <tbody>
                        {visibleRows.map((stockRow) => {
                          const itemRecord = itemRecordById.get(stockRow.itemId);

                          return (
                            <tr key={stockRow.id}>
                              <td>
                                <div className="stock-name-cell">
                                  <Link className="accent-link" href={`/items/${stockRow.itemId}`}>
                                    <strong>{stockRow.itemName}</strong>
                                  </Link>
                                  <span className="stock-subtext">ID {stockRow.itemId}</span>
                                </div>
                              </td>
                              {visibleColumnIds.has("size") ? <td>{itemRecord?.size || "-"}</td> : null}
                              {visibleColumnIds.has("categoryLevel1") ? <td>{itemRecord?.categoryLevel1 || "-"}</td> : null}
                              {visibleColumnIds.has("categoryLevel2") ? <td>{itemRecord?.categoryLevel2 || "-"}</td> : null}
                              {visibleColumnIds.has("categoryLevel3") ? <td>{itemRecord?.categoryLevel3 || "-"}</td> : null}
                              {visibleColumnIds.has("barcode") ? (
                                <td>
                                  <span className="stock-barcode-pill">{stockRow.barcode ?? "-"}</span>
                                </td>
                              ) : null}
                              {visibleColumnIds.has("locationName") ? <td>{stockRow.locationName}</td> : null}
                              <td>
                                <strong>
                                  {stockRow.quantity}
                                  {stockRow.unit}
                                </strong>
                              </td>
                              {visibleColumnIds.has("lowStockThreshold") ? (
                                <td>
                                  {stockRow.lowStockThreshold}
                                  {stockRow.unit}
                                </td>
                              ) : null}
                              <td>
                                <span className={`badge ${getStatusTone(stockRow.status)}`}>{stockRow.status}</span>
                              </td>
                              {visibleColumnIds.has("updatedAtLabel") ? <td>{stockRow.updatedAtLabel}</td> : null}
                              {dynamicCustomFieldLabels
                                .filter((label) => visibleColumnIds.has(`custom:${label}`))
                                .map((label) => (
                                  <td key={label}>{getCustomFieldValue(itemRecord, label)}</td>
                                ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {displayMode === "grid" ? (
                  <div className="stock-card-grid">
                    {visibleRows.map((stockRow) => (
                      <article className="stock-grid-card" key={stockRow.id}>
                        <div className="compact-card-head">
                          <div>
                            <Link className="accent-link" href={`/items/${stockRow.itemId}`}>
                              <h3>{stockRow.itemName}</h3>
                            </Link>
                            <div className="subtle">ID {stockRow.itemId}</div>
                          </div>
                          <span className={`badge ${getStatusTone(stockRow.status)}`}>{stockRow.status}</span>
                        </div>
                        <div className="compact-card-grid">
                          {renderDetailRows(stockRow).map((detailRow) => (
                            <div className="compact-card-row" key={detailRow.key}>
                              <span>{detailRow.label}</span>
                              <strong>{detailRow.value}</strong>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : null}

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
                        <span className={`badge ${getStatusTone(stockRow.status)}`}>{stockRow.status}</span>
                      </div>
                      <div className="compact-card-grid">
                        {renderDetailRows(stockRow).map((detailRow) => (
                          <div className="compact-card-row" key={detailRow.key}>
                            <span>{detailRow.label}</span>
                            <strong>{detailRow.value}</strong>
                          </div>
                        ))}
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
