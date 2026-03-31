"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useCounterpartyList } from "@/hooks/queries/use-counterparty-list";
import { useStockProfile } from "@/hooks/queries/use-stock-profile";
import { useZoneMap } from "@/hooks/queries/use-zone-map";
import { apiGet, apiPost, type HistoricalSnapshot, type InventoryAdjustmentInput } from "@/lib/api";

type ItemProfileViewProps = {
  itemId: string;
};

function getHistoryTone(changeType: string) {
  if (changeType === "decrease" || changeType === "transfer_out") return "danger";
  if (changeType === "manual_edit") return "warn";
  return "ok";
}

function getHistoryLabel(changeType: string) {
  if (changeType === "increase") return "입고";
  if (changeType === "decrease") return "출고";
  if (changeType === "transfer_in") return "이동 입고";
  if (changeType === "transfer_out") return "위치 이동";
  if (changeType === "create") return "초기 등록";
  return "직접 수정";
}

export function ItemProfileView({ itemId }: ItemProfileViewProps) {
  const queryClient = useQueryClient();
  const { data: itemBundle, isLoading: isItemBundleLoading } = useStockProfile(itemId);
  const { data: locationRows } = useZoneMap();
  const { data: counterpartyRows } = useCounterpartyList();
  const [successText, setSuccessText] = useState("");
  const [errorText, setErrorText] = useState("");
  const [snapshotAt, setSnapshotAt] = useState(() => new Date().toISOString().slice(0, 16));
  const { register, handleSubmit, reset, watch } = useForm<InventoryAdjustmentInput>({
    defaultValues: {
      inventoryId: "",
      changeType: "increase",
      quantity: 0,
      reason: "",
      targetLocationId: "",
      counterpartyId: "",
    },
  });

  const selectedChangeType = watch("changeType");

  const snapshotQuery = useQuery({
    queryKey: ["stock-snapshot", itemId, snapshotAt],
    queryFn: () =>
      apiGet<HistoricalSnapshot>(`/items/${itemId}/snapshot?at=${encodeURIComponent(new Date(snapshotAt).toISOString())}`),
    enabled: Boolean(itemId && snapshotAt),
  });

  const adjustStockMutation = useMutation({
    mutationFn: (payload: InventoryAdjustmentInput) => apiPost("/inventory-adjustments", payload),
    onSuccess: async () => {
      setSuccessText("재고 변경을 저장했습니다.");
      setErrorText("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["stock-profile", itemId] }),
        queryClient.invalidateQueries({ queryKey: ["stock-rows"] }),
        queryClient.invalidateQueries({ queryKey: ["operations-digest"] }),
        queryClient.invalidateQueries({ queryKey: ["ledger-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["low-stock-alerts"] }),
      ]);

      reset({
        inventoryId: itemBundle?.inventories[0]?.id ?? "",
        changeType: "increase",
        quantity: 0,
        reason: "",
        targetLocationId: "",
        counterpartyId: "",
      });
    },
    onError: (error) => {
      setSuccessText("");
      setErrorText(error instanceof Error ? error.message : "재고 변경 저장에 실패했습니다.");
    },
  });

  if (isItemBundleLoading || !itemBundle) {
    return <div className="loading-state">품목 상세를 불러오는 중입니다.</div>;
  }

  const defaultInventoryId = itemBundle.inventories[0]?.id ?? "";
  const isTransfer = selectedChangeType === "transfer";
  const isCounterpartyRequired = selectedChangeType === "increase" || selectedChangeType === "decrease";
  const filteredCounterparties = (counterpartyRows ?? []).filter((row) =>
    selectedChangeType === "decrease" ? row.type === "customer" : row.type === "supplier",
  );

  return (
    <div className="view-stack">
      <section className="surface-card">
        <div className="banner-row">
          <div>
            <h1>{itemBundle.item.name}</h1>
            <div className="subtle">
              바코드 {itemBundle.item.barcode ?? "-"} / 단위 {itemBundle.item.defaultUnit} / 부족 기준{" "}
              {itemBundle.item.lowStockThreshold}
              {itemBundle.item.defaultUnit}
            </div>
          </div>
          <Link className="button secondary" href="/inventory">
            재고 목록으로
          </Link>
        </div>
      </section>

      <section className="duo-grid">
        <article className="surface-card">
          <div className="panel-heading">
            <h2>위치별 재고</h2>
            <span className="badge">{itemBundle.inventories.length}개 위치</span>
          </div>
          <div className="view-stack">
            {itemBundle.inventories.map((inventoryRow) => (
              <div className="info-row" key={inventoryRow.id}>
                <div>
                  <strong>{inventoryRow.locationName}</strong>
                  <div className="subtle">바코드 {inventoryRow.barcode ?? "-"}</div>
                </div>
                <div>
                  <strong>
                    {inventoryRow.quantity}
                    {inventoryRow.unit}
                  </strong>
                  <div className={`badge ${inventoryRow.isLowStock ? "danger" : "ok"}`}>{inventoryRow.status}</div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="surface-card">
          <div className="panel-heading">
            <h2>입출고 / 위치 이동</h2>
            <span className="badge warn">거래처 연동</span>
          </div>

          {itemBundle.inventories.length === 0 ? (
            <div className="loading-state">연결된 재고가 없어 변경을 진행할 수 없습니다.</div>
          ) : (
            <form
              className="view-stack"
              onSubmit={handleSubmit(async (values) => {
                setSuccessText("");
                setErrorText("");
                await adjustStockMutation.mutateAsync(values);
              })}
            >
              <div className="input-cluster">
                <label className="input-label">대상 재고</label>
                <select
                  className="input-shell"
                  {...register("inventoryId", { required: true })}
                  defaultValue={defaultInventoryId}
                >
                  {itemBundle.inventories.map((inventoryRow) => (
                    <option key={inventoryRow.id} value={inventoryRow.id}>
                      {inventoryRow.locationName} / 현재 {inventoryRow.quantity}
                      {inventoryRow.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="inline-fields">
                <div className="input-cluster">
                  <label className="input-label">처리 유형</label>
                  <select className="input-shell" {...register("changeType", { required: true })}>
                    <option value="increase">입고</option>
                    <option value="decrease">출고</option>
                    <option value="manual_edit">직접 수정</option>
                    <option value="transfer">위치 이동</option>
                  </select>
                </div>
                <div className="input-cluster">
                  <label className="input-label">수량</label>
                  <input
                    className="input-shell"
                    type="number"
                    min={0}
                    {...register("quantity", { required: true, valueAsNumber: true })}
                  />
                </div>
              </div>

              {isCounterpartyRequired ? (
                <div className="input-cluster">
                  <label className="input-label">거래처</label>
                  <select className="input-shell" {...register("counterpartyId")}>
                    <option value="">거래처 선택</option>
                    {filteredCounterparties.map((counterparty) => (
                      <option key={counterparty.id} value={counterparty.id}>
                        {counterparty.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {isTransfer ? (
                <div className="input-cluster">
                  <label className="input-label">이동할 위치</label>
                  <select className="input-shell" {...register("targetLocationId")}>
                    <option value="">위치 선택</option>
                    {locationRows?.map((locationRow) => (
                      <option key={locationRow.id} value={locationRow.id}>
                        {locationRow.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="input-cluster">
                <label className="input-label">사유</label>
                <textarea className="input-area" {...register("reason", { required: true })} />
              </div>

              {successText ? <div className="badge ok">{successText}</div> : null}
              {errorText ? <div className="badge danger">{errorText}</div> : null}

              <div className="action-row">
                <button className="button primary" disabled={adjustStockMutation.isPending} type="submit">
                  {adjustStockMutation.isPending ? "저장 중..." : "변경 저장"}
                </button>
              </div>
            </form>
          )}
        </article>
      </section>

      <section className="surface-card">
        <div className="panel-heading">
          <h2>특정 시점 재고 조회</h2>
          <span className="badge">과거 수량 확인</span>
        </div>
        <div className="view-stack">
          <div className="input-cluster">
            <label className="input-label" htmlFor="snapshot-at-input">
              조회 시점
            </label>
            <input
              id="snapshot-at-input"
              className="input-shell"
              type="datetime-local"
              value={snapshotAt}
              onChange={(event) => setSnapshotAt(event.target.value)}
            />
          </div>

          {snapshotQuery.isLoading ? <div className="loading-state">과거 재고를 계산하는 중입니다.</div> : null}

          {snapshotQuery.data ? (
            <div className="view-stack">
              <div className="subtle">{snapshotQuery.data.atLabel} 기준</div>
              {snapshotQuery.data.rows.length === 0 ? (
                <div className="empty-state">해당 시점의 재고 기록이 없습니다.</div>
              ) : (
                snapshotQuery.data.rows.map((snapshotRow) => (
                  <div className="info-row" key={snapshotRow.locationId}>
                    <div>
                      <strong>{snapshotRow.locationName}</strong>
                    </div>
                    <div>
                      <strong>
                        {snapshotRow.quantity}
                        {snapshotRow.unit}
                      </strong>
                      <div className="subtle">{snapshotRow.status}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>
      </section>

      <section className="surface-card">
        <div className="panel-heading">
          <h2>최근 변경 이력</h2>
          <span className="badge">{itemBundle.adjustments.length}건</span>
        </div>
        <div className="view-stack">
          {itemBundle.adjustments.map((adjustmentRow) => (
            <div className="info-row" key={adjustmentRow.id}>
              <div>
                <strong>{adjustmentRow.locationName}</strong>
                <div className="subtle">
                  {adjustmentRow.createdByName} / {adjustmentRow.reason}
                </div>
                {adjustmentRow.counterpartyName ? (
                  <div className="subtle">거래처: {adjustmentRow.counterpartyName}</div>
                ) : null}
                {adjustmentRow.relatedLocationName ? (
                  <div className="subtle">연결 위치: {adjustmentRow.relatedLocationName}</div>
                ) : null}
              </div>
              <div>
                <span className={`badge ${getHistoryTone(adjustmentRow.changeType)}`}>
                  {getHistoryLabel(adjustmentRow.changeType)}
                </span>
                <div>
                  <strong>
                    {adjustmentRow.beforeQuantity} → {adjustmentRow.afterQuantity}
                  </strong>
                </div>
                <div className="subtle">{adjustmentRow.createdAtLabel}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
