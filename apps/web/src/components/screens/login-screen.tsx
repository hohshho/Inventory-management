"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/components/auth-session-provider";

type AuthMode = "sign-in" | "sign-up";

type AuthFormValues = {
  email: string;
  password: string;
  confirmPassword: string;
};

export function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, reset } = useForm<AuthFormValues>({
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  const { signInUser, signUpUser, signInWithGoogleUser, user, loading } =
    useAuthSession();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [loading, router, user]);

  const submitLabel = mode === "sign-in" ? "로그인" : "회원가입";
  const title = mode === "sign-in" ? "로그인" : "회원가입";
  const description =
    mode === "sign-in"
      ? "이메일/비밀번호 또는 Google 계정으로 로그인합니다."
      : "새 작업자 계정을 만들고 바로 입장합니다.";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
      }}
    >
      <div
        className="card"
        style={{
          width: "min(100%, 960px)",
          display: "grid",
          gap: "18px",
          gridTemplateColumns: "1.1fr 0.9fr",
        }}
      >
        <section
          style={{
            padding: "12px",
            borderRadius: "24px",
            background:
              "linear-gradient(135deg, rgba(15, 118, 110, 0.92), rgba(11, 79, 89, 0.96))",
            color: "white",
          }}
        >
          <div
            className="stack"
            style={{ height: "100%", alignContent: "space-between" }}
          >
            <span
              className="badge"
              style={{
                width: "fit-content",
                background: "rgba(255,255,255,0.14)",
                color: "white",
              }}
            >
              Inventory Access
            </span>
            <div className="stack">
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(2rem, 5vw, 3.5rem)",
                  lineHeight: 0.95,
                  maxWidth: "8ch",
                }}
              >
                재고 관리 화면에 접속하세요.
              </h1>
              <p style={{ color: "rgba(255,255,255,0.82)", maxWidth: "46ch" }}>
                데스크톱과 모바일에서 같은 계정 체계를 사용합니다. 이메일 계정 가입과 Google
                로그인을 모두 지원합니다.
              </p>
            </div>
            <div className="stack">
              <div>1. Email/Password 계정 생성 및 로그인</div>
              <div>2. Google 계정 로그인 지원</div>
              <div>3. 로그인 후 사용자 문서를 자동 동기화</div>
            </div>
          </div>
        </section>

        <section style={{ display: "grid", alignContent: "center" }}>
          <div className="stack">
            <div className="stack" style={{ gap: 10 }}>
              <div className="chip-row">
                <button
                  className={`chip${mode === "sign-in" ? " is-active" : ""}`}
                  onClick={() => {
                    setMode("sign-in");
                    setErrorMessage("");
                    reset();
                  }}
                  type="button"
                >
                  로그인
                </button>
                <button
                  className={`chip${mode === "sign-up" ? " is-active" : ""}`}
                  onClick={() => {
                    setMode("sign-up");
                    setErrorMessage("");
                    reset();
                  }}
                  type="button"
                >
                  회원가입
                </button>
              </div>
              <div className="page-heading" style={{ justifyContent: "flex-start" }}>
                <h1>{title}</h1>
              </div>
              <p className="subtle" style={{ marginTop: -8 }}>
                {description}
              </p>
            </div>

            <form
              className="stack"
              onSubmit={handleSubmit(async (values) => {
                setSubmitting(true);
                setErrorMessage("");

                try {
                  if (mode === "sign-up") {
                    if (values.password.length < 6) {
                      throw new Error("비밀번호는 6자 이상이어야 합니다.");
                    }

                    if (values.password !== values.confirmPassword) {
                      throw new Error("비밀번호 확인이 일치하지 않습니다.");
                    }

                    await signUpUser(values.email, values.password);
                  } else {
                    await signInUser(values.email, values.password);
                  }
                } catch (error) {
                  setErrorMessage(
                    error instanceof Error
                      ? error.message
                      : `${submitLabel} 처리에 실패했습니다.`,
                  );
                } finally {
                  setSubmitting(false);
                }
              })}
            >
              <div className="field-block">
                <label className="field-label">이메일</label>
                <input
                  className="field"
                  type="email"
                  {...register("email", { required: true })}
                />
              </div>
              <div className="field-block">
                <label className="field-label">비밀번호</label>
                <input
                  className="field"
                  type="password"
                  {...register("password", { required: true })}
                />
              </div>
              {mode === "sign-up" ? (
                <div className="field-block">
                  <label className="field-label">비밀번호 확인</label>
                  <input
                    className="field"
                    type="password"
                    {...register("confirmPassword", { required: true })}
                  />
                </div>
              ) : null}
              {errorMessage ? <div className="badge danger">{errorMessage}</div> : null}
              <button className="button primary" disabled={submitting} type="submit">
                {submitting ? `${submitLabel} 처리 중...` : submitLabel}
              </button>
              <button
                className="button secondary"
                disabled={submitting}
                onClick={async () => {
                  setSubmitting(true);
                  setErrorMessage("");

                  try {
                    await signInWithGoogleUser();
                  } catch (error) {
                    setErrorMessage(
                      error instanceof Error
                        ? error.message
                        : "Google 로그인에 실패했습니다.",
                    );
                  } finally {
                    setSubmitting(false);
                  }
                }}
                type="button"
              >
                Google로 계속하기
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
