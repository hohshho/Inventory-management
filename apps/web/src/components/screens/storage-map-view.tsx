"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useCounterpartyList } from "@/hooks/queries/use-counterparty-list";
import { useZoneMap } from "@/hooks/queries/use-zone-map";
import {
  apiPost,
  type CreateCounterpartyInput,
  type CreateLocationInput,
  type Counterparty,
  type DeleteCounterpartyInput,
  type DeleteLocationInput,
  type LocationItem,
  type UpdateCounterpartyInput,
  type UpdateLocationInput,
} from "@/lib/api";

type LocationForm = {
  name: string;
  type: string;
  description: string;
};

type CounterpartyForm = {
  name: string;
  type: "supplier";
  contact: string;
  notes: string;
};

export function StorageMapView() {
  const queryClient = useQueryClient();
  const { data: locationRows, isLoading: isLocationLoading } = useZoneMap();
  const { data: counterpartyRows, isLoading: isCounterpartyLoading } = useCounterpartyList();
  const [successText, setSuccessText] = useState("");
  const [errorText, setErrorText] = useState("");
  const [editingLocation, setEditingLocation] = useState<LocationItem | null>(null);
  const [editingCounterparty, setEditingCounterparty] = useState<Counterparty | null>(null);

  const locationForm = useForm<LocationForm>({
    defaultValues: {
      name: "",
      type: "냉장",
      description: "",
    },
  });
  const counterpartyForm = useForm<CounterpartyForm>({
    defaultValues: {
      name: "",
      type: "supplier",
      contact: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!editingLocation) {
      locationForm.reset({ name: "", type: "냉장", description: "" });
      return;
    }

    locationForm.reset({
      name: editingLocation.name,
      type: editingLocation.type,
      description: editingLocation.description,
    });
  }, [editingLocation, locationForm]);

  useEffect(() => {
    if (!editingCounterparty) {
      counterpartyForm.reset({ name: "", type: "supplier", contact: "", notes: "" });
      return;
    }

    counterpartyForm.reset({
      name: editingCounterparty.name,
      type: "supplier",
      contact: editingCounterparty.contact,
      notes: editingCounterparty.notes,
    });
  }, [editingCounterparty, counterpartyForm]);

  const refreshLocations = async (message: string) => {
    setSuccessText(message);
    setErrorText("");
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["zone-map"] }),
      queryClient.invalidateQueries({ queryKey: ["operations-digest"] }),
      queryClient.invalidateQueries({ queryKey: ["stock-rows"] }),
      queryClient.invalidateQueries({ queryKey: ["ledger-feed"] }),
    ]);
  };

  const refreshCounterparties = async (message: string) => {
    setSuccessText(message);
    setErrorText("");
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["counterparty-list"] }),
      queryClient.invalidateQueries({ queryKey: ["ledger-feed"] }),
    ]);
  };

  const createLocationMutation = useMutation({
    mutationFn: (payload: CreateLocationInput) => apiPost("/locations", payload),
    onSuccess: async () => {
      await refreshLocations("보관 위치를 추가했습니다.");
      setEditingLocation(null);
    },
    onError: (error) => {
      setSuccessText("");
      setErrorText(error instanceof Error ? error.message : "보관 위치 저장에 실패했습니다.");
    },
  });

  const updateLocationMutation = useMutation({
    mutationFn: (payload: UpdateLocationInput) => apiPost("/locations/update", payload),
    onSuccess: async () => {
      await refreshLocations("보관 위치를 수정했습니다.");
      setEditingLocation(null);
    },
    onError: (error) => {
      setSuccessText("");
      setErrorText(error instanceof Error ? error.message : "보관 위치 수정에 실패했습니다.");
    },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: (payload: DeleteLocationInput) => apiPost("/locations/delete", payload),
    onSuccess: async () => {
      await refreshLocations("보관 위치를 삭제했습니다.");
      setEditingLocation(null);
    },
    onError: (error) => {
      setSuccessText("");
      setErrorText(error instanceof Error ? error.message : "보관 위치 삭제에 실패했습니다.");
    },
  });

  const createCounterpartyMutation = useMutation({
    mutationFn: (payload: CreateCounterpartyInput) => apiPost("/counterparties", payload),
    onSuccess: async () => {
      await refreshCounterparties("거래처를 추가했습니다.");
      setEditingCounterparty(null);
    },
    onError: (error) => {
      setSuccessText("");
      setErrorText(error instanceof Error ? error.message : "거래처 저장에 실패했습니다.");
    },
  });

  const updateCounterpartyMutation = useMutation({
    mutationFn: (payload: UpdateCounterpartyInput) => apiPost("/counterparties/update", payload),
    onSuccess: async () => {
      await refreshCounterparties("거래처를 수정했습니다.");
      setEditingCounterparty(null);
    },
    onError: (error) => {
      setSuccessText("");
      setErrorText(error instanceof Error ? error.message : "거래처 수정에 실패했습니다.");
    },
  });

  const deleteCounterpartyMutation = useMutation({
    mutationFn: (payload: DeleteCounterpartyInput) => apiPost("/counterparties/delete", payload),
    onSuccess: async () => {
      await refreshCounterparties("거래처를 삭제했습니다.");
      setEditingCounterparty(null);
    },
    onError: (error) => {
      setSuccessText("");
      setErrorText(error instanceof Error ? error.message : "거래처 삭제에 실패했습니다.");
    },
  });

  const supplierRows = useMemo(
    () => (counterpartyRows ?? []).filter((row) => row.type === "supplier"),
    [counterpartyRows],
  );
  return (
    <div className="view-stack">
      {successText ? <div className="badge ok">{successText}</div> : null}
      {errorText ? <div className="badge danger">{errorText}</div> : null}

      <section className="duo-grid">
        <article className="surface-card">
          <div className="panel-heading">
            <h2>{editingLocation ? "보관 위치 수정" : "보관 위치 추가"}</h2>
            <span className="badge">입출고 위치 관리</span>
          </div>

          <form
            className="view-stack"
            onSubmit={locationForm.handleSubmit(async (values) => {
              setSuccessText("");
              setErrorText("");

              if (editingLocation) {
                await updateLocationMutation.mutateAsync({
                  locationId: editingLocation.id,
                  ...values,
                });
                return;
              }

              await createLocationMutation.mutateAsync(values);
            })}
          >
            <div className="input-cluster">
              <label className="input-label" htmlFor="location-name-input">
                위치 이름
              </label>
              <input
                id="location-name-input"
                className="input-shell"
                placeholder="예: 냉장 1구역"
                {...locationForm.register("name", { required: true })}
              />
            </div>
            <div className="input-cluster">
              <label className="input-label" htmlFor="location-type-input">
                유형
              </label>
              <input
                id="location-type-input"
                className="input-shell"
                placeholder="예: 냉장, 상온, 창고"
                {...locationForm.register("type")}
              />
            </div>
            <div className="input-cluster">
              <label className="input-label" htmlFor="location-description-input">
                설명
              </label>
              <textarea
                id="location-description-input"
                className="input-area"
                placeholder="위치 설명을 입력해 주세요."
                {...locationForm.register("description")}
              />
            </div>
            <div className="action-row">
              <button
                className="button primary"
                disabled={createLocationMutation.isPending || updateLocationMutation.isPending}
                type="submit"
              >
                {editingLocation ? "위치 수정" : "위치 추가"}
              </button>
              {editingLocation ? (
                <button
                  className="button"
                  onClick={() => setEditingLocation(null)}
                  type="button"
                >
                  수정 취소
                </button>
              ) : null}
            </div>
          </form>
        </article>

        <article className="surface-card">
          <div className="panel-heading">
            <h2>{editingCounterparty ? "거래처 수정" : "거래처 추가"}</h2>
            <span className="badge">공급처</span>
          </div>

          <form
            className="view-stack"
            onSubmit={counterpartyForm.handleSubmit(async (values) => {
              setSuccessText("");
              setErrorText("");

              if (editingCounterparty) {
                await updateCounterpartyMutation.mutateAsync({
                  counterpartyId: editingCounterparty.id,
                  ...values,
                  type: "supplier",
                });
                return;
              }

              await createCounterpartyMutation.mutateAsync({
                ...values,
                type: "supplier",
              });
            })}
          >
            <div className="input-cluster">
              <label className="input-label" htmlFor="counterparty-name-input">
                거래처명
              </label>
              <input
                id="counterparty-name-input"
                className="input-shell"
                placeholder="예: 새벽유통"
                {...counterpartyForm.register("name", { required: true })}
              />
            </div>
            <div className="input-cluster">
              <label className="input-label" htmlFor="counterparty-contact-input">
                연락처 / 담당자
              </label>
              <input
                id="counterparty-contact-input"
                className="input-shell"
                placeholder="예: 010-0000-0000 / 김담당"
                {...counterpartyForm.register("contact")}
              />
            </div>
            <div className="input-cluster">
              <label className="input-label" htmlFor="counterparty-notes-input">
                메모
              </label>
              <textarea
                id="counterparty-notes-input"
                className="input-area"
                placeholder="거래 조건이나 메모를 입력해 주세요."
                {...counterpartyForm.register("notes")}
              />
            </div>
            <div className="action-row">
              <button
                className="button primary"
                disabled={createCounterpartyMutation.isPending || updateCounterpartyMutation.isPending}
                type="submit"
              >
                {editingCounterparty ? "거래처 수정" : "거래처 추가"}
              </button>
              {editingCounterparty ? (
                <button
                  className="button"
                  onClick={() => setEditingCounterparty(null)}
                  type="button"
                >
                  수정 취소
                </button>
              ) : null}
            </div>
          </form>
        </article>
      </section>

      <section className="duo-grid">
        <article className="surface-card">
          <div className="panel-heading">
            <h2>등록된 위치</h2>
            <span className="badge">{locationRows?.length ?? 0}개</span>
          </div>
          {isLocationLoading ? <div className="loading-state">위치 목록을 불러오는 중입니다.</div> : null}
          <div className="tile-grid">
            {locationRows?.map((locationRow) => (
              <article className="surface-card" key={locationRow.id}>
                <div className="panel-heading">
                  <h3>{locationRow.name}</h3>
                  <span className="badge">{locationRow.type}</span>
                </div>
                <div className="view-stack">
                  <div className="subtle">{locationRow.description || "설명 없음"}</div>
                  <div>
                    <strong>{locationRow.itemCount}개 품목</strong>
                  </div>
                  <div className="subtle">현재 수량 {locationRow.quantity}개</div>
                  <div className="workspace-inline-actions">
                    <button
                      className="button"
                      onClick={() => setEditingLocation(locationRow)}
                      type="button"
                    >
                      수정
                    </button>
                    <button
                      className="button workspace-danger-button"
                      disabled={deleteLocationMutation.isPending}
                      onClick={() => {
                        void deleteLocationMutation.mutateAsync({ locationId: locationRow.id });
                      }}
                      type="button"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="surface-card">
          <div className="panel-heading">
            <h2>등록된 거래처</h2>
            <span className="badge">{supplierRows.length}개</span>
          </div>
          {isCounterpartyLoading ? <div className="loading-state">거래처 목록을 불러오는 중입니다.</div> : null}
          <div className="view-stack">
            {supplierRows.length === 0 ? <div className="empty-state">등록된 공급처가 없습니다.</div> : null}
            {supplierRows.map((row) => (
              <div className="info-row" key={row.id}>
                <div>
                  <strong>{row.name}</strong>
                  <div className="subtle">{row.contact || "연락처 없음"}</div>
                  <div className="subtle">{row.notes || "메모 없음"}</div>
                </div>
                <div className="workspace-inline-actions">
                  <button
                    className="button"
                    onClick={() => setEditingCounterparty(row)}
                    type="button"
                  >
                    수정
                  </button>
                  <button
                    className="button workspace-danger-button"
                    disabled={deleteCounterpartyMutation.isPending}
                    onClick={() => {
                      void deleteCounterpartyMutation.mutateAsync({ counterpartyId: row.id });
                    }}
                    type="button"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
