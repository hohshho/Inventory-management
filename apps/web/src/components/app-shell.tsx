"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthSession } from "@/components/auth-session-provider";

const navItems = [
  { href: "/", label: "대시보드", icon: "DB" },
  { href: "/inventory", label: "재고", icon: "ST" },
  { href: "/items/new", label: "등록", icon: "IN" },
  { href: "/locations", label: "위치", icon: "LC" },
  { href: "/scan", label: "스캔", icon: "SC" },
  { href: "/history", label: "이력", icon: "HS" },
  { href: "/groups", label: "그룹", icon: "GR" },
];

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "현장 재고 운영 보드",
    subtitle: "모바일과 PC에서 같은 데이터로 재고를 관리합니다.",
  },
  "/inventory": {
    title: "재고 현황",
    subtitle: "위치와 바코드 기준으로 품목을 빠르게 찾고 수량을 확인합니다.",
  },
  "/items/new": {
    title: "품목 등록",
    subtitle: "신규 품목과 초기 재고를 한 번에 등록합니다.",
  },
  "/locations": {
    title: "위치 관리",
    subtitle: "냉장고, 선반, 창고 구역을 관리합니다.",
  },
  "/scan": {
    title: "바코드 스캔",
    subtitle: "조회와 신규 등록 진입을 스캔 흐름으로 연결합니다.",
  },
  "/history": {
    title: "변경 이력",
    subtitle: "입고, 차감, 수동 조정 이력을 시간순으로 확인합니다.",
  },
  "/groups": {
    title: "그룹 관리",
    subtitle: "공유할 작업 그룹을 만들고 가입 코드를 관리합니다.",
  },
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading, signOutUser } = useAuthSession();
  const current =
    pathname.startsWith("/items/") && pathname !== "/items/new"
      ? {
          title: "품목 상세",
          subtitle: "품목별 위치 재고와 최근 조정 이력을 확인합니다.",
        }
      : pageTitles[pathname] ?? pageTitles["/"];
  const isLoginPage = pathname === "/login";
  const isGroupPage = pathname === "/groups";

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user && !isLoginPage) {
      router.replace("/login");
      return;
    }

    if (user && isLoginPage) {
      router.replace(profile?.activeGroupId ? "/" : "/groups");
      return;
    }

    if (user && !profile?.activeGroupId && !isGroupPage) {
      router.replace("/groups");
    }
  }, [isGroupPage, isLoginPage, loading, profile?.activeGroupId, router, user]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading || !user) {
    return <div className="loading-state">접속 상태를 확인하는 중입니다.</div>;
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-badge">IM</div>
          <div className="brand-title">Inventory Control</div>
          <div className="brand-meta">
            {profile?.activeGroupName ? `group: ${profile.activeGroupName}` : "group setup needed"}
          </div>
        </div>
        <nav className="nav">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === "/items/new" && pathname.startsWith("/items/"));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link${isActive ? " is-active" : ""}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <div className="topbar-card">
            <div>
              <div className="topbar-title">{current.title}</div>
              <div className="topbar-subtitle">{current.subtitle}</div>
            </div>
            <div className="topbar-actions">
              {profile?.activeGroupName ? (
                <span className="badge">{profile.activeGroupName}</span>
              ) : (
                <span className="badge warn">그룹 미선택</span>
              )}
              <span className="badge">{user.email ?? "로그인 사용자"}</span>
              <Link className="button secondary" href="/groups">
                그룹
              </Link>
              <Link className="button secondary" href="/scan">
                빠른 스캔
              </Link>
              <Link className="button primary" href="/items/new">
                품목 추가
              </Link>
              <button
                className="button"
                onClick={() => {
                  void signOutUser();
                }}
                type="button"
              >
                로그아웃
              </button>
            </div>
          </div>
        </header>

        <main className="page-wrap">{children}</main>
      </div>

      <nav className="mobile-nav">
        {navItems.slice(0, 5).map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === "/items/new" && pathname.startsWith("/items/"));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-link${isActive ? " is-active" : ""}`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
