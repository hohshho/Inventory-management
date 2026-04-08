"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFieldArray, useForm } from "react-hook-form";
import { MobileBarcodeInput } from "@/components/mobile-barcode-input";
import { useCounterpartyList } from "@/hooks/queries/use-counterparty-list";
import { useStockProfile } from "@/hooks/queries/use-stock-profile";
import { useZoneMap } from "@/hooks/queries/use-zone-map";
import { apiGet, apiPost, type HistoricalSnapshot, type InventoryAdjustmentInput, type ItemRecord, type UpdateItemInput } from "@/lib/api";

type ItemProfileViewProps = {
  itemId: string;
};

type DetailSectionMode = "operations" | "item";

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

function uniqueValues(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value?.trim())).map((value) => value.trim())));
}

export function ItemProfileView({ itemId }: ItemProfileViewProps) {
  const queryClient = useQueryClient();
  const { data: itemBundle, isLoading: isItemBundleLoading } = useStockProfile(itemId);
  const { data: locationRows } = useZoneMap();
  const { data: counterpartyRows } = useCounterpartyList();
  const { data: itemOptions } = useQuery({
    queryKey: ["item-records"],
    queryFn: () => apiGet<ItemRecord[]>("/items"),
  });
  const [detailSectionMode, setDetailSectionMode] = useState<DetailSectionMode>("operations");
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
  const {
    control: itemControl,
    register: registerItem,
    handleSubmit: handleItemSubmit,
    reset: resetItemForm,
    setValue: setItemValue,
    watch: watchItemValue,
  } = useForm<UpdateItemInput>({
    defaultValues: {
      itemId,
      name: "",
      barcode: "",
      categoryLevel1: "",
      categoryLevel2: "",
      categoryLevel3: "",
      size: "",
      customFields: [],
      defaultUnit: "ea",
      memo: "",
      lowStockThreshold: 3,
    },
  });
  const { fields: customFieldRows, append, remove } = useFieldArray({
    control: itemControl,
    name: "customFields",
  });

  const selectedChangeType = watch("changeType");
  const itemBarcodeValue = watchItemValue("barcode") ?? "";
  const categoryLevel1 = watchItemValue("categoryLevel1") ?? "";
  const categoryLevel2 = watchItemValue("categoryLevel2") ?? "";
  const hasCategoryLevel1 = categoryLevel1.trim().length > 0;
  const hasCategoryLevel2 = categoryLevel2.trim().length > 0;
  const categoryLevel1Options = uniqueValues((itemOptions ?? []).map((item) => item.categoryLevel1));
  const categoryLevel2Options = uniqueValues(
    (itemOptions ?? [])
      .filter((item) => !categoryLevel1 || item.categoryLevel1 === categoryLevel1)
      .map((item) => item.categoryLevel2),
  );
  const categoryLevel3Options = uniqueValues(
    (itemOptions ?? [])
      .filter((item) => (!categoryLevel1 || item.categoryLevel1 === categoryLevel1) && (!categoryLevel2 || item.categoryLevel2 === categoryLevel2))
      .map((item) => item.categoryLevel3),
  );

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
        queryClient.invalidateQueries({ queryKey: ["item-records"] }),
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

  const updateItemMutation = useMutation({
    mutationFn: (payload: UpdateItemInput) => apiPost("/items/update", payload),
    onSuccess: async () => {
      setSuccessText("품목 정보를 수정했습니다.");
      setErrorText("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["stock-profile", itemId] }),
        queryClient.invalidateQueries({ queryKey: ["stock-rows"] }),
        queryClient.invalidateQueries({ queryKey: ["operations-digest"] }),
        queryClient.invalidateQueries({ queryKey: ["low-stock-alerts"] }),
      ]);
    },
    onError: (error) => {
      setSuccessText("");
      setErrorText(error instanceof Error ? error.message : "품목 수정에 실패했습니다.");
    },
  });

  useEffect(() => {
    if (!itemBundle) {
      return;
    }
    resetItemForm({
      itemId: itemBundle.item.id,
      name: itemBundle.item.name,
      barcode: itemBundle.item.barcode ?? "",
      categoryLevel1: itemBundle.item.categoryLevel1 ?? "",
      categoryLevel2: itemBundle.item.categoryLevel2 ?? "",
      categoryLevel3: itemBundle.item.categoryLevel3 ?? "",
      size: itemBundle.item.size ?? "",
      customFields: itemBundle.item.customFields ?? [],
      defaultUnit: itemBundle.item.defaultUnit,
      memo: itemBundle.item.memo,
      lowStockThreshold: itemBundle.item.lowStockThreshold,
    });
  }, [itemBundle, resetItemForm]);

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
              바코드 {itemBundle.item.barcode ?? "-"} / 분류 {itemBundle.item.categoryLevel1 || "-"}
              {itemBundle.item.categoryLevel2 ? ` > ${itemBundle.item.categoryLevel2}` : ""}
              {itemBundle.item.categoryLevel3 ? ` > ${itemBundle.item.categoryLevel3}` : ""} / 사이즈 {itemBundle.item.size || "-"} / 단위 {itemBundle.item.defaultUnit} / 부족 기준{" "}
              {itemBundle.item.lowStockThreshold}
              {itemBundle.item.defaultUnit}
            </div>
          </div>
          <div className="banner-actions">
            <div className="input-cluster banner-mode-select">
              <label className="input-label" htmlFor="item-profile-section-mode">
                상세 화면
              </label>
              <select
                id="item-profile-section-mode"
                className="input-shell"
                value={detailSectionMode}
                onChange={(event) => setDetailSectionMode(event.target.value as DetailSectionMode)}
              >
                <option value="operations">입출고 / 위치 이동</option>
                <option value="item">품목 정보 수정</option>
              </select>
            </div>
            <Link className="button secondary" href="/inventory">
              재고 목록으로
            </Link>
          </div>
        </div>
      </section>

      {successText ? <div className="badge ok">{successText}</div> : null}
      {errorText ? <div className="badge danger">{errorText}</div> : null}

      {detailSectionMode === "item" ? (
        <section>
          <article className="surface-card">
            <div className="panel-heading">
              <h2>품목 정보 수정</h2>
              <span className="badge">{itemBundle.inventories.length}개 위치 연결</span>
            </div>
            <form
              className="view-stack"
              onSubmit={handleItemSubmit(async (values) => {
                setSuccessText("");
                setErrorText("");
                await updateItemMutation.mutateAsync({
                  ...values,
                  itemId,
                  barcode: values.barcode?.trim() || undefined,
                  categoryLevel1: values.categoryLevel1?.trim() || "",
                  categoryLevel2: values.categoryLevel2?.trim() || "",
                  categoryLevel3: values.categoryLevel3?.trim() || "",
                  size: values.size?.trim() || "",
                  customFields:
                    values.customFields?.filter((field) => field.label?.trim() && field.value?.trim()) ?? [],
                  memo: values.memo ?? "",
                });
              })}
            >
              <div className="input-cluster">
                <label className="input-label">품목명</label>
                <input className="input-shell" {...registerItem("name", { required: true })} />
              </div>
              <div className="inline-fields">
                <MobileBarcodeInput
                  inputId="item-profile-barcode-input"
                  label="바코드"
                  value={itemBarcodeValue}
                  onChange={(nextValue) => setItemValue("barcode", nextValue, { shouldDirty: true })}
                />
                <div className="input-cluster">
                  <label className="input-label">사이즈</label>
                  <input className="input-shell" {...registerItem("size")} />
                </div>
              </div>
              <div className="input-cluster">
                <div className="panel-heading">
                  <h3>분류 체계</h3>
                  <span className="badge">최대 3단계</span>
                </div>
                <div className="inline-fields">
                  <div className="input-cluster">
                    <label className="input-label">1차 분류</label>
                    <input className="input-shell" list="item-profile-category-level1-list" {...registerItem("categoryLevel1")} />
                    <datalist id="item-profile-category-level1-list">
                      {categoryLevel1Options.map((option) => (
                        <option key={option} value={option} />
                      ))}
                    </datalist>
                  </div>
                  {hasCategoryLevel1 ? (
                    <div className="input-cluster">
                      <label className="input-label">2차 분류</label>
                      <input className="input-shell" list="item-profile-category-level2-list" {...registerItem("categoryLevel2")} />
                      <datalist id="item-profile-category-level2-list">
                        {categoryLevel2Options.map((option) => (
                          <option key={option} value={option} />
                        ))}
                      </datalist>
                    </div>
                  ) : null}
                  {hasCategoryLevel2 ? (
                    <div className="input-cluster">
                      <label className="input-label">3차 분류</label>
                      <input className="input-shell" list="item-profile-category-level3-list" {...registerItem("categoryLevel3")} />
                      <datalist id="item-profile-category-level3-list">
                        {categoryLevel3Options.map((option) => (
                          <option key={option} value={option} />
                        ))}
                      </datalist>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="input-cluster">
                <div className="panel-heading">
                  <h3>추가 속성</h3>
                  <button className="button" onClick={() => append({ label: "", value: "" })} type="button">
                    항목 추가
                  </button>
                </div>
                <div className="view-stack">
                  {customFieldRows.length === 0 ? <div className="subtle">필요한 속성을 자유롭게 추가할 수 있습니다.</div> : null}
                  {customFieldRows.map((field, index) => (
                    <div className="inline-fields" key={field.id}>
                      <input className="input-shell" placeholder="항목명" {...registerItem(`customFields.${index}.label`)} />
                      <input className="input-shell" placeholder="값" {...registerItem(`customFields.${index}.value`)} />
                      <button className="button workspace-danger-button" onClick={() => remove(index)} type="button">
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="inline-fields">
                <div className="input-cluster">
                  <label className="input-label">기본 단위</label>
                  <input className="input-shell" {...registerItem("defaultUnit", { required: true })} />
                </div>
              </div>
              <div className="input-cluster">
                <label className="input-label">부족 기준</label>
                <input
                  className="input-shell"
                  type="number"
                  min={1}
                  {...registerItem("lowStockThreshold", { required: true, valueAsNumber: true })}
                />
              </div>
              <div className="input-cluster">
                <label className="input-label">메모</label>
                <textarea className="input-area" {...registerItem("memo")} />
              </div>
              <div className="action-row">
                <button className="button primary" disabled={updateItemMutation.isPending} type="submit">
                  {updateItemMutation.isPending ? "수정 중..." : "품목 정보 저장"}
                </button>
              </div>
            </form>
          </article>
        </section>
      ) : (
        <section>
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

                <div className="action-row">
                  <button className="button primary" disabled={adjustStockMutation.isPending} type="submit">
                    {adjustStockMutation.isPending ? "저장 중..." : "변경 저장"}
                  </button>
                </div>
              </form>
            )}
          </article>
        </section>
      )}

      <section className="surface-card">
        <div className="panel-heading">
          <h2>위치별 재고 요약</h2>
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
                <strong>대상 재고: {adjustmentRow.locationName}</strong>
                <div className="subtle">
                  변경자: {adjustmentRow.createdByName} / 사유: {adjustmentRow.reason}
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
