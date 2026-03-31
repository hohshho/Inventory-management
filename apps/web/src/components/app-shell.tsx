"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuthSession } from "@/components/auth-session-provider";
import { useLedgerFeed } from "@/hooks/queries/use-ledger-feed";
import { useLowStockAlerts } from "@/hooks/queries/use-low-stock-alerts";
import { apiGet, type GroupJoinRequest } from "@/lib/api";
import { useStockBrowseState } from "@/stores/stock-browse-state";

type RailTone = "dark" | "gradient" | "light";
type PanelTone = "default" | "soft";
type HudMode = "solid" | "glass";
type CanvasWidth = "full" | "boxed";

type LayoutPrefs = {
  railTone: RailTone;
  compactRail: boolean;
  panelTone: PanelTone;
  hudMode: HudMode;
  canvasWidth: CanvasWidth;
};

type RailLink = {
  href: string;
  label: string;
  icon: "dashboard" | "inventory" | "item" | "location" | "scan" | "history" | "group";
  badge?: string;
};

type RailSection = {
  title: string;
  items: RailLink[];
};

type HudMenuKind = "profile" | null;
type NoticeItem = {
  id: string;
  title: string;
  body: string;
  time: string;
  tone: "danger" | "warn" | "ok";
};

const workspaceRailSections: RailSection[] = [
  {
    title: "MENU",
    items: [
      { href: "/", label: "대시보드", icon: "dashboard" },
      { href: "/inventory", label: "재고", icon: "inventory" },
      { href: "/items/new", label: "품목 추가", icon: "item" },
      { href: "/locations", label: "보관 위치", icon: "location" },
      { href: "/scan", label: "스캔", icon: "scan" },
      { href: "/history", label: "이력", icon: "history" },
      { href: "/groups", label: "그룹", icon: "group", badge: "Team" },
    ],
  },
];

const lockedRailSections: RailSection[] = [
  {
    title: "WORKSPACE",
    items: [{ href: "/groups", label: "그룹", icon: "group", badge: "Required" }],
  },
];

const mobileQuickdockHrefs = new Set(["/inventory", "/items/new", "/scan", "/history", "/groups"]);

const routeCopyMap: Record<string, { title: string; subtitle: string; breadcrumb: string }> = {
  "/": {
    title: "운영 대시보드",
    subtitle: "오늘 재고 상태와 최근 변경 흐름을 한 화면에서 확인합니다.",
    breadcrumb: "DASHBOARDS",
  },
  "/inventory": {
    title: "재고 리스트",
    subtitle: "필터, 상태, 최근 변경을 포함한 상품 재고 화면입니다.",
    breadcrumb: "INVENTORY",
  },
  "/items/new": {
    title: "품목 등록",
    subtitle: "새 품목과 바코드를 등록하고 초기 재고를 입력합니다.",
    breadcrumb: "ITEMS",
  },
  "/locations": {
    title: "보관 위치",
    subtitle: "냉장고, 선반, 창고 같은 위치 단위를 관리합니다.",
    breadcrumb: "LOCATIONS",
  },
  "/scan": {
    title: "바코드 스캔",
    subtitle: "입고와 출고를 빠르게 처리하는 스캔 작업 화면입니다.",
    breadcrumb: "SCAN",
  },
  "/history": {
    title: "변경 이력",
    subtitle: "누가 어떤 재고를 변경했는지 시간순으로 확인합니다.",
    breadcrumb: "HISTORY",
  },
  "/groups": {
    title: "그룹 관리",
    subtitle: "그룹 생성, 가입 요청, 승인, 권한을 한 곳에서 관리합니다.",
    breadcrumb: "GROUPS",
  },
  "/account": {
    title: "개인정보 수정",
    subtitle: "현재 사용자의 이름을 수정합니다.",
    breadcrumb: "ACCOUNT",
  },
};

const defaultLayoutPrefs: LayoutPrefs = {
  railTone: "gradient",
  compactRail: false,
  panelTone: "default",
  hudMode: "solid",
  canvasWidth: "full",
};

const noticeFeed = [
  {
    id: "notice-1",
    title: "부족 재고 확인 필요",
    body: "냉장 1구역 일부 품목이 부족 상태로 감지되었습니다.",
    time: "방금 전",
    tone: "danger",
  },
  {
    id: "notice-2",
    title: "가입 요청 대기",
    body: "새 멤버가 그룹 승인 대기 상태입니다.",
    time: "8분 전",
    tone: "warn",
  },
  {
    id: "notice-3",
    title: "발주 메모 저장 완료",
    body: "오늘 발주 메모가 정상적으로 저장되었습니다.",
    time: "20분 전",
    tone: "ok",
  },
] as const;

function formatTodayStamp() {
  return new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getInitialMark(name: string) {
  return name.trim().charAt(0).toUpperCase() || "U";
}

function RailIcon({ name }: { name: RailLink["icon"] }) {
  const iconBase = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "dashboard") {
    return (
      <svg {...iconBase}>
        <rect x="3" y="3" width="7" height="8" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="11" width="7" height="10" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </svg>
    );
  }

  if (name === "inventory") {
    return (
      <svg {...iconBase}>
        <path d="M4 7.5 12 4l8 3.5-8 3.5L4 7.5Z" />
        <path d="M4 12.5 12 16l8-3.5" />
        <path d="M4 17.5 12 21l8-3.5" />
      </svg>
    );
  }

  if (name === "item") {
    return (
      <svg {...iconBase}>
        <path d="M12 3v18" />
        <path d="M3 12h18" />
      </svg>
    );
  }

  if (name === "location") {
    return (
      <svg {...iconBase}>
        <path d="M12 21s6-4.35 6-10a6 6 0 1 0-12 0c0 5.65 6 10 6 10Z" />
        <circle cx="12" cy="11" r="2.4" />
      </svg>
    );
  }

  if (name === "scan") {
    return (
      <svg {...iconBase}>
        <path d="M5 7V5h4" />
        <path d="M19 7V5h-4" />
        <path d="M5 17v2h4" />
        <path d="M19 17v2h-4" />
        <path d="M7 12h10" />
      </svg>
    );
  }

  if (name === "history") {
    return (
      <svg {...iconBase}>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  return (
    <svg {...iconBase}>
      <path d="M8 7h8a4 4 0 0 1 4 4v6H4v-6a4 4 0 0 1 4-4Z" />
      <path d="M9 7a3 3 0 1 1 6 0" />
      <path d="M12 13h.01" />
    </svg>
  );
}

function UtilityIcon({ kind }: { kind: "bell" | "menu" | "settings" | "chevron" }) {
  const iconBase = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (kind === "menu") {
    return (
      <svg {...iconBase}>
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h16" />
      </svg>
    );
  }

  if (kind === "bell") {
    return (
      <svg {...iconBase}>
        <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
        <path d="M10 19a2 2 0 0 0 4 0" />
      </svg>
    );
  }

  if (kind === "settings") {
    return (
      <svg {...iconBase}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.2a1 1 0 0 0-.7-.9 1 1 0 0 0-1 .2l-.2.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.2a1 1 0 0 0 .9-.7 1 1 0 0 0-.2-1l-.1-.2a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2H9a1 1 0 0 0 .7-.9V4a2 2 0 1 1 4 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.2a1 1 0 0 0-.2 1 1 1 0 0 0 .9.7h.2a2 2 0 1 1 0 4H20a1 1 0 0 0-.6.6Z" />
      </svg>
    );
  }

  return (
    <svg {...iconBase}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function StyleRail({
  open,
  onClose,
  prefs,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  prefs: LayoutPrefs;
  onChange: (nextPrefs: LayoutPrefs) => void;
}) {
  return (
    <>
      <div className={`style-veil${open ? " is-open" : ""}`} onClick={onClose} />
      <aside className={`style-rail${open ? " is-open" : ""}`}>
        <div className="style-rail-head">
          <div>
            <h3>화면 설정</h3>
            <p>사이드바와 본문 테마를 빠르게 바꿉니다.</p>
          </div>
          <button className="utility-button" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="style-block">
          <span className="style-block-label">Rail Tone</span>
          <div className="style-choice-row">
            {(["gradient", "dark", "light"] as RailTone[]).map((value) => (
              <button
                key={value}
                className={`style-choice${prefs.railTone === value ? " is-active" : ""}`}
                onClick={() => onChange({ ...prefs, railTone: value })}
                type="button"
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="style-block">
          <span className="style-block-label">Rail Width</span>
          <div className="style-toggle-row">
            <span>Compact rail</span>
            <button
              className={`style-toggle${prefs.compactRail ? " is-on" : ""}`}
              onClick={() => onChange({ ...prefs, compactRail: !prefs.compactRail })}
              type="button"
            >
              <span />
            </button>
          </div>
        </div>

        <div className="style-block">
          <span className="style-block-label">Panel Tone</span>
          <div className="style-choice-row">
            {(["default", "soft"] as PanelTone[]).map((value) => (
              <button
                key={value}
                className={`style-choice${prefs.panelTone === value ? " is-active" : ""}`}
                onClick={() => onChange({ ...prefs, panelTone: value })}
                type="button"
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="style-block">
          <span className="style-block-label">Hud Mode</span>
          <div className="style-choice-row">
            {(["solid", "glass"] as HudMode[]).map((value) => (
              <button
                key={value}
                className={`style-choice${prefs.hudMode === value ? " is-active" : ""}`}
                onClick={() => onChange({ ...prefs, hudMode: value })}
                type="button"
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="style-block">
          <span className="style-block-label">Canvas Width</span>
          <div className="style-choice-row">
            {(["full", "boxed"] as CanvasWidth[]).map((value) => (
              <button
                key={value}
                className={`style-choice${prefs.canvasWidth === value ? " is-active" : ""}`}
                onClick={() => onChange({ ...prefs, canvasWidth: value })}
                type="button"
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}

function HudTray({ open, children }: { open: boolean; children: ReactNode }) {
  return <div className={`hud-tray${open ? " is-open" : ""}`}>{children}</div>;
}

function AlertRail({
  open,
  onClose,
  notices,
}: {
  open: boolean;
  onClose: () => void;
  notices: NoticeItem[];
}) {
  return (
    <>
      <div className={`alert-veil${open ? " is-open" : ""}`} onClick={onClose} />
      <aside className={`alert-rail${open ? " is-open" : ""}`}>
        <div className="alert-rail-head">
          <div>
            <h3>알림</h3>
            <p>최근 운영 이벤트와 승인 요청을 확인합니다.</p>
          </div>
          <button className="utility-button" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="alert-feed">
          {notices.length === 0 ? (
            <div className="loading-state">새 알림이 없습니다.</div>
          ) : null}
          {notices.map((notice) => (
            <article className="alert-card" key={notice.id}>
              <span className={`alert-dot ${notice.tone}`} />
              <div className="alert-copy">
                <strong>{notice.title}</strong>
                <p>{notice.body}</p>
                <small>{notice.time}</small>
              </div>
            </article>
          ))}
        </div>

        <Link className="button secondary" href="/history" onClick={onClose}>
          변경 이력으로 이동
        </Link>
      </aside>
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading, signOutUser } = useAuthSession();
  const setShelfKeyword = useStockBrowseState((state) => state.setKeyword);
  const setShelfZone = useStockBrowseState((state) => state.setZoneId);
  const [queryDraft, setQueryDraft] = useState("");
  const [styleRailOpen, setStyleRailOpen] = useState(false);
  const [mobileRailOpen, setMobileRailOpen] = useState(false);
  const [mobileQuickdockOpen, setMobileQuickdockOpen] = useState(true);
  const [alertRailOpen, setAlertRailOpen] = useState(false);
  const [openHudMenu, setOpenHudMenu] = useState<HudMenuKind>(null);
  const [layoutPrefs, setLayoutPrefs] = useState<LayoutPrefs>(defaultLayoutPrefs);
  const { data: lowStockAlerts } = useLowStockAlerts(Boolean(profile?.activeGroupId));
  const { data: recentHistoryRows } = useLedgerFeed(Boolean(profile?.activeGroupId));
  const { data: pendingJoinRequests } = useQuery({
    queryKey: ["workspace-requests-shell", profile?.activeGroupId],
    queryFn: () => apiGet<GroupJoinRequest[]>("/groups/join-requests"),
    enabled: Boolean(profile?.activeGroupId && profile?.activeGroupRole === "owner"),
  });

  const hasActiveGroup = Boolean(profile?.activeGroupId);
  const routeCopy =
    pathname.startsWith("/items/") && pathname !== "/items/new"
      ? {
          title: "품목 상세",
          subtitle: "품목별 재고 현황과 최근 변경 이력을 확인합니다.",
          breadcrumb: "ITEMS",
        }
      : routeCopyMap[pathname] ?? routeCopyMap["/groups"];
  const isLoginScreen = pathname === "/login";
  const isGroupsScreen = pathname === "/groups";
  const activeRailSections = hasActiveGroup ? workspaceRailSections : lockedRailSections;
  const mobileRailLinks =
    workspaceRailSections[0]?.items.filter((item) => mobileQuickdockHrefs.has(item.href)) ?? [];
  const workspaceLabel = profile?.activeGroupName ?? "그룹 선택 필요";
  const roleLabel = profile?.activeGroupRole ?? "guest";
  const avatarLabel = useMemo(
    () => profile?.name ?? user?.email ?? "User",
    [profile?.name, user?.email],
  );
  const noticeFeed = useMemo<NoticeItem[]>(() => {
    const lowStockNotices = (lowStockAlerts ?? []).slice(0, 2).map((alertRow) => ({
      id: `low-stock-${alertRow.inventoryId}`,
      title: `${alertRow.itemName} 재고 부족`,
      body: `${alertRow.locationName}에 ${alertRow.quantity}${alertRow.unit} 남아 있습니다.`,
      time: alertRow.status,
      tone: "danger" as const,
    }));

    const joinRequestNotices = (pendingJoinRequests ?? []).slice(0, 2).map((requestRow) => ({
      id: `join-request-${requestRow.id}`,
      title: `${requestRow.name} 가입 요청`,
      body: requestRow.email || requestRow.userId,
      time: requestRow.requestedAtLabel,
      tone: "warn" as const,
    }));

    const historyNotices = (recentHistoryRows ?? []).slice(0, 2).map((historyRow) => ({
      id: `history-${historyRow.id}`,
      title: `${historyRow.itemName} 변경`,
      body: `${historyRow.locationName} · ${historyRow.reason}`,
      time: historyRow.createdAtLabel,
      tone: "ok" as const,
    }));

    return [...lowStockNotices, ...joinRequestNotices, ...historyNotices].slice(0, 6);
  }, [lowStockAlerts, pendingJoinRequests, recentHistoryRows]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user && !isLoginScreen) {
      router.replace("/login");
      return;
    }

    if (user && isLoginScreen) {
      router.replace(hasActiveGroup ? "/" : "/groups");
      return;
    }

    if (user && !hasActiveGroup && !isGroupsScreen) {
      router.replace("/groups");
    }
  }, [hasActiveGroup, isGroupsScreen, isLoginScreen, loading, router, user]);

  useEffect(() => {
    const savedPrefs = window.localStorage.getItem("im-layout-prefs");
    if (!savedPrefs) {
      return;
    }

    try {
      const parsed = JSON.parse(savedPrefs) as Partial<LayoutPrefs>;
      setLayoutPrefs({
        railTone: parsed.railTone ?? defaultLayoutPrefs.railTone,
        compactRail: parsed.compactRail ?? defaultLayoutPrefs.compactRail,
        panelTone: parsed.panelTone ?? defaultLayoutPrefs.panelTone,
        hudMode: parsed.hudMode ?? defaultLayoutPrefs.hudMode,
        canvasWidth: parsed.canvasWidth ?? defaultLayoutPrefs.canvasWidth,
      });
    } catch {
      window.localStorage.removeItem("im-layout-prefs");
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.railTone = layoutPrefs.railTone;
    document.documentElement.dataset.railSize = layoutPrefs.compactRail ? "compact" : "default";
    document.documentElement.dataset.panelTone = layoutPrefs.panelTone;
    document.documentElement.dataset.hudMode = layoutPrefs.hudMode;
    document.documentElement.dataset.canvasWidth = layoutPrefs.canvasWidth;
    window.localStorage.setItem("im-layout-prefs", JSON.stringify(layoutPrefs));
  }, [layoutPrefs]);

  useEffect(() => {
    setMobileRailOpen(false);
    setOpenHudMenu(null);
    setAlertRailOpen(false);
  }, [pathname]);

  if (isLoginScreen) {
    return <>{children}</>;
  }

  if (loading || !user) {
    return <div className="loading-state">접속 상태를 확인하는 중입니다.</div>;
  }

  return (
    <div className={`shell${mobileRailOpen ? " is-mobile-sidebar-open" : ""}`}>
      <aside className="workspace-rail">
        <div className="rail-brandbar">
          <Link href="/" className="brand-anchor">
            <span className="brand-mark brand-mark-text">정</span>
            <span className="brand-title">정리합시다</span>
          </Link>
          <button
            className="rail-compact-toggle"
            onClick={() =>
              setLayoutPrefs((prev) => ({
                ...prev,
                compactRail: !prev.compactRail,
              }))
            }
            type="button"
          >
            <span />
          </button>
        </div>

        <div className="rail-userbox">
          <span className="identity-chip rail-user-avatar">{getInitialMark(avatarLabel)}</span>
          <div className="rail-user-copy">
            <strong>{avatarLabel}</strong>
            <span>{workspaceLabel}</span>
          </div>
        </div>

        <div className="rail-scroll">
          {activeRailSections.map((section) => (
            <div className="rail-section" key={section.title}>
              <div className="rail-section-title">{section.title}</div>
              <nav className="rail-links">
                {section.items.map((item) => {
                  const isCurrent =
                    pathname === item.href ||
                    (item.href === "/items/new" && pathname.startsWith("/items/"));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rail-link${isCurrent ? " is-current" : ""}`}
                    >
                      <span className="rail-link-icon">
                        <RailIcon name={item.icon} />
                      </span>
                      <span className="rail-link-text">{item.label}</span>
                      {item.badge ? <span className="rail-link-badge">{item.badge}</span> : null}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        <div className="rail-footbox">
          <div className="rail-foot-copy">
            <strong>{roleLabel}</strong>
            <span>{user.email ?? ""}</span>
          </div>
          <button
            className="button rail-exit-button"
            onClick={() => {
              void signOutUser();
            }}
            type="button"
          >
            로그아웃
          </button>
        </div>
      </aside>

      <div className="shell-main">
        <header className="control-hud">
          <div className="hud-inner">
            <div className="hud-start">
              <button
                className="utility-button mobile-menu-button"
                onClick={() => setMobileRailOpen((prev) => !prev)}
                type="button"
              >
                <UtilityIcon kind="menu" />
              </button>

              <form
                className="search-dock"
                onSubmit={(event) => {
                  event.preventDefault();
                  setShelfKeyword(queryDraft.trim());
                  setShelfZone("all");
                  router.push("/inventory");
                }}
              >
                <span className="search-dock-icon">⌕</span>
                <input
                  placeholder="Search..."
                  value={queryDraft}
                  onChange={(event) => setQueryDraft(event.target.value)}
                />
              </form>
            </div>

            <div className="hud-end">
              <button
                className="utility-button has-badge"
                onClick={() => setAlertRailOpen(true)}
                type="button"
              >
                <UtilityIcon kind="bell" />
                <span className="utility-badge danger">{noticeFeed.length}</span>
              </button>

              <div className="hud-anchor">
                <button
                  className="profile-trigger"
                  onClick={() => setOpenHudMenu((prev) => (prev === "profile" ? null : "profile"))}
                  type="button"
                >
                  <div className="hud-profile">
                    <span className="identity-chip hud-profile-avatar">{getInitialMark(avatarLabel)}</span>
                    <div className="hud-profile-copy">
                      <strong>{avatarLabel}</strong>
                      <span>{roleLabel}</span>
                    </div>
                  </div>
                  <UtilityIcon kind="chevron" />
                </button>

                <HudTray open={openHudMenu === "profile"}>
                  <div className="hud-tray-head">
                    <strong>사용자 메뉴</strong>
                  </div>
                  <div className="hud-tray-list">
                    <Link className="hud-tray-item" href="/account" onClick={() => setOpenHudMenu(null)}>
                      <span>개인정보 수정</span>
                      <small>이름 변경</small>
                    </Link>
                    <Link className="hud-tray-item" href="/groups" onClick={() => setOpenHudMenu(null)}>
                      <span>그룹 관리</span>
                      <small>{workspaceLabel}</small>
                    </Link>
                    <Link className="hud-tray-item" href="/login" onClick={() => setOpenHudMenu(null)}>
                      <span>로그인 화면</span>
                      <small>계정 전환</small>
                    </Link>
                    <button
                      className="hud-tray-item"
                      onClick={() => {
                        setOpenHudMenu(null);
                        void signOutUser();
                      }}
                      type="button"
                    >
                      <span>로그아웃</span>
                      <small>{user.email ?? ""}</small>
                    </button>
                  </div>
                </HudTray>
              </div>
            </div>
          </div>
        </header>

        <main className="canvas-wrap">
          <div className="canvas-titlebar">
            <div>
              <ol className="canvas-breadcrumbs">
                <li>INVENTORY MANAGEMENT</li>
                <li>{routeCopy.breadcrumb}</li>
              </ol>
              <h4>{routeCopy.title}</h4>
              <p>
                {hasActiveGroup
                  ? routeCopy.subtitle
                  : "먼저 그룹을 선택해야 다른 화면을 사용할 수 있습니다."}
              </p>
            </div>
            <div className="canvas-actions">
              <span className="canvas-date-pill">{formatTodayStamp()}</span>
              {profile?.activeGroupName ? (
                <span className="button secondary">{profile.activeGroupName}</span>
              ) : (
                <Link className="button primary" href="/groups">
                  그룹 선택
                </Link>
              )}
            </div>
          </div>

          <div className="canvas-body">{children}</div>
        </main>
      </div>

      <button className="style-fab" onClick={() => setStyleRailOpen(true)} type="button">
        <UtilityIcon kind="settings" />
      </button>

      <StyleRail
        open={styleRailOpen}
        onClose={() => setStyleRailOpen(false)}
        prefs={layoutPrefs}
        onChange={setLayoutPrefs}
      />

      <AlertRail open={alertRailOpen} onClose={() => setAlertRailOpen(false)} notices={noticeFeed} />

      <div className="ghost-shade" onClick={() => setMobileRailOpen(false)} />

      <button
        className={`quickdock-toggle-fab${mobileQuickdockOpen ? " is-open" : ""}`}
        onClick={() => setMobileQuickdockOpen((prev) => !prev)}
        type="button"
      >
        {mobileQuickdockOpen ? "메뉴 숨김" : "메뉴 열기"}
      </button>

      <nav className={`quickdock${mobileQuickdockOpen ? "" : " is-hidden"}`}>
        {mobileRailLinks.map((item) => {
          const isCurrent =
            pathname === item.href ||
            (item.href === "/items/new" && pathname.startsWith("/items/"));

          return (
            <Link key={item.href} href={item.href} className={`quickdock-link${isCurrent ? " is-current" : ""}`}>
              <span className="quickdock-icon">
                <RailIcon name={item.icon} />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
