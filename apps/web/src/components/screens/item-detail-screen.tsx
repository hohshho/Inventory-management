"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  apiPost,
  type InventoryAdjustmentInput,
} from "@/lib/api";
import { useItemDetailQuery } from "@/hooks/queries/use-item-detail-query";

type ItemDetailScreenProps = {
  itemId: string;
};

export function ItemDetailScreen({ itemId }: ItemDetailScreenProps) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useItemDetailQuery(itemId);
  const { register, handleSubmit, reset } = useForm<InventoryAdjustmentInput>({
    defaultValues: {
      inventoryId: "",
      changeType: "increase",
      quantity: 0,
      reason: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (payload: InventoryAdjustmentInput) =>
      apiPost("/inventory-adjustments", payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["item-detail", itemId] }),
        queryClient.invalidateQueries({ queryKey: ["inventories"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["history"] }),
      ]);
      reset({
        inventoryId: data?.inventories[0]?.id ?? "",
        changeType: "increase",
        quantity: 0,
        reason: "",
      });
    },
  });

  if (isLoading || !data) {
    return <div className="loading-state">품목 상세를 불러오는 중입니다.</div>;
  }

  const primaryInventoryId = data.inventories[0]?.id ?? "";

  return (
    <div className="page-stack">
      <section className="card">
        <div className="page-heading">
          <div>
            <h1>{data.item.name}</h1>
            <div className="subtle">
              바코드 {data.item.barcode ?? "-"} · 단위 {data.item.defaultUnit}
            </div>
          </div>
          <Link className="button secondary" href="/inventory">
            재고 목록으로
          </Link>
        </div>
      </section>

      <section className="grid-2">
        <article className="card">
          <div className="card-title">
            <h2>위치별 재고</h2>
            <span className="badge">{data.inventories.length}개 위치</span>
          </div>
          <div className="stack">
            {data.inventories.map((inventory) => (
              <div className="list-item" key={inventory.id}>
                <div>
                  <strong>{inventory.locationName}</strong>
                  <div className="subtle">바코드 {inventory.barcode ?? "-"}</div>
                </div>
                <div>
                  <strong>
                    {inventory.quantity}
                    {inventory.unit}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="card">
          <div className="card-title">
            <h2>재고 수량 조정</h2>
            <span className="badge warn">실데이터 쓰기</span>
          </div>
          {data.inventories.length === 0 ? (
            <div className="empty-state">연결된 재고가 없어 수량 조정을 진행할 수 없습니다.</div>
          ) : (
            <form
              className="stack"
              onSubmit={handleSubmit((values) => mutation.mutate(values))}
            >
              <div className="field-block">
                <label className="field-label">대상 재고</label>
                <select
                  className="field"
                  {...register("inventoryId", { required: true })}
                  defaultValue={primaryInventoryId}
                >
                  {data.inventories.map((inventory) => (
                    <option key={inventory.id} value={inventory.id}>
                      {inventory.locationName} / 현재 {inventory.quantity}
                      {inventory.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-row">
                <div className="field-block">
                  <label className="field-label">조정 방식</label>
                  <select className="field" {...register("changeType", { required: true })}>
                    <option value="increase">증가</option>
                    <option value="decrease">감소</option>
                    <option value="manual_edit">직접 수정</option>
                  </select>
                </div>
                <div className="field-block">
                  <label className="field-label">수량</label>
                  <input
                    className="field"
                    type="number"
                    {...register("quantity", { required: true, valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="field-block">
                <label className="field-label">사유</label>
                <textarea
                  className="textarea"
                  {...register("reason", { required: true })}
                />
              </div>

              <div className="toolbar">
                <button className="button primary" type="submit">
                  {mutation.isPending ? "조정 중..." : "수량 조정"}
                </button>
              </div>
            </form>
          )}
        </article>
      </section>

      <section className="card">
        <div className="card-title">
          <h2>최근 변경 이력</h2>
          <span className="badge">{data.adjustments.length}건</span>
        </div>
        <div className="stack">
          {data.adjustments.map((entry) => (
            <div className="list-item" key={entry.id}>
              <div>
                <strong>{entry.locationName}</strong>
                <div className="subtle">{entry.reason}</div>
              </div>
              <div>
                <strong>
                  {entry.beforeQuantity} → {entry.afterQuantity}
                </strong>
                <div className="subtle">{entry.createdAtLabel}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
