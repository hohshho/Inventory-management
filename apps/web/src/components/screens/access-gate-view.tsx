"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/components/auth-session-provider";

type AccessMode = "sign-in" | "sign-up";

type AccessForm = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export function AccessGateView() {
  const router = useRouter();
  const [activeMode, setActiveMode] = useState<AccessMode>("sign-in");
  const [formErrorText, setFormErrorText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, reset } = useForm<AccessForm>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  const { signInUser, signUpUser, signInWithGoogleUser, user, loading } = useAuthSession();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [loading, router, user]);

  const submitText = activeMode === "sign-in" ? "로그인" : "회원가입";
  const titleText = activeMode === "sign-in" ? "로그인" : "회원가입";
  const descriptionText =
    activeMode === "sign-in"
      ? "이메일과 비밀번호 또는 Google 계정으로 로그인합니다."
      : "이름을 포함한 작업자 계정을 만들고 바로 그룹에 참여할 수 있습니다.";

  return (
    <div className="access-shell">
      <div className="access-card">
        <section className="access-visual">
          <span className="spotlight-pill">Inventory Access</span>
          <div className="view-stack">
            <h1>재고 운영 콘솔에 접속하세요.</h1>
            <p>
              그룹 기반 재고관리 앱의 인증 진입점입니다. 이메일 로그인과 Google 로그인을 모두
              지원하고, 회원가입 시 이름 정보까지 함께 받습니다.
            </p>
          </div>
          <div className="access-points">
            <div>1. 이메일 / 비밀번호 로그인</div>
            <div>2. Google 로그인 지원</div>
            <div>3. 그룹 승인 기반 참여</div>
          </div>
        </section>

        <section className="access-form-panel">
          <div className="view-stack" style={{ gap: 10 }}>
            <div className="choice-row">
              <button
                className={`choice-pill${activeMode === "sign-in" ? " is-active" : ""}`}
                onClick={() => {
                  setActiveMode("sign-in");
                  setFormErrorText("");
                  reset();
                }}
                type="button"
              >
                로그인
              </button>
              <button
                className={`choice-pill${activeMode === "sign-up" ? " is-active" : ""}`}
                onClick={() => {
                  setActiveMode("sign-up");
                  setFormErrorText("");
                  reset();
                }}
                type="button"
              >
                회원가입
              </button>
            </div>
            <div className="view-stack" style={{ gap: 6 }}>
              <h2>{titleText}</h2>
              <p className="subtle">{descriptionText}</p>
            </div>
          </div>

          <form
            className="view-stack"
            onSubmit={handleSubmit(async (formValues) => {
              setIsSubmitting(true);
              setFormErrorText("");

              try {
                if (activeMode === "sign-up") {
                  if (!formValues.name.trim()) {
                    throw new Error("이름은 필수입니다.");
                  }

                  if (formValues.password.length < 6) {
                    throw new Error("비밀번호는 6자 이상이어야 합니다.");
                  }

                  if (formValues.password !== formValues.confirmPassword) {
                    throw new Error("비밀번호 확인 값이 일치하지 않습니다.");
                  }

                  await signUpUser(formValues.name.trim(), formValues.email, formValues.password);
                } else {
                  await signInUser(formValues.email, formValues.password);
                }
              } catch (error) {
                setFormErrorText(
                  error instanceof Error ? error.message : `${submitText} 처리에 실패했습니다.`,
                );
              } finally {
                setIsSubmitting(false);
              }
            })}
          >
            {activeMode === "sign-up" ? (
              <div className="input-cluster">
                <label className="input-label">이름</label>
                <input className="input-shell" type="text" {...register("name")} />
              </div>
            ) : null}

            <div className="input-cluster">
              <label className="input-label">이메일</label>
              <input className="input-shell" type="email" {...register("email", { required: true })} />
            </div>

            <div className="input-cluster">
              <label className="input-label">비밀번호</label>
              <input
                className="input-shell"
                type="password"
                {...register("password", { required: true })}
              />
            </div>

            {activeMode === "sign-up" ? (
              <div className="input-cluster">
                <label className="input-label">비밀번호 확인</label>
                <input
                  className="input-shell"
                  type="password"
                  {...register("confirmPassword", { required: true })}
                />
              </div>
            ) : null}

            {formErrorText ? <div className="badge danger">{formErrorText}</div> : null}

            <button className="button primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? `${submitText} 처리 중...` : submitText}
            </button>

            <button
              className="button secondary"
              disabled={isSubmitting}
              onClick={async () => {
                setIsSubmitting(true);
                setFormErrorText("");

                try {
                  await signInWithGoogleUser();
                } catch (error) {
                  setFormErrorText(
                    error instanceof Error ? error.message : "Google 로그인에 실패했습니다.",
                  );
                } finally {
                  setIsSubmitting(false);
                }
              }}
              type="button"
            >
              Google로 계속하기
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
