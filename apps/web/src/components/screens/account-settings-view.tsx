"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useAuthSession } from "@/components/auth-session-provider";
import { useAutoClearingText } from "@/hooks/use-auto-clearing-text";
import { useToastFeedback } from "@/hooks/use-toast-feedback";
import { apiPost, type UserSession } from "@/lib/api";

type ProfileForm = {
  name: string;
  email: string;
};

export function AccountSettingsView() {
  const { profile, refreshProfile } = useAuthSession();
  const [successText, setSuccessText] = useState("");
  const [errorText, setErrorText] = useState("");
  useAutoClearingText(successText, setSuccessText);
  useAutoClearingText(errorText, setErrorText);
  useToastFeedback(successText, errorText);
  const { register, handleSubmit, reset } = useForm<ProfileForm>({
    defaultValues: {
      name: profile?.name ?? "",
      email: profile?.email ?? "",
    },
  });

  useEffect(() => {
    reset({
      name: profile?.name ?? "",
      email: profile?.email ?? "",
    });
  }, [profile?.email, profile?.name, reset]);

  const updateProfileMutation = useMutation({
    mutationFn: (payload: ProfileForm) => apiPost<UserSession>("/users/sync", payload),
    onSuccess: async () => {
      await refreshProfile();
      setSuccessText("개인정보를 저장했습니다.");
      setErrorText("");
    },
    onError: (error) => {
      setSuccessText("");
      setErrorText(error instanceof Error ? error.message : "개인정보 저장에 실패했습니다.");
    },
  });

  return (
    <div className="duo-grid">
      <section className="surface-card">
        <div className="panel-heading">
          <h2>개인정보 수정</h2>
          <span className="badge">이름 / 이메일</span>
        </div>

        <form
          className="view-stack"
          onSubmit={handleSubmit(async (values) => {
            setSuccessText("");
            setErrorText("");
            await updateProfileMutation.mutateAsync({
              name: values.name.trim(),
              email: values.email.trim(),
            });
          })}
        >
          <div className="input-cluster">
            <label className="input-label" htmlFor="profile-name-input">
              이름
            </label>
            <input
              id="profile-name-input"
              className="input-shell"
              placeholder="사용할 이름을 입력하세요"
              {...register("name", { required: true })}
            />
          </div>

          <div className="input-cluster">
            <label className="input-label" htmlFor="profile-email-input">
              이메일
            </label>
            <input
              id="profile-email-input"
              className="input-shell"
              placeholder="연락용 이메일을 입력하세요"
              {...register("email", { required: true })}
            />
          </div>
          <div className="action-row">
            <button className="button primary" disabled={updateProfileMutation.isPending} type="submit">
              {updateProfileMutation.isPending ? "저장 중..." : "이름 저장"}
            </button>
            <button
              className="button"
              onClick={() =>
                reset({
                  name: profile?.name ?? "",
                  email: profile?.email ?? "",
                })
              }
              type="button"
            >
              원래대로
            </button>
          </div>
        </form>
      </section>

      <section className="surface-card">
        <div className="panel-heading">
          <h2>현재 계정</h2>
          <span className="badge secondary">{profile?.activeGroupName ?? "그룹 미선택"}</span>
        </div>
        <div className="view-stack">
          <div className="info-row">
            <div>
              <strong>현재 이름</strong>
              <div className="subtle">{profile?.name ?? "-"}</div>
            </div>
          </div>
          <div className="info-row">
            <div>
              <strong>이메일</strong>
              <div className="subtle">{profile?.email ?? "-"}</div>
            </div>
          </div>
          <div className="info-row">
            <div>
              <strong>권한</strong>
              <div className="subtle">{profile?.activeGroupRole ?? "guest"}</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
