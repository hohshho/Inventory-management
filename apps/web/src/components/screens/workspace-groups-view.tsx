"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useAuthSession } from "@/components/auth-session-provider";
import {
  apiGet,
  apiPost,
  type GroupJoinRequest,
  type GroupMember,
  type GroupMembership,
  type JoinGroupResult,
  type MembershipRole,
  type UserSession,
} from "@/lib/api";

declare global {
  interface Window {
    Kakao?: {
      init: (appKey: string) => void;
      isInitialized: () => boolean;
      Share: {
        sendDefault: (payload: unknown) => void;
      };
    };
  }
}

type GroupCreateForm = {
  name: string;
};

type InviteRequestForm = {
  inviteCode: string;
};

const membershipLabelMap: Record<MembershipRole, string> = {
  owner: "소유자",
  full: "전체 권한 허용",
  write: "쓰기만",
  read: "읽기만",
};

const membershipChoices: MembershipRole[] = ["owner", "full", "write", "read"];

function getMemberTone(role: MembershipRole) {
  if (role === "owner") return "ok";
  if (role === "full") return "";
  if (role === "write") return "warn";
  return "danger";
}

export function WorkspaceGroupsView() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { profile, refreshProfile } = useAuthSession();
  const [successText, setSuccessText] = useState("");
  const [errorText, setErrorText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<GroupMembership | null>(null);

  const createGroupForm = useForm<GroupCreateForm>({
    defaultValues: { name: "" },
  });
  const inviteJoinForm = useForm<InviteRequestForm>({
    defaultValues: { inviteCode: "" },
  });

  const membershipsQuery = useQuery({
    queryKey: ["workspace-memberships"],
    queryFn: () => apiGet<GroupMembership[]>("/groups/mine"),
  });

  const activeMembership =
    membershipsQuery.data?.find((membershipRow) => membershipRow.groupId === profile?.activeGroupId) ?? null;
  const canManageGroup = activeMembership?.role === "owner";
  const isMasterAccount = profile?.email?.toLowerCase() === "devhshoon@gmail.com";

  const membersQuery = useQuery({
    queryKey: ["workspace-members", profile?.activeGroupId],
    queryFn: () => apiGet<GroupMember[]>("/groups/members"),
    enabled: Boolean(profile?.activeGroupId),
  });

  const approvalQueueQuery = useQuery({
    queryKey: ["workspace-requests", profile?.activeGroupId],
    queryFn: () => apiGet<GroupJoinRequest[]>("/groups/join-requests"),
    enabled: Boolean(profile?.activeGroupId && canManageGroup),
  });

  const inviteCodeFromUrl = searchParams.get("inviteCode") ?? "";
  const kakaoJsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? "";
  const inviteShareUrl = useMemo(() => {
    if (!activeMembership?.inviteCode) {
      return "";
    }

    if (typeof window === "undefined") {
      return `/groups?inviteCode=${activeMembership.inviteCode}`;
    }

    return `${window.location.origin}/groups?inviteCode=${activeMembership.inviteCode}`;
  }, [activeMembership?.inviteCode]);

  useEffect(() => {
    if (!inviteCodeFromUrl) {
      return;
    }

    inviteJoinForm.setValue("inviteCode", inviteCodeFromUrl.toUpperCase());
  }, [inviteCodeFromUrl, inviteJoinForm]);

  const refreshWorkspaceQueries = async (message: string) => {
    setSuccessText(message);
    setErrorText("");
    await refreshProfile();
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["workspace-memberships"] }),
      queryClient.invalidateQueries({ queryKey: ["workspace-members"] }),
      queryClient.invalidateQueries({ queryKey: ["workspace-requests"] }),
    ]);
  };

  const createGroupAction = useMutation({
    mutationFn: (payload: GroupCreateForm) => apiPost<UserSession>("/groups", payload),
    onSuccess: async () => {
      createGroupForm.reset();
      await refreshWorkspaceQueries("새 그룹을 만들었습니다.");
    },
    onError: (error) => {
      setSuccessText("");
      setErrorText(error instanceof Error ? error.message : "그룹 생성에 실패했습니다.");
    },
  });

  const requestJoinAction = useMutation({
    mutationFn: (payload: InviteRequestForm) =>
      apiPost<JoinGroupResult>("/groups/join", { inviteCode: payload.inviteCode }),
    onSuccess: async (result) => {
      inviteJoinForm.reset();

      if (result.status === "already_member") {
        await refreshWorkspaceQueries("이미 가입된 그룹입니다. 활성 그룹으로 전환했습니다.");
        return;
      }

      setSuccessText("가입 요청을 보냈습니다. 소유자 승인 후 사용할 수 있습니다.");
      setErrorText("");
      await queryClient.invalidateQueries({ queryKey: ["workspace-memberships"] });
    },
    onError: (error) => {
      setSuccessText("");
      setErrorText(error instanceof Error ? error.message : "가입 요청에 실패했습니다.");
    },
  });

  const activateGroupAction = useMutation({
    mutationFn: (groupId: string) => apiPost<UserSession>("/groups/select", { groupId }),
    onSuccess: async () => {
      await refreshWorkspaceQueries("활성 그룹을 변경했습니다.");
    },
    onError: (error) => {
      setSuccessText("");
      setErrorText(error instanceof Error ? error.message : "그룹 선택에 실패했습니다.");
    },
  });

  const deleteGroupAction = useMutation({
    mutationFn: (groupId: string) => apiPost<UserSession>("/groups/delete", { groupId }),
    onSuccess: async () => {
      setDeleteTarget(null);
      await refreshWorkspaceQueries("그룹을 삭제했습니다.");
    },
    onError: (error) => {
      setDeleteTarget(null);
      setSuccessText("");
      setErrorText(error instanceof Error ? error.message : "그룹 삭제에 실패했습니다.");
    },
  });

  const refreshInviteCodeAction = useMutation({
    mutationFn: () => apiPost<UserSession>("/groups/invite-code/regenerate", {}),
    onSuccess: async () => {
      await refreshWorkspaceQueries("초대 코드를 새로 발급했습니다.");
    },
    onError: (error) => {
      setSuccessText("");
      setErrorText(error instanceof Error ? error.message : "초대 코드 재발급에 실패했습니다.");
    },
  });

  const changeRoleAction = useMutation({
    mutationFn: (payload: { targetUserId: string; role: MembershipRole }) =>
      apiPost<GroupMember[]>("/groups/members/role", payload),
    onSuccess: async () => {
      await refreshWorkspaceQueries("멤버 권한을 변경했습니다.");
    },
    onError: (error) => {
      setSuccessText("");
      setErrorText(error instanceof Error ? error.message : "멤버 권한 변경에 실패했습니다.");
    },
  });

  const approveRequestAction = useMutation({
    mutationFn: (requestId: string) =>
      apiPost<GroupJoinRequest[]>("/groups/join-requests/approve", {
        requestId,
        role: "read" as const,
      }),
    onSuccess: async () => {
      await refreshWorkspaceQueries("가입 요청을 승인했습니다.");
    },
    onError: (error) => {
      setSuccessText("");
      setErrorText(error instanceof Error ? error.message : "가입 요청 승인에 실패했습니다.");
    },
  });

  const rejectRequestAction = useMutation({
    mutationFn: (requestId: string) =>
      apiPost<GroupJoinRequest[]>("/groups/join-requests/reject", { requestId }),
    onSuccess: async () => {
      await refreshWorkspaceQueries("가입 요청을 거절했습니다.");
    },
    onError: (error) => {
      setSuccessText("");
      setErrorText(error instanceof Error ? error.message : "가입 요청 거절에 실패했습니다.");
    },
  });

  const copyInviteLink = async () => {
    if (!inviteShareUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteShareUrl);
      setSuccessText("초대 링크를 복사했습니다.");
      setErrorText("");
    } catch {
      setSuccessText("");
      setErrorText("초대 링크 복사에 실패했습니다.");
    }
  };

  const shareInviteWithKakao = async () => {
    try {
      if (!inviteShareUrl) {
        return;
      }

      const inviteOwnerName = profile?.name ?? "사용자";
      const shareTitle = "정리합니다 웹 서비스로 초대합니다!";
      const shareDescription = `${inviteOwnerName}님과 함께 정리해봐요!`;

      if (!kakaoJsKey || typeof window === "undefined" || !window.Kakao) {
        if (navigator.share) {
          await navigator.share({
            title: shareTitle,
            text: shareDescription,
            url: inviteShareUrl,
          });
          return;
        }

        await copyInviteLink();
        setSuccessText("카카오 공유를 사용할 수 없어 초대 링크를 복사했습니다.");
        return;
      }

      if (!window.Kakao.isInitialized()) {
        window.Kakao.init(kakaoJsKey);
      }

      window.Kakao.Share.sendDefault({
        objectType: "feed",
        content: {
          title: shareTitle,
          description: shareDescription,
          imageUrl: `${window.location.origin}/images/logo-light.png`,
          link: {
            mobileWebUrl: inviteShareUrl,
            webUrl: inviteShareUrl,
          },
        },
        buttons: [
          {
            title: "초대 링크 열기",
            link: {
              mobileWebUrl: inviteShareUrl,
              webUrl: inviteShareUrl,
            },
          },
        ],
      });
    } catch (error) {
      setSuccessText("");
      setErrorText(error instanceof Error ? error.message : "카카오톡 공유에 실패했습니다.");
    }
  };

  return (
    <div className="view-stack workbench-page">
      <section className="surface-card workspace-hero">
        <div className="workspace-hero-copy">
          <span className="section-pill">Workspace</span>
          <h2>그룹 관리</h2>
          <p>그룹 생성, 초대 코드 가입, 승인, 멤버 권한 관리를 한 화면에서 처리합니다.</p>
        </div>
        <div className="workspace-hero-meta">
          <div className="workspace-stat-card">
            <span>현재 그룹</span>
            <strong>{profile?.activeGroupName ?? "선택 없음"}</strong>
            <small>{profile?.activeGroupRole ? membershipLabelMap[profile.activeGroupRole] : "그룹을 선택하세요"}</small>
          </div>
          <div className="workspace-stat-card">
            <span>계정 구분</span>
            <strong>{isMasterAccount ? "master" : "member"}</strong>
            <small>{profile?.email ?? "-"}</small>
          </div>
        </div>
      </section>

      {successText ? <div className="badge ok">{successText}</div> : null}
      {errorText ? <div className="badge danger">{errorText}</div> : null}

      <section className="duo-grid workspace-setup-grid">
        <article className="surface-card workspace-panel">
          <div className="panel-heading">
            <h2>새 그룹 만들기</h2>
            <span className="badge">최대 5개</span>
          </div>
          <form
            className="view-stack"
            onSubmit={createGroupForm.handleSubmit(async (formValues) => {
              setSuccessText("");
              setErrorText("");
              await createGroupAction.mutateAsync(formValues);
            })}
          >
            <div className="input-cluster">
              <label className="input-label" htmlFor="group-name-input">
                그룹명
              </label>
              <input
                id="group-name-input"
                className="input-shell"
                placeholder="예: 순천향대학교 치과"
                {...createGroupForm.register("name", { required: true })}
              />
            </div>
            <button className="button primary" disabled={createGroupAction.isPending} type="submit">
              {createGroupAction.isPending ? "생성 중..." : "그룹 생성"}
            </button>
          </form>
        </article>

        <article className="surface-card workspace-panel">
          <div className="panel-heading">
            <h2>초대 코드로 가입 요청</h2>
            <span className="badge warn">승인 필요</span>
          </div>
          <form
            className="view-stack"
            onSubmit={inviteJoinForm.handleSubmit(async (formValues) => {
              setSuccessText("");
              setErrorText("");
              await requestJoinAction.mutateAsync(formValues);
            })}
          >
            <div className="input-cluster">
              <label className="input-label" htmlFor="invite-code-input">
                초대 코드
              </label>
              <input
                id="invite-code-input"
                className="input-shell"
                placeholder="예: DEMO2000"
                style={{ textTransform: "uppercase" }}
                {...inviteJoinForm.register("inviteCode", { required: true })}
              />
            </div>
            <button className="button secondary" disabled={requestJoinAction.isPending} type="submit">
              {requestJoinAction.isPending ? "요청 중..." : "가입 요청 보내기"}
            </button>
          </form>
        </article>
      </section>

      <section className="surface-card workspace-panel">
        <div className="workspace-section-head">
          <div>
            <h2>내 그룹</h2>
            <p>소속된 그룹을 보고 활성 그룹을 바꾸거나, 소유자면 삭제할 수 있습니다.</p>
          </div>
          <span className="badge">{membershipsQuery.data?.length ?? 0}개</span>
        </div>

        {membershipsQuery.isLoading ? <div className="loading-state">내 그룹 목록을 불러오는 중입니다.</div> : null}

        {!membershipsQuery.isLoading && (!membershipsQuery.data || membershipsQuery.data.length === 0) ? (
          <div className="empty-state">아직 소속된 그룹이 없습니다. 그룹을 만들거나 초대 코드로 가입 요청하세요.</div>
        ) : null}

        <div className="workspace-membership-grid">
          {membershipsQuery.data?.map((membershipRow) => {
            const isActive = membershipRow.groupId === profile?.activeGroupId;
            const canDelete = membershipRow.role === "owner";

            return (
              <article className={`workspace-membership-card${isActive ? " is-active" : ""}`} key={membershipRow.id}>
                <div className="workspace-card-head">
                  <div>
                    <h3>{membershipRow.groupName}</h3>
                    <p>{isActive ? "현재 사용 중인 그룹" : "전환 가능한 그룹"}</p>
                  </div>
                  <span className={`badge ${getMemberTone(membershipRow.role)}`}>
                    {membershipLabelMap[membershipRow.role]}
                  </span>
                </div>

                <div className="workspace-meta-grid">
                  <div className="workspace-meta-box">
                    <span>초대 코드</span>
                    <strong>{membershipRow.inviteCode ?? "소유자만 확인 가능"}</strong>
                  </div>
                  <div className="workspace-meta-box">
                    <span>상태</span>
                    <strong>{isActive ? "활성" : "비활성"}</strong>
                  </div>
                </div>

                <div className="workspace-inline-actions">
                  <button
                    className={isActive ? "button secondary" : "button primary"}
                    disabled={isActive || activateGroupAction.isPending}
                    onClick={() => {
                      setSuccessText("");
                      setErrorText("");
                      activateGroupAction.mutate(membershipRow.groupId);
                    }}
                    type="button"
                  >
                    {isActive ? "현재 선택됨" : "이 그룹 선택"}
                  </button>

                  {canDelete ? (
                    <button
                      className="button workspace-danger-button"
                      onClick={() => setDeleteTarget(membershipRow)}
                      type="button"
                    >
                      그룹 삭제
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {profile?.activeGroupId ? (
        <section className="surface-card workspace-panel">
          <div className="workspace-section-head">
            <div>
              <h2>초대 코드 관리</h2>
              <p>소유자는 초대 링크 복사와 초대 코드 재발급을 할 수 있습니다.</p>
            </div>
            <span className={`badge ${canManageGroup ? "ok" : "warn"}`}>{canManageGroup ? "owner" : "읽기 전용"}</span>
          </div>

          {canManageGroup ? (
            <div className="workspace-invite-grid">
              <div className="workspace-invite-card">
                <span className="section-pill">Invite Code</span>
                <strong>{activeMembership?.inviteCode ?? "-"}</strong>
                <p>코드를 재발급하면 기존 초대 코드는 더 이상 사용할 수 없습니다.</p>
              </div>
              <div className="workspace-inline-actions">
                <button className="button" disabled={!activeMembership?.inviteCode} onClick={() => void copyInviteLink()} type="button">
                  초대 링크 복사
                </button>
                <button
                  className="button"
                  disabled={!activeMembership?.inviteCode}
                  onClick={() => {
                    void shareInviteWithKakao();
                  }}
                  type="button"
                >
                  카카오톡으로 초대하기
                </button>
                <button
                  className="button secondary"
                  disabled={refreshInviteCodeAction.isPending}
                  onClick={() => {
                    setSuccessText("");
                    setErrorText("");
                    refreshInviteCodeAction.mutate();
                  }}
                  type="button"
                >
                  {refreshInviteCodeAction.isPending ? "재발급 중..." : "초대 코드 재발급"}
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-state">초대 코드 확인과 재발급은 소유자만 가능합니다.</div>
          )}
        </section>
      ) : null}

      {profile?.activeGroupId && canManageGroup ? (
        <section className="surface-card workspace-panel">
          <div className="workspace-section-head">
            <div>
              <h2>가입 요청</h2>
              <p>초대 코드로 들어온 사용자를 승인하거나 거절합니다.</p>
            </div>
            <span className="badge">{approvalQueueQuery.data?.length ?? 0}건</span>
          </div>

          {approvalQueueQuery.isLoading ? <div className="loading-state">가입 요청을 불러오는 중입니다.</div> : null}

          {!approvalQueueQuery.isLoading && (!approvalQueueQuery.data || approvalQueueQuery.data.length === 0) ? (
            <div className="empty-state">대기 중인 가입 요청이 없습니다.</div>
          ) : null}

          <div className="workspace-request-list">
            {approvalQueueQuery.data?.map((requestRow) => (
              <article className="workspace-request-card" key={requestRow.id}>
                <div>
                  <strong>{requestRow.name}</strong>
                  <div className="subtle">{requestRow.email || requestRow.userId}</div>
                </div>
                <div className="workspace-request-meta">
                  <span className="badge warn">승인 대기</span>
                  <span className="subtle">{requestRow.requestedAtLabel}</span>
                </div>
                <div className="workspace-inline-actions">
                  <button
                    className="button primary"
                    disabled={approveRequestAction.isPending || rejectRequestAction.isPending}
                    onClick={() => {
                      setSuccessText("");
                      setErrorText("");
                      approveRequestAction.mutate(requestRow.id);
                    }}
                    type="button"
                  >
                    승인
                  </button>
                  <button
                    className="button"
                    disabled={approveRequestAction.isPending || rejectRequestAction.isPending}
                    onClick={() => {
                      setSuccessText("");
                      setErrorText("");
                      rejectRequestAction.mutate(requestRow.id);
                    }}
                    type="button"
                  >
                    거절
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {profile?.activeGroupId ? (
        <section className="surface-card workspace-panel">
          <div className="workspace-section-head">
            <div>
              <h2>멤버 권한</h2>
              <p>소유자는 그룹 멤버의 권한을 소유자, 전체 권한, 쓰기만, 읽기만으로 조정할 수 있습니다.</p>
            </div>
            <span className="badge">{membersQuery.data?.length ?? 0}명</span>
          </div>

          {membersQuery.isLoading ? <div className="loading-state">멤버 목록을 불러오는 중입니다.</div> : null}

          {!membersQuery.isLoading && (!membersQuery.data || membersQuery.data.length === 0) ? (
            <div className="empty-state">현재 그룹에 등록된 멤버가 없습니다.</div>
          ) : null}

          <div className="workspace-member-grid">
            {membersQuery.data?.map((memberRow) => (
              <article className="workspace-member-card" key={memberRow.id}>
                <div className="workspace-card-head">
                  <div>
                    <h3>{memberRow.name}</h3>
                    <p>{memberRow.email || memberRow.userId}</p>
                  </div>
                  <span className={`badge ${getMemberTone(memberRow.role)}`}>{membershipLabelMap[memberRow.role]}</span>
                </div>

                <div className="workspace-meta-grid">
                  <div className="workspace-meta-box">
                    <span>멤버 상태</span>
                    <strong>{memberRow.isActive ? "활성" : "비활성"}</strong>
                  </div>
                  <div className="workspace-meta-box">
                    <span>내 계정 여부</span>
                    <strong>{memberRow.isCurrentUser ? "현재 로그인 계정" : "일반 멤버"}</strong>
                  </div>
                </div>

                {canManageGroup && !memberRow.isCurrentUser ? (
                  <div className="workspace-role-grid">
                    {membershipChoices.map((roleValue) => (
                      <button
                        key={roleValue}
                        className={roleValue === memberRow.role ? "button secondary" : "button"}
                        disabled={changeRoleAction.isPending || memberRow.role === roleValue}
                        onClick={() => {
                          setSuccessText("");
                          setErrorText("");
                          changeRoleAction.mutate({
                            targetUserId: memberRow.userId,
                            role: roleValue,
                          });
                        }}
                        type="button"
                      >
                        {membershipLabelMap[roleValue]}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="subtle">
                    {canManageGroup ? "본인 권한은 여기서 변경할 수 없습니다." : "권한 변경은 소유자만 가능합니다."}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {deleteTarget ? (
        <div className="workspace-modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div
            className="workspace-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="workspace-modal-head">
              <h3>그룹 삭제 확인</h3>
              <button className="utility-button" onClick={() => setDeleteTarget(null)} type="button">
                ×
              </button>
            </div>
            <p>
              <strong>{deleteTarget.groupName}</strong> 그룹을 삭제하면 현재 그룹과 멤버 연결이 모두 비활성화됩니다.
            </p>
            <p className="subtle">정말 삭제할지 한 번 더 확인하세요.</p>
            <div className="workspace-inline-actions">
              <button className="button" onClick={() => setDeleteTarget(null)} type="button">
                취소
              </button>
              <button
                className="button workspace-danger-button"
                disabled={deleteGroupAction.isPending}
                onClick={() => deleteGroupAction.mutate(deleteTarget.groupId)}
                type="button"
              >
                {deleteGroupAction.isPending ? "삭제 중..." : "삭제 진행"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
