"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { apiPost, type BarcodeResolutionResult } from "@/lib/api";

const quickCodes = ["8800000000001", "8800000000002", "9999999999999"];

export function ScanScreen() {
  const [barcode, setBarcode] = useState("");

  const mutation = useMutation({
    mutationFn: (value: string) =>
      apiPost<BarcodeResolutionResult>("/barcodes/resolve", { barcode: value }),
  });

  return (
    <div className="grid-2">
      <section className="card">
        <div className="card-title">
          <h2>바코드 스캔 시뮬레이터</h2>
          <span className="badge">카메라 연동 전 단계</span>
        </div>
        <div className="stack">
          <input
            className="field"
            placeholder="바코드를 입력하거나 아래 빠른 선택 사용"
            value={barcode}
            onChange={(event) => setBarcode(event.target.value)}
          />
          <div className="chip-row">
            {quickCodes.map((code) => (
              <button
                key={code}
                className="chip"
                onClick={() => setBarcode(code)}
                type="button"
              >
                {code}
              </button>
            ))}
          </div>
          <div className="toolbar">
            <button
              className="button primary"
              onClick={() => mutation.mutate(barcode)}
              type="button"
            >
              {mutation.isPending ? "조회 중..." : "품목 조회"}
            </button>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-title">
          <h2>조회 결과</h2>
          <span className="badge">resolve API</span>
        </div>
        {!mutation.data ? (
          <div className="empty-state">스캔 결과가 아직 없습니다.</div>
        ) : mutation.data.found && mutation.data.inventory ? (
          <div className="stack">
            <div>
              <strong>{mutation.data.inventory.itemName}</strong>
            </div>
            <div className="subtle">위치 {mutation.data.inventory.locationName}</div>
            <div className="subtle">
              현재 수량 {mutation.data.inventory.quantity}
              {mutation.data.inventory.unit}
            </div>
            <span className="badge ok">기존 품목 상세로 이동 가능</span>
          </div>
        ) : (
          <div className="stack">
            <div className="subtle">등록되지 않은 바코드입니다.</div>
            <span className="badge warn">신규 품목 등록 화면으로 연결</span>
          </div>
        )}
      </section>
    </div>
  );
}
