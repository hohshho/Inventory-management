"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useZoneMap } from "@/hooks/queries/use-zone-map";
import { apiPost, type CreateItemInput } from "@/lib/api";

export function ItemCreateView() {
  const queryClient = useQueryClient();
  const { data: locationOptions, isLoading: isLocationLoading } = useZoneMap();
  const [successText, setSuccessText] = useState("");
  const [errorText, setErrorText] = useState("");
  const { register, handleSubmit, reset, setValue, watch } = useForm<CreateItemInput>({
    defaultValues: {
      name: "",
      barcode: "",
      defaultUnit: "개",
      memo: "",
      locationId: "",
      initialQuantity: 0,
      lowStockThreshold: 3,
    },
  });

  useEffect(() => {
    if (!watch("locationId") && locationOptions?.[0]?.id) {
      setValue("locationId", locationOptions[0].id);
    }
  }, [locationOptions, setValue, watch]);

  const resetForm = () =>
    reset({
      name: "",
      barcode: "",
      defaultUnit: "개",
      memo: "",
      locationId: locationOptions?.[0]?.id ?? "",
      initialQuantity: 0,
      lowStockThreshold: 3,
    });

  const createItemMutation = useMutation({
    mutationFn: (payload: CreateItemInput) => apiPost("/items", payload),
    onSuccess: async () => {
      setSuccessText("신규 품목을 저장했습니다.");
      setErrorText("");
      resetForm();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["stock-rows"] }),
        queryClient.invalidateQueries({ queryKey: ["operations-digest"] }),
        queryClient.invalidateQueries({ queryKey: ["zone-map"] }),
        queryClient.invalidateQueries({ queryKey: ["low-stock-alerts"] }),
        queryClient.invalidateQueries({ queryKey: ["ledger-feed"] }),
      ]);
    },
    onError: (error) => {
      setSuccessText("");
      setErrorText(error instanceof Error ? error.message : "품목 저장에 실패했습니다.");
    },
  });

  const hasLocations = Boolean(locationOptions?.length);

  return (
    <div className="duo-grid">
      <section className="surface-card">
        <div className="panel-heading">
          <h2>신규 품목 등록</h2>
          <span className="badge">재고 시작값 포함</span>
        </div>

        {!isLocationLoading && !hasLocations ? (
          <div className="view-stack">
            <div className="empty-state">품목을 저장하려면 먼저 보관 위치를 하나 이상 만들어야 합니다.</div>
            <Link className="button primary" href="/locations">
              보관 위치 만들러 가기
            </Link>
          </div>
        ) : (
          <form
            className="view-stack"
            onSubmit={handleSubmit(async (values) => {
              setSuccessText("");
              setErrorText("");
              await createItemMutation.mutateAsync(values);
            })}
          >
            <div className="input-cluster">
              <label className="input-label" htmlFor="item-name-input">
                품목명
              </label>
              <input
                id="item-name-input"
                className="input-shell"
                placeholder="예: 우유 1L"
                {...register("name", { required: true })}
              />
            </div>

            <div className="inline-fields">
              <div className="input-cluster">
                <label className="input-label" htmlFor="item-barcode-input">
                  바코드
                </label>
                <input
                  id="item-barcode-input"
                  className="input-shell"
                  placeholder="선택 입력"
                  {...register("barcode")}
                />
              </div>
              <div className="input-cluster">
                <label className="input-label" htmlFor="item-unit-input">
                  단위
                </label>
                <input id="item-unit-input" className="input-shell" {...register("defaultUnit")} />
              </div>
            </div>

            <div className="inline-fields">
              <div className="input-cluster">
                <label className="input-label" htmlFor="item-location-select">
                  보관 위치
                </label>
                <select id="item-location-select" className="input-shell" {...register("locationId")}>
                  {(locationOptions ?? []).map((locationOption) => (
                    <option key={locationOption.id} value={locationOption.id}>
                      {locationOption.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="input-cluster">
                <label className="input-label" htmlFor="item-quantity-input">
                  초기 수량
                </label>
                <input
                  id="item-quantity-input"
                  className="input-shell"
                  type="number"
                  min={0}
                  {...register("initialQuantity", { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="input-cluster">
              <label className="input-label" htmlFor="item-threshold-input">
                부족 알림 기준 수량
              </label>
              <input
                id="item-threshold-input"
                className="input-shell"
                type="number"
                min={1}
                {...register("lowStockThreshold", { valueAsNumber: true })}
              />
            </div>

            <div className="input-cluster">
              <label className="input-label" htmlFor="item-memo-input">
                메모
              </label>
              <textarea
                id="item-memo-input"
                className="input-area"
                placeholder="추가 설명이 있으면 입력하세요"
                {...register("memo")}
              />
            </div>

            {successText ? <div className="badge ok">{successText}</div> : null}
            {errorText ? <div className="badge danger">{errorText}</div> : null}

            <div className="action-row">
              <button className="button primary" disabled={createItemMutation.isPending} type="submit">
                {createItemMutation.isPending ? "저장 중..." : "품목 저장"}
              </button>
              <button className="button" onClick={resetForm} type="button">
                초기화
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="surface-card">
        <div className="panel-heading">
          <h2>등록 안내</h2>
          <span className="badge">저장 조건</span>
        </div>
        <div className="view-stack">
          <div className="info-row">
            <div>
              <strong>필수 항목</strong>
              <div className="subtle">품목명, 단위, 보관 위치는 반드시 입력해야 합니다.</div>
            </div>
          </div>
          <div className="info-row">
            <div>
              <strong>부족 알림</strong>
              <div className="subtle">설정한 기준 수량 이하로 내려가면 부족 알림에 바로 표시됩니다.</div>
            </div>
          </div>
          <div className="info-row">
            <div>
              <strong>재고 이력 자동 생성</strong>
              <div className="subtle">초기 수량 기준으로 첫 재고 이력이 자동으로 생성됩니다.</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
