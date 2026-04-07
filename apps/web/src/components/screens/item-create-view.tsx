"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFieldArray, useForm } from "react-hook-form";
import { MobileBarcodeInput } from "@/components/mobile-barcode-input";
import { useZoneMap } from "@/hooks/queries/use-zone-map";
import { apiGet, apiPost, type CreateItemInput, type ItemRecord } from "@/lib/api";

type OptionalSectionKey = "barcode" | "categories" | "memo" | "customFields";

const OPTIONAL_SECTIONS: Array<{
  key: OptionalSectionKey;
  title: string;
  description: string;
}> = [
  { key: "barcode", title: "바코드", description: "모바일 카메라나 이미지로 바코드를 읽어 추가합니다." },
  { key: "categories", title: "분류 체계", description: "1차부터 3차까지 필요한 깊이만 추가합니다." },
  { key: "memo", title: "메모", description: "품목별 설명이나 주의사항을 남깁니다." },
  { key: "customFields", title: "추가 속성값", description: "색상, 제조사, 규격 같은 사용자 정의 항목을 만듭니다." },
];

function uniqueValues(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value?.trim())).map((value) => value.trim())));
}

export function ItemCreateView() {
  const queryClient = useQueryClient();
  const { data: locationOptions, isLoading: isLocationLoading } = useZoneMap();
  const { data: itemOptions } = useQuery({
    queryKey: ["item-records"],
    queryFn: () => apiGet<ItemRecord[]>("/items"),
  });
  const [successText, setSuccessText] = useState("");
  const [errorText, setErrorText] = useState("");
  const [categoryDepth, setCategoryDepth] = useState<1 | 2 | 3>(1);
  const [visibleSections, setVisibleSections] = useState<Record<OptionalSectionKey, boolean>>({
    barcode: false,
    categories: false,
    memo: false,
    customFields: false,
  });
  const { control, register, handleSubmit, reset, setValue, watch } = useForm<CreateItemInput>({
    defaultValues: {
      name: "",
      barcode: "",
      categoryLevel1: "",
      categoryLevel2: "",
      categoryLevel3: "",
      size: "",
      customFields: [],
      defaultUnit: "개",
      memo: "",
      locationId: "",
      initialQuantity: 0,
      lowStockThreshold: 3,
    },
  });
  const { fields: customFieldRows, append, remove, replace } = useFieldArray({
    control,
    name: "customFields",
  });
  const selectedLocationId = watch("locationId");
  const barcodeValue = watch("barcode") ?? "";
  const categoryLevel1 = watch("categoryLevel1") ?? "";
  const categoryLevel2 = watch("categoryLevel2") ?? "";
  const activeSectionCount = useMemo(() => Object.values(visibleSections).filter(Boolean).length, [visibleSections]);
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

  useEffect(() => {
    if (!selectedLocationId && locationOptions?.[0]?.id) {
      setValue("locationId", locationOptions[0].id);
    }
  }, [locationOptions, selectedLocationId, setValue]);

  const resetOptionalValues = (key: OptionalSectionKey) => {
    if (key === "barcode") {
      setValue("barcode", "");
      return;
    }
    if (key === "categories") {
      setValue("categoryLevel1", "");
      setValue("categoryLevel2", "");
      setValue("categoryLevel3", "");
      setCategoryDepth(1);
      return;
    }
    if (key === "memo") {
      setValue("memo", "");
      return;
    }
    replace([]);
  };

  const showSection = (key: OptionalSectionKey) => {
    setVisibleSections((current) => ({ ...current, [key]: true }));
    if (key === "categories") {
      setCategoryDepth(1);
    }
    if (key === "customFields" && customFieldRows.length === 0) {
      append({ label: "", value: "" });
    }
  };

  const hideSection = (key: OptionalSectionKey) => {
    setVisibleSections((current) => ({ ...current, [key]: false }));
    resetOptionalValues(key);
  };

  const resetForm = () => {
    reset({
      name: "",
      barcode: "",
      categoryLevel1: "",
      categoryLevel2: "",
      categoryLevel3: "",
      size: "",
      customFields: [],
      defaultUnit: "개",
      memo: "",
      locationId: locationOptions?.[0]?.id ?? "",
      initialQuantity: 0,
      lowStockThreshold: 3,
    });
    setVisibleSections({
      barcode: false,
      categories: false,
      memo: false,
      customFields: false,
    });
    setCategoryDepth(1);
  };

  const createItemMutation = useMutation({
    mutationFn: (payload: CreateItemInput) => apiPost("/items", payload),
    onSuccess: async () => {
      setSuccessText("신규 품목을 저장했습니다.");
      setErrorText("");
      resetForm();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["item-records"] }),
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
    <section className="surface-card view-stack">
      <div className="panel-heading">
        <div>
          <h2>신규 품목 등록</h2>
          <div className="subtle">오른쪽에서 항목을 추가하면 왼쪽 입력 폼에 바로 붙습니다.</div>
        </div>
        <span className="badge">선택 항목 {activeSectionCount}개</span>
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
          className="item-create-form"
          onSubmit={handleSubmit(async (values) => {
            setSuccessText("");
            setErrorText("");
            await createItemMutation.mutateAsync({
              ...values,
              barcode: visibleSections.barcode ? values.barcode?.trim() || undefined : undefined,
              categoryLevel1: visibleSections.categories ? values.categoryLevel1?.trim() || "" : "",
              categoryLevel2: visibleSections.categories ? values.categoryLevel2?.trim() || "" : "",
              categoryLevel3: visibleSections.categories ? values.categoryLevel3?.trim() || "" : "",
              size: values.size?.trim() || "",
              defaultUnit: values.defaultUnit.trim(),
              memo: visibleSections.memo ? values.memo?.trim() || "" : "",
              lowStockThreshold: values.lowStockThreshold,
              customFields:
                visibleSections.customFields
                  ? values.customFields
                      ?.map((field) => ({
                        label: field.label?.trim() ?? "",
                        value: field.value?.trim() ?? "",
                      }))
                      .filter((field) => field.label && field.value) ?? []
                  : [],
            });
          })}
        >
          <div className="item-create-layout">
            <div className="item-create-main">
              <section className="item-create-pane">
                <div className="panel-heading">
                  <h3>입력 폼</h3>
                  <span className="badge ok">기본 항목</span>
                </div>

                <div className="view-stack">
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

                  <div className="input-cluster">
                    <label className="input-label" htmlFor="item-size-input">
                      사이즈
                    </label>
                    <input
                      id="item-size-input"
                      className="input-shell"
                      placeholder="예: 1L / 대 / 500g"
                      {...register("size")}
                    />
                  </div>

                  <div className="inline-fields">
                    <div className="input-cluster">
                      <label className="input-label" htmlFor="item-unit-input">
                        단위
                      </label>
                      <input
                        id="item-unit-input"
                        className="input-shell"
                        placeholder="예: 개 / 박스 / 병"
                        {...register("defaultUnit", { required: true })}
                      />
                    </div>
                    <div className="input-cluster">
                      <label className="input-label" htmlFor="item-location-select">
                        보관 위치
                      </label>
                      <select id="item-location-select" className="input-shell" {...register("locationId", { required: true })}>
                        {(locationOptions ?? []).map((locationOption) => (
                          <option key={locationOption.id} value={locationOption.id}>
                            {locationOption.name}
                          </option>
                        ))}
                      </select>
                    </div>
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
                      {...register("initialQuantity", { required: true, valueAsNumber: true })}
                    />
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
                      {...register("lowStockThreshold", { required: true, valueAsNumber: true })}
                    />
                  </div>

                  {visibleSections.barcode ? (
                    <div className="item-create-added-card">
                      <div className="panel-heading">
                        <h3>바코드</h3>
                        <button className="button" onClick={() => hideSection("barcode")} type="button">
                          빼기
                        </button>
                      </div>
                      <MobileBarcodeInput
                        inputId="item-barcode-input"
                        label="바코드"
                        placeholder="선택 입력"
                        value={barcodeValue}
                        onChange={(nextValue) => setValue("barcode", nextValue, { shouldDirty: true })}
                      />
                    </div>
                  ) : null}

                  {visibleSections.categories ? (
                    <div className="item-create-added-card">
                      <div className="panel-heading">
                        <h3>분류 체계</h3>
                        <button className="button" onClick={() => hideSection("categories")} type="button">
                          빼기
                        </button>
                      </div>
                      <div className="view-stack">
                        <div className="input-cluster">
                          <label className="input-label" htmlFor="item-category-level1">
                            1차 분류
                          </label>
                          <input
                            id="item-category-level1"
                            className="input-shell"
                            list="item-category-level1-list"
                            placeholder="예: 식재료"
                            {...register("categoryLevel1")}
                          />
                          <datalist id="item-category-level1-list">
                            {categoryLevel1Options.map((option) => (
                              <option key={option} value={option} />
                            ))}
                          </datalist>
                        </div>

                        <div className="choice-row">
                          {categoryDepth < 2 ? (
                            <button className="button secondary" onClick={() => setCategoryDepth(2)} type="button">
                              2차 분류 추가
                            </button>
                          ) : (
                            <button
                              className="button"
                              onClick={() => {
                                setCategoryDepth(1);
                                setValue("categoryLevel2", "");
                                setValue("categoryLevel3", "");
                              }}
                              type="button"
                            >
                              2차 분류 빼기
                            </button>
                          )}
                          {categoryDepth < 3 ? (
                            <button
                              className="button secondary"
                              disabled={categoryDepth < 2}
                              onClick={() => setCategoryDepth(3)}
                              type="button"
                            >
                              3차 분류 추가
                            </button>
                          ) : (
                            <button
                              className="button"
                              onClick={() => {
                                setCategoryDepth(2);
                                setValue("categoryLevel3", "");
                              }}
                              type="button"
                            >
                              3차 분류 빼기
                            </button>
                          )}
                        </div>

                        {categoryDepth >= 2 ? (
                          <div className="input-cluster">
                            <label className="input-label" htmlFor="item-category-level2">
                              2차 분류
                            </label>
                            <input
                              id="item-category-level2"
                              className="input-shell"
                              list="item-category-level2-list"
                              placeholder="예: 유제품"
                              {...register("categoryLevel2")}
                            />
                            <datalist id="item-category-level2-list">
                              {categoryLevel2Options.map((option) => (
                                <option key={option} value={option} />
                              ))}
                            </datalist>
                          </div>
                        ) : null}

                        {categoryDepth >= 3 ? (
                          <div className="input-cluster">
                            <label className="input-label" htmlFor="item-category-level3">
                              3차 분류
                            </label>
                            <input
                              id="item-category-level3"
                              className="input-shell"
                              list="item-category-level3-list"
                              placeholder="예: 우유"
                              {...register("categoryLevel3")}
                            />
                            <datalist id="item-category-level3-list">
                              {categoryLevel3Options.map((option) => (
                                <option key={option} value={option} />
                              ))}
                            </datalist>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {visibleSections.memo ? (
                    <div className="item-create-added-card">
                      <div className="panel-heading">
                        <h3>메모</h3>
                        <button className="button" onClick={() => hideSection("memo")} type="button">
                          빼기
                        </button>
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
                    </div>
                  ) : null}

                  {visibleSections.customFields ? (
                    <div className="item-create-added-card">
                      <div className="panel-heading">
                        <h3>추가 속성값</h3>
                        <div className="workspace-inline-actions">
                          <button className="button" onClick={() => append({ label: "", value: "" })} type="button">
                            속성 추가
                          </button>
                          <button className="button" onClick={() => hideSection("customFields")} type="button">
                            빼기
                          </button>
                        </div>
                      </div>
                      <div className="view-stack">
                        {customFieldRows.map((field, index) => (
                          <div className="inline-fields" key={field.id}>
                            <input
                              className="input-shell"
                              placeholder="속성명 예: 제조사"
                              {...register(`customFields.${index}.label`)}
                            />
                            <input
                              className="input-shell"
                              placeholder="값 예: 정리합니다"
                              {...register(`customFields.${index}.value`)}
                            />
                            <button className="button workspace-danger-button" onClick={() => remove(index)} type="button">
                              삭제
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>

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
            </div>

            <aside className="item-create-side">
              <div className="item-create-side-section">
                <div className="panel-heading">
                  <h3>항목 추가</h3>
                  <span className="badge">{activeSectionCount}개 적용</span>
                </div>
                <div className="subtle">필요한 항목만 추가해서 왼쪽 폼을 원하는 형태로 구성하세요.</div>
              </div>

              <div className="item-create-section-picker">
                {OPTIONAL_SECTIONS.map((section) => (
                  <div className="item-create-picker-card" key={section.key}>
                    <div className="view-stack">
                      <strong>{section.title}</strong>
                      <div className="subtle">{section.description}</div>
                    </div>
                    <button
                      className={`button ${visibleSections[section.key] ? "secondary" : ""}`}
                      onClick={() => (visibleSections[section.key] ? hideSection(section.key) : showSection(section.key))}
                      type="button"
                    >
                      {visibleSections[section.key] ? "추가됨" : "추가"}
                    </button>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </form>
      )}
    </section>
  );
}
