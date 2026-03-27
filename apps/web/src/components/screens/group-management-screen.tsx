"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuthSession } from "@/components/auth-session-provider";
import { apiGet, apiPost, type GroupMembership, type UserSession } from "@/lib/api";

type CreateGroupValues = {
  name: string;
};

type JoinGroupValues = {
  inviteCode: string;
};

export function GroupManagementScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile, refreshProfile } = useAuthSession();
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const createForm = useForm<CreateGroupValues>({
    defaultValues: {
      name: "",
    },
  });
  const joinForm = useForm<JoinGroupValues>({
    defaultValues: {
      inviteCode: "",
    },
  });

  const membershipsQuery = useQuery({
    queryKey: ["groups", "mine"],
    queryFn: () => apiGet<GroupMembership[]>("/groups/mine"),
  });

  const handleSuccess = async (nextSession: UserSession, nextMessage: string) => {
    setMessage(nextMessage);
    setErrorMessage("");
    await refreshProfile();
    await queryClient.invalidateQueries({ queryKey: ["groups", "mine"] });

    if (nextSession.activeGroupId) {
      router.replace("/");
    }
  };

  const createGroupMutation = useMutation({
    mutationFn: (values: CreateGroupValues) =>
      apiPost<UserSession>("/groups", { name: values.name }),
    onSuccess: async (session) => {
      createForm.reset();
      await handleSuccess(session, "그룹이 생성되었습니다.");
    },
    onError: (error) => {
      setMessage("");
      setErrorMessage(error instanceof Error ? error.message : "그룹 생성에 실패했습니다.");
    },
  });

  const joinGroupMutation = useMutation({
    mutationFn: (values: JoinGroupValues) =>
      apiPost<UserSession>("/groups/join", { inviteCode: values.inviteCode }),
    onSuccess: async (session) => {
      joinForm.reset();
      await handleSuccess(session, "그룹에 가입되었습니다.");
    },
    onError: (error) => {
      setMessage("");
      setErrorMessage(error instanceof Error ? error.message : "그룹 가입에 실패했습니다.");
    },
  });

  const selectGroupMutation = useMutation({
    mutationFn: (groupId: string) => apiPost<UserSession>("/groups/select", { groupId }),
    onSuccess: async (session) => {
      await handleSuccess(session, "활성 그룹이 변경되었습니다.");
    },
    onError: (error) => {
      setMessage("");
      setErrorMessage(error instanceof Error ? error.message : "그룹 전환에 실패했습니다.");
    },
  });

  return (
    <div className="page-stack">
      <section className="card">
        <div className="card-title">
          <h2>공유 그룹 설정</h2>
          {profile?.activeGroupName ? (
            <span className="badge ok">현재 그룹: {profile.activeGroupName}</span>
          ) : (
            <span className="badge warn">활성 그룹 없음</span>
          )}
        </div>
        <p className="subtle">
          여러 사용자가 같은 재고를 보려면 먼저 같은 그룹에 속해야 합니다. 그룹 생성 후
          초대 코드를 공유하거나, 이미 받은 코드로 바로 가입하세요.
        </p>
        <div className="chip-row" style={{ marginTop: 12 }}>
          <span className="badge">시드 초대 코드: DEMO2000</span>
        </div>
        {message ? <div className="badge ok">{message}</div> : null}
        {errorMessage ? <div className="badge danger">{errorMessage}</div> : null}
      </section>

      <div className="content-grid">
        <section className="card">
          <div className="card-title">
            <h2>새 그룹 만들기</h2>
          </div>
          <form
            className="stack"
            onSubmit={createForm.handleSubmit(async (values) => {
              setMessage("");
              setErrorMessage("");
              await createGroupMutation.mutateAsync(values);
            })}
          >
            <div className="field-block">
              <label className="field-label">그룹명</label>
              <input
                className="field"
                placeholder="예: 성수점 주방팀"
                {...createForm.register("name", { required: true })}
              />
            </div>
            <button
              className="button primary"
              disabled={createGroupMutation.isPending}
              type="submit"
            >
              {createGroupMutation.isPending ? "생성 중..." : "그룹 생성"}
            </button>
          </form>
        </section>

        <section className="card">
          <div className="card-title">
            <h2>초대 코드로 가입</h2>
          </div>
          <form
            className="stack"
            onSubmit={joinForm.handleSubmit(async (values) => {
              setMessage("");
              setErrorMessage("");
              await joinGroupMutation.mutateAsync(values);
            })}
          >
            <div className="field-block">
              <label className="field-label">초대 코드</label>
              <input
                className="field"
                placeholder="예: DEMO2000"
                style={{ textTransform: "uppercase" }}
                {...joinForm.register("inviteCode", { required: true })}
              />
            </div>
            <button
              className="button secondary"
              disabled={joinGroupMutation.isPending}
              type="submit"
            >
              {joinGroupMutation.isPending ? "가입 중..." : "그룹 가입"}
            </button>
          </form>
        </section>
      </div>

      <section className="card">
        <div className="card-title">
          <h2>내 그룹</h2>
          <span className="badge">{membershipsQuery.data?.length ?? 0}개</span>
        </div>

        {membershipsQuery.isLoading ? (
          <div className="loading-state">그룹 목록을 불러오는 중입니다.</div>
        ) : null}

        {!membershipsQuery.isLoading && (!membershipsQuery.data || membershipsQuery.data.length === 0) ? (
          <div className="empty-state">
            아직 가입한 그룹이 없습니다. 위에서 새 그룹을 만들거나 초대 코드로 가입하세요.
          </div>
        ) : null}

        <div className="inventory-cards">
          {membershipsQuery.data?.map((membership) => {
            const isActive = membership.groupId === profile?.activeGroupId;

            return (
              <article className="card" key={membership.id}>
                <div className="card-title">
                  <h3>{membership.groupName}</h3>
                  <span className={`badge ${isActive ? "ok" : "warn"}`}>
                    {isActive ? "활성 그룹" : membership.role}
                  </span>
                </div>
                <div className="stack">
                  <div className="subtle">초대 코드 {membership.inviteCode}</div>
                  <div className="subtle">권한 {membership.role}</div>
                  <button
                    className="button"
                    disabled={isActive || selectGroupMutation.isPending}
                    onClick={() => {
                      setMessage("");
                      setErrorMessage("");
                      selectGroupMutation.mutate(membership.groupId);
                    }}
                    type="button"
                  >
                    {isActive ? "사용 중" : "이 그룹으로 전환"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
