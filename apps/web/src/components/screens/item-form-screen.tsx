"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { apiPost, type CreateItemInput } from "@/lib/api";
import { useLocationsQuery } from "@/hooks/queries/use-locations-query";

export function ItemFormScreen() {
  const queryClient = useQueryClient();
  const { data: locations } = useLocationsQuery();
  const { register, handleSubmit, reset } = useForm<CreateItemInput>({
    defaultValues: {
      name: "",
      barcode: "",
      defaultUnit: "개",
      memo: "",
      locationId: "loc-fridge-a1",
      initialQuantity: 0,
    },
  });

  const mutation = useMutation({
    mutationFn: (payload: CreateItemInput) => apiPost("/items", payload),
    onSuccess: async () => {
      reset();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["inventories"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
      ]);
    },
  });

  return (
    <div className="grid-2">
      <section className="card">
        <div className="card-title">
          <h2>신규 품목 등록</h2>
          <span className="badge">최소 입력 중심</span>
        </div>

        <form
          className="stack"
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
        >
          <div className="field-block">
            <label className="field-label">품목명</label>
            <input className="field" {...register("name", { required: true })} />
          </div>

          <div className="field-row">
            <div className="field-block">
              <label className="field-label">바코드</label>
              <input className="field" {...register("barcode")} />
            </div>
            <div className="field-block">
              <label className="field-label">단위</label>
              <input className="field" {...register("defaultUnit")} />
            </div>
          </div>

          <div className="field-row">
            <div className="field-block">
              <label className="field-label">위치</label>
              <select className="field" {...register("locationId")}>
                {(locations ?? []).map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-block">
              <label className="field-label">초기 수량</label>
              <input
                className="field"
                type="number"
                {...register("initialQuantity", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="field-block">
            <label className="field-label">메모</label>
            <textarea className="textarea" {...register("memo")} />
          </div>

          <div className="toolbar">
            <button className="button primary" type="submit">
              {mutation.isPending ? "저장 중..." : "품목 저장"}
            </button>
            <button className="button" onClick={() => reset()} type="button">
              초기화
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="card-title">
          <h2>등록 기준</h2>
          <span className="badge">운영 정책</span>
        </div>
        <div className="stack">
          <div className="list-item">
            <div>
              <strong>현장 입력 우선</strong>
              <div className="subtle">이름, 위치, 수량 중심으로 등록 흐름 최소화</div>
            </div>
          </div>
          <div className="list-item">
            <div>
              <strong>바코드 연동 준비</strong>
              <div className="subtle">스캔 페이지와 자연스럽게 연결되는 등록 구조 유지</div>
            </div>
          </div>
          <div className="list-item">
            <div>
              <strong>저장 결과</strong>
              <div className="subtle">
                {mutation.isSuccess
                  ? "품목 생성 응답을 받았습니다."
                  : "저장 후 API 응답이 이 영역에 반영됩니다."}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
