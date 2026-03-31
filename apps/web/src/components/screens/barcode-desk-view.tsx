"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { apiPost, type BarcodeResolutionResult } from "@/lib/api";

const sampleBarcodeSet = ["8800000000001", "8800000000002", "9999999999999"];

export function BarcodeDeskView() {
  const [barcodeDraft, setBarcodeDraft] = useState("");

  const barcodeLookupMutation = useMutation({
    mutationFn: (barcodeValue: string) =>
      apiPost<BarcodeResolutionResult>("/barcodes/resolve", { barcode: barcodeValue }),
  });

  const resolvedInventory = barcodeLookupMutation.data?.inventory;

  return (
    <div className="view-stack workbench-page">
      <section className="spotlight-shell is-compact">
        <div className="spotlight-copy">
          <span className="spotlight-pill">Scanner</span>
          <h1>바코드로 기존 품목을 찾고 신규 등록 여부를 구분합니다.</h1>
          <p>카메라 연동 전 단계 UI로 확장할 수 있도록 조회 영역과 결과 카드를 분리해두었습니다.</p>
        </div>
        <div className="spotlight-sidecar">
          <span className="section-pill">Quick Check</span>
          <h3>스캔 상태</h3>
          <div className="spotlight-list">
            <div className="spotlight-item">
              <span>조회 결과</span>
              <strong>{barcodeLookupMutation.data ? "완료" : "대기"}</strong>
            </div>
            <div className="spotlight-item">
              <span>등록 여부</span>
              <strong>{barcodeLookupMutation.data?.found ? "기존 품목" : "신규 후보"}</strong>
            </div>
            <div className="spotlight-item">
              <span>입력 코드</span>
              <strong>{barcodeDraft || "-"}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="content-split">
        <div className="primary-column">
          <section className="surface-card">
            <div className="surface-head">
              <div>
                <span className="section-pill">Scan Area</span>
                <h3>바코드 조회</h3>
                <p>샘플 코드를 선택하거나 직접 입력해 즉시 조회합니다.</p>
              </div>
              <span className="badge">카메라 연동 전 단계</span>
            </div>

            <div className="scanner-shell">
              <div className="scanner-window">
                <div className="scanner-line" />
              </div>
              <p className="subtle">샘플 코드를 사용하거나 직접 입력해서 테스트할 수 있습니다.</p>
            </div>

            <div className="view-stack">
              <div className="input-cluster">
                <label className="input-label" htmlFor="barcode-field">
                  바코드
                </label>
                <input
                  className="input-shell"
                  id="barcode-field"
                  placeholder="바코드 숫자를 입력하세요"
                  value={barcodeDraft}
                  onChange={(event) => setBarcodeDraft(event.target.value)}
                />
              </div>

              <div className="choice-row">
                {sampleBarcodeSet.map((sampleCode) => (
                  <button key={sampleCode} className="choice-pill" onClick={() => setBarcodeDraft(sampleCode)} type="button">
                    {sampleCode}
                  </button>
                ))}
              </div>

              <button
                className="button primary"
                disabled={!barcodeDraft.trim()}
                onClick={() => barcodeLookupMutation.mutate(barcodeDraft)}
                type="button"
              >
                {barcodeLookupMutation.isPending ? "조회 중..." : "품목 조회"}
              </button>
            </div>
          </section>
        </div>

        <section className="surface-card">
          <div className="surface-head">
            <div>
              <span className="section-pill">Result</span>
              <h3>조회 결과</h3>
              <p>기존 재고인지 신규 등록 후보인지 바로 구분합니다.</p>
            </div>
          </div>

          {!barcodeLookupMutation.data ? (
            <div className="loading-state">아직 조회 결과가 없습니다.</div>
          ) : barcodeLookupMutation.data.found && resolvedInventory ? (
            <div className="result-card">
              <div className="compact-card-head">
                <div>
                  <h3>{resolvedInventory.itemName}</h3>
                  <div className="subtle">{resolvedInventory.barcode ?? "-"}</div>
                </div>
                <span className="badge ok">기존 품목</span>
              </div>
              <div className="compact-card-grid">
                <div className="compact-card-row">
                  <span>위치</span>
                  <strong>{resolvedInventory.locationName}</strong>
                </div>
                <div className="compact-card-row">
                  <span>수량</span>
                  <strong>
                    {resolvedInventory.quantity}
                    {resolvedInventory.unit}
                  </strong>
                </div>
                <div className="compact-card-row">
                  <span>상태</span>
                  <strong>{resolvedInventory.status}</strong>
                </div>
                <div className="compact-card-row">
                  <span>업데이트</span>
                  <strong>{resolvedInventory.updatedAtLabel}</strong>
                </div>
              </div>
            </div>
          ) : (
            <div className="result-card">
              <div className="compact-card-head">
                <div>
                  <h3>등록되지 않은 바코드입니다.</h3>
                  <div className="subtle">신규 품목 등록 후보</div>
                </div>
                <span className="badge warn">신규 등록 필요</span>
              </div>
              <p className="subtle">품목 등록 화면에서 새 품목과 연결하면 됩니다.</p>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
