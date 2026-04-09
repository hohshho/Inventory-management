"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useAuthSession } from "@/components/auth-session-provider";
import { useAutoClearingText } from "@/hooks/use-auto-clearing-text";
import { useToastFeedback } from "@/hooks/use-toast-feedback";

type AccessMode = "sign-in" | "sign-up";

type AccessForm = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type LoginAttemptState = {
  count: number;
  locked: boolean;
};

const LOGIN_ATTEMPT_STORAGE_KEY = "im-login-attempts";
const LOGIN_ATTEMPT_LIMIT = 5;
const PASSWORD_RULE_TEXT = "8자 이상, 영문 대문자/소문자, 숫자, 특수문자를 모두 포함해야 합니다.";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isPasswordStrong(password: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password);
}

function readAttemptMap() {
  if (typeof window === "undefined") {
    return {} as Record<string, LoginAttemptState>;
  }

  try {
    const savedValue = window.localStorage.getItem(LOGIN_ATTEMPT_STORAGE_KEY);
    return savedValue ? (JSON.parse(savedValue) as Record<string, LoginAttemptState>) : {};
  } catch {
    return {};
  }
}

function writeAttemptMap(nextValue: Record<string, LoginAttemptState>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOGIN_ATTEMPT_STORAGE_KEY, JSON.stringify(nextValue));
}

function getAttemptState(email: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return { count: 0, locked: false };
  }

  return readAttemptMap()[normalizedEmail] ?? { count: 0, locked: false };
}

function setAttemptState(email: string, nextState: LoginAttemptState) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return;
  }

  const nextMap = readAttemptMap();
  nextMap[normalizedEmail] = nextState;
  writeAttemptMap(nextMap);
}

function clearAttemptState(email: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return;
  }

  const nextMap = readAttemptMap();
  delete nextMap[normalizedEmail];
  writeAttemptMap(nextMap);
}

export function AccessGateView() {
  const router = useRouter();
  const [activeMode, setActiveMode] = useState<AccessMode>("sign-in");
  const [formErrorText, setFormErrorText] = useState("");
  const [formSuccessText, setFormSuccessText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginAttemptState, setLoginAttemptState] = useState<LoginAttemptState>({ count: 0, locked: false });
  const [showVerificationAction, setShowVerificationAction] = useState(false);
  const { register, handleSubmit, reset, watch } = useForm<AccessForm>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  const {
    signInUser,
    signUpUser,
    resendVerificationForCredentials,
    requestPasswordReset,
    signInWithGoogleUser,
    user,
    loading,
  } = useAuthSession();

  const emailValue = watch("email") ?? "";
  const passwordValue = watch("password") ?? "";
  const isSecureConnection = true;

  useAutoClearingText(formErrorText, setFormErrorText);
  useAutoClearingText(formSuccessText, setFormSuccessText);
  useAutoClearingText(showVerificationAction ? "show" : "", () => setShowVerificationAction(false));
  useToastFeedback(formSuccessText, formErrorText);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [loading, router, user]);

  useEffect(() => {
    setLoginAttemptState(getAttemptState(emailValue));
  }, [emailValue]);

  const submitText = activeMode === "sign-in" ? "로그인" : "회원가입";
  const titleText = activeMode === "sign-in" ? "작업 계정 로그인" : "작업 계정 만들기";
  const descriptionText =
    activeMode === "sign-in"
      ? "이메일 인증이 완료된 계정으로 로그인하거나 Google 계정을 사용할 수 있습니다."
      : "이름과 이메일을 등록한 뒤 인증 메일을 확인하면 바로 작업을 시작할 수 있습니다.";

  return (
    <div className="access-shell">
      <div className="access-card">
        <section aria-hidden="true" className="access-visual">
          <h1>정리합시다 입니다.</h1>
          <div className={`badge ${isSecureConnection ? "ok" : "warn"}`}>
            {isSecureConnection ? "보안 연결 확인됨" : "현재 연결은 HTTPS가 아닙니다."}
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
                  setFormSuccessText("");
                  setShowVerificationAction(false);
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
                  setFormSuccessText("");
                  setShowVerificationAction(false);
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
              setFormSuccessText("");

              try {
                const normalizedEmail = normalizeEmail(formValues.email);

                if (!normalizedEmail) {
                  throw new Error("이메일을 입력해 주세요.");
                }

                if (activeMode === "sign-up") {
                  if (!formValues.name.trim()) {
                    throw new Error("이름은 필수입니다.");
                  }

                  if (!isPasswordStrong(formValues.password)) {
                    throw new Error(PASSWORD_RULE_TEXT);
                  }

                  if (formValues.password !== formValues.confirmPassword) {
                    throw new Error("비밀번호 확인 값이 일치하지 않습니다.");
                  }

                  await signUpUser(formValues.name.trim(), normalizedEmail, formValues.password);
                  clearAttemptState(normalizedEmail);
                  setLoginAttemptState({ count: 0, locked: false });
                  setShowVerificationAction(false);
                  setFormSuccessText("인증 메일을 보냈습니다. 메일 확인 후 로그인해 주세요.");
                } else {
                  if (loginAttemptState.locked) {
                    setShowVerificationAction(true);
                    throw new Error("로그인 시도가 5회 누적되어 잠겼습니다. 인증 메일 재발송 또는 비밀번호 재설정을 먼저 진행해 주세요.");
                  }

                  await signInUser(normalizedEmail, formValues.password);
                  clearAttemptState(normalizedEmail);
                  setLoginAttemptState({ count: 0, locked: false });
                  setShowVerificationAction(false);
                }
              } catch (error) {
                const message = error instanceof Error ? error.message : `${submitText} 처리에 실패했습니다.`;

                if (
                  activeMode === "sign-in" &&
                  !loginAttemptState.locked &&
                  message.includes("이메일 또는 비밀번호가 올바르지 않습니다.")
                ) {
                  const nextCount = loginAttemptState.count + 1;
                  const nextState = {
                    count: nextCount,
                    locked: nextCount >= LOGIN_ATTEMPT_LIMIT,
                  };
                  setAttemptState(formValues.email, nextState);
                  setLoginAttemptState(nextState);
                  setShowVerificationAction(nextState.locked);
                  setFormErrorText(
                    nextState.locked
                      ? "로그인 시도가 5회 누적되어 잠겼습니다. 인증 메일 재발송 또는 비밀번호 재설정을 진행해 주세요."
                      : `이메일 또는 비밀번호가 올바르지 않습니다. 남은 시도 ${Math.max(0, LOGIN_ATTEMPT_LIMIT - nextCount)}회`,
                  );
                } else {
                  if (message.includes("인증 메일") || message.includes("verify")) {
                    setShowVerificationAction(true);
                  }
                  setFormErrorText(message);
                }
              } finally {
                setIsSubmitting(false);
              }
            })}
          >
            {activeMode === "sign-up" ? (
              <div className="input-cluster">
                <label className="input-label" htmlFor="access-name-input">
                  이름
                </label>
                <input id="access-name-input" className="input-shell" type="text" {...register("name")} />
              </div>
            ) : null}

            <div className="input-cluster">
              <label className="input-label" htmlFor="access-email-input">
                이메일
              </label>
              <input id="access-email-input" className="input-shell" type="email" {...register("email", { required: true })} />
            </div>

            <div className="input-cluster">
              <label className="input-label" htmlFor="access-password-input">
                비밀번호
              </label>
              <input
                id="access-password-input"
                className="input-shell"
                type="password"
                autoComplete={activeMode === "sign-up" ? "new-password" : "current-password"}
                {...register("password", { required: true })}
              />
              {activeMode === "sign-up" ? <div className="subtle">{PASSWORD_RULE_TEXT}</div> : null}
            </div>

            {activeMode === "sign-up" ? (
              <div className="input-cluster">
                <label className="input-label" htmlFor="access-confirm-password-input">
                  비밀번호 확인
                </label>
                <input
                  id="access-confirm-password-input"
                  className="input-shell"
                  type="password"
                  autoComplete="new-password"
                  {...register("confirmPassword", { required: true })}
                />
              </div>
            ) : null}

            <button className="button primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? `${submitText} 처리 중...` : submitText}
            </button>

            <div className="workspace-inline-actions">
              <button
                className="button secondary"
                disabled={isSubmitting}
                onClick={async () => {
                  setIsSubmitting(true);
                  setFormErrorText("");
                  setFormSuccessText("");

                  try {
                    await signInWithGoogleUser();
                  } catch (error) {
                    setFormErrorText(error instanceof Error ? error.message : "Google 로그인에 실패했습니다.");
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                type="button"
              >
                Google로 계속하기
              </button>

              <button
                className="button"
                disabled={isSubmitting || !normalizeEmail(emailValue)}
                onClick={async () => {
                  setIsSubmitting(true);
                  setFormErrorText("");
                  setFormSuccessText("");

                  try {
                    await requestPasswordReset(normalizeEmail(emailValue));
                    clearAttemptState(emailValue);
                    setLoginAttemptState({ count: 0, locked: false });
                    setFormSuccessText("비밀번호 재설정 메일을 보냈습니다.");
                  } catch (error) {
                    setFormErrorText(error instanceof Error ? error.message : "비밀번호 재설정 메일 발송에 실패했습니다.");
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                type="button"
              >
                비밀번호 찾기
              </button>

              {showVerificationAction ? (
                <button
                  className="button"
                  disabled={isSubmitting || !normalizeEmail(emailValue) || !passwordValue}
                  onClick={async () => {
                    setIsSubmitting(true);
                    setFormErrorText("");
                    setFormSuccessText("");

                    try {
                      await resendVerificationForCredentials(normalizeEmail(emailValue), passwordValue);
                      clearAttemptState(emailValue);
                      setLoginAttemptState({ count: 0, locked: false });
                      setShowVerificationAction(false);
                      setFormSuccessText("인증 메일을 다시 보냈습니다. 메일 확인 후 로그인해 주세요.");
                    } catch (error) {
                      setFormErrorText(error instanceof Error ? error.message : "인증 메일 재발송에 실패했습니다.");
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  type="button"
                >
                  인증 메일 다시 보내기
                </button>
              ) : null}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
