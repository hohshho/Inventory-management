"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuthSession } from "@/components/auth-session-provider";
import { HelpHint } from "@/components/help-hint";
import { useUiLanguage, type UiLanguage } from "@/components/ui-language-provider";
import { useLedgerFeed } from "@/hooks/queries/use-ledger-feed";
import { useLowStockAlerts } from "@/hooks/queries/use-low-stock-alerts";
import { apiGet, type GroupJoinRequest, type ItemRecord } from "@/lib/api";
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

type UiCopy = {
  title: string;
  subtitle: string;
  breadcrumb: string;
};

const mobileQuickdockVisibleHrefs = new Set(["/inventory", "/items/new", "/history", "/groups"]);

const localizedRouteCopyMap: Record<string, Record<UiLanguage, UiCopy>> = {
  "/": {
    ko: {
      title: "운영 대시보드",
      subtitle: "오늘 확인할 항목과 최근 변경 흐름을 한 화면에서 확인합니다.",
      breadcrumb: "대시보드",
    },
    en: {
      title: "Operations Dashboard",
      subtitle: "Review today's checks and recent inventory changes in one place.",
      breadcrumb: "Dashboard",
    },
  },
  "/inventory": {
    ko: {
      title: "재고 리스트",
      subtitle: "품목 검색, 상태 필터, 최근 변경 정보를 함께 확인합니다.",
      breadcrumb: "재고",
    },
    en: {
      title: "Inventory List",
      subtitle: "Search items, filter stock status, and review recent changes.",
      breadcrumb: "Inventory",
    },
  },
  "/items/new": {
    ko: {
      title: "품목 등록",
      subtitle: "새 품목과 초기 수량을 입력해 바로 재고에 반영합니다.",
      breadcrumb: "품목 등록",
    },
    en: {
      title: "New Item",
      subtitle: "Create a new item and register its initial quantity.",
      breadcrumb: "New Item",
    },
  },
  "/locations": {
    ko: {
      title: "보관 위치",
      subtitle: "보관 위치와 거래처를 관리합니다.",
      breadcrumb: "보관 위치",
    },
    en: {
      title: "Locations",
      subtitle: "Manage storage locations and suppliers.",
      breadcrumb: "Locations",
    },
  },
  "/scan": {
    ko: {
      title: "바코드 스캔",
      subtitle: "추후 개발 예정 화면입니다.",
      breadcrumb: "스캔",
    },
    en: {
      title: "Barcode Scan",
      subtitle: "This view is hidden for now and will be expanded later.",
      breadcrumb: "Scan",
    },
  },
  "/history": {
    ko: {
      title: "변경 이력",
      subtitle: "누가 어떤 재고를 변경했는지 시간순으로 확인합니다.",
      breadcrumb: "이력",
    },
    en: {
      title: "Change History",
      subtitle: "Track who changed which stock and when.",
      breadcrumb: "History",
    },
  },
  "/groups": {
    ko: {
      title: "그룹 관리",
      subtitle: "그룹 생성, 가입 요청, 승인, 권한 변경을 한곳에서 관리합니다.",
      breadcrumb: "그룹",
    },
    en: {
      title: "Groups",
      subtitle: "Manage group creation, join requests, approvals, and roles.",
      breadcrumb: "Groups",
    },
  },
  "/account": {
    ko: {
      title: "개인정보 수정",
      subtitle: "이름과 이메일 등 현재 계정 정보를 관리합니다.",
      breadcrumb: "개인정보",
    },
    en: {
      title: "Account Settings",
      subtitle: "Manage your current account information.",
      breadcrumb: "Account",
    },
  },
};

function formatTodayStamp() {
  return new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getWorkspaceRailSections(language: UiLanguage): RailSection[] {
  return [
    {
      title: language === "ko" ? "메뉴" : "Menu",
      items: [
        { href: "/", label: language === "ko" ? "대시보드" : "Dashboard", icon: "dashboard" },
        { href: "/inventory", label: language === "ko" ? "재고" : "Inventory", icon: "inventory" },
        { href: "/items/new", label: language === "ko" ? "품목 등록" : "New Item", icon: "item" },
        { href: "/locations", label: language === "ko" ? "보관 위치" : "Locations", icon: "location" },
        { href: "/history", label: language === "ko" ? "이력" : "History", icon: "history" },
        { href: "/groups", label: language === "ko" ? "그룹" : "Groups", icon: "group" },
      ],
    },
  ];
}

function getLockedRailSections(language: UiLanguage): RailSection[] {
  return [
    {
      title: language === "ko" ? "작업공간" : "Workspace",
      items: [
        {
          href: "/groups",
          label: language === "ko" ? "그룹" : "Groups",
          icon: "group",
          badge: language === "ko" ? "선택 필요" : "Required",
        },
      ],
    },
  ];
}

function formatNowStamp(language: UiLanguage) {
  return new Date().toLocaleString(language === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitialMark(name: string) {
  return name.trim().charAt(0).toUpperCase() || "U";
}

function getRoleLabel(role?: string | null) {
  if (role === "owner") return "소유자";
  if (role === "full") return "전체 권한";
  if (role === "write") return "편집 가능";
  if (role === "read") return "읽기 전용";
  return "그룹 없음";
}

function isWithinRecentDays(dateValue: string | undefined, dayCount: number) {
  if (!dateValue) {
    return false;
  }

  const parsedTime = new Date(dateValue).getTime();
  if (Number.isNaN(parsedTime)) {
    return false;
  }

  return Date.now() - parsedTime <= dayCount * 24 * 60 * 60 * 1000;
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
  language,
}: {
  open: boolean;
  onClose: () => void;
  prefs: LayoutPrefs;
  onChange: (nextPrefs: LayoutPrefs) => void;
  language: UiLanguage;
}) {
  return (
    <>
      <div className={`style-veil${open ? " is-open" : ""}`} onClick={onClose} />
      <aside className={`style-rail${open ? " is-open" : ""}`}>
        <div className="style-rail-head">
          <div>
            <h3>{language === "ko" ? "화면 설정" : "Display Settings"}</h3>
            <p>{language === "ko" ? "사이드바와 본문 테마를 빠르게 바꿉니다." : "Adjust the sidebar and page theme quickly."}</p>
          </div>
          <button className="utility-button" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="style-block">
          <div className="style-block-head">
            <span className="style-block-label">{language === "ko" ? "사이드바 톤" : "Rail Tone"}</span>
            <HelpHint
              description={
                language === "ko"
                  ? "사이드바와 상단 HUD의 색감 분위기를 바꿉니다."
                  : "Changes the color mood of the sidebar and top HUD."
              }
              label={language === "ko" ? "사이드바 톤 안내" : "Rail tone help"}
            />
          </div>
          <div className="style-choice-row">
            {(["gradient", "dark", "light"] as RailTone[]).map((value) => (
              <button
                key={value}
                className={`style-choice${prefs.railTone === value ? " is-active" : ""}`}
                onClick={() => onChange({ ...prefs, railTone: value })}
                data-tooltip={
                  language === "ko"
                    ? value === "gradient"
                      ? "기본 밝은 그라데이션 테마"
                      : value === "dark"
                        ? "어두운 집중형 테마"
                        : "밝은 단색형 테마"
                    : value === "gradient"
                      ? "Default bright gradient theme"
                      : value === "dark"
                        ? "Dark focused theme"
                        : "Light single-tone theme"
                }
                type="button"
              >
                {language === "ko"
                  ? value === "gradient"
                    ? "그라데이션"
                    : value === "dark"
                      ? "다크"
                      : "라이트"
                  : value}
              </button>
            ))}
          </div>
        </div>

        <div className="style-block">
          <span className="style-block-label">{language === "ko" ? "사이드바 너비" : "Rail Width"}</span>
          <div className="style-toggle-row">
            <span>{language === "ko" ? "축소형 사이드바" : "Compact rail"}</span>
            <button
              className={`style-toggle${prefs.compactRail ? " is-on" : ""}`}
              onClick={() => onChange({ ...prefs, compactRail: !prefs.compactRail })}
              data-tooltip={language === "ko" ? "메뉴를 아이콘 중심으로 줄여 화면 폭을 넓힙니다." : "Shrinks the sidebar to icon-first navigation."}
              type="button"
            >
              <span />
            </button>
          </div>
        </div>

        <div className="style-block">
          <span className="style-block-label">{language === "ko" ? "패널 톤" : "Panel Tone"}</span>
          <div className="style-choice-row">
            {(["default", "soft"] as PanelTone[]).map((value) => (
              <button
                key={value}
                className={`style-choice${prefs.panelTone === value ? " is-active" : ""}`}
                onClick={() => onChange({ ...prefs, panelTone: value })}
                data-tooltip={
                  language === "ko"
                    ? value === "default"
                      ? "기본 대비를 유지합니다."
                      : "패널 대비를 부드럽게 줄입니다."
                    : value === "default"
                      ? "Keeps the default contrast."
                      : "Softens panel contrast."
                }
                type="button"
              >
                {language === "ko" ? (value === "default" ? "기본" : "부드럽게") : value}
              </button>
            ))}
          </div>
        </div>

        <div className="style-block">
          <span className="style-block-label">{language === "ko" ? "상단 바 효과" : "Hud Mode"}</span>
          <div className="style-choice-row">
            {(["solid", "glass"] as HudMode[]).map((value) => (
              <button
                key={value}
                className={`style-choice${prefs.hudMode === value ? " is-active" : ""}`}
                onClick={() => onChange({ ...prefs, hudMode: value })}
                data-tooltip={
                  language === "ko"
                    ? value === "solid"
                      ? "불투명한 상단 바"
                      : "유리처럼 반투명한 상단 바"
                    : value === "solid"
                      ? "Solid top bar"
                      : "Glass-like translucent top bar"
                }
                type="button"
              >
                {language === "ko" ? (value === "solid" ? "단색" : "글래스") : value}
              </button>
            ))}
          </div>
        </div>

        <div className="style-block">
          <span className="style-block-label">{language === "ko" ? "본문 너비" : "Canvas Width"}</span>
          <div className="style-choice-row">
            {(["full", "boxed"] as CanvasWidth[]).map((value) => (
              <button
                key={value}
                className={`style-choice${prefs.canvasWidth === value ? " is-active" : ""}`}
                onClick={() => onChange({ ...prefs, canvasWidth: value })}
                data-tooltip={
                  language === "ko"
                    ? value === "full"
                      ? "화면 폭을 넓게 사용합니다."
                      : "본문을 가운데 정렬해 정돈된 폭으로 보여줍니다."
                    : value === "full"
                      ? "Uses the full canvas width."
                      : "Centers the content in a boxed layout."
                }
                type="button"
              >
                {language === "ko" ? (value === "full" ? "전체" : "박스형") : value}
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
  readNoticeIds,
  onMarkRead,
}: {
  open: boolean;
  onClose: () => void;
  notices: NoticeItem[];
  readNoticeIds: string[];
  onMarkRead: (noticeId: string) => void;
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
              <button
                className={`alert-read-button${readNoticeIds.includes(notice.id) ? " is-read" : ""}`}
                onClick={() => onMarkRead(notice.id)}
                type="button"
              >
                {readNoticeIds.includes(notice.id) ? "✓ 확인됨" : "✓ 확인"}
              </button>
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
  const { language, setLanguage } = useUiLanguage();
  const keyword = useStockBrowseState((state) => state.keyword);
  const setShelfKeyword = useStockBrowseState((state) => state.setKeyword);
  const setShelfZone = useStockBrowseState((state) => state.setZoneId);
  const [queryDraft, setQueryDraft] = useState("");
  const [nowLabel, setNowLabel] = useState(() => formatNowStamp(language));
  const [styleRailOpen, setStyleRailOpen] = useState(false);
  const [mobileRailOpen, setMobileRailOpen] = useState(false);
  const [mobileQuickdockOpen, setMobileQuickdockOpen] = useState(true);
  const [alertRailOpen, setAlertRailOpen] = useState(false);
  const [openHudMenu, setOpenHudMenu] = useState<HudMenuKind>(null);
  const [layoutPrefs, setLayoutPrefs] = useState<LayoutPrefs>(defaultLayoutPrefs);
  const [readNoticeIds, setReadNoticeIds] = useState<string[]>([]);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const { data: itemRows } = useQuery({
    queryKey: ["item-records-shell"],
    queryFn: () => apiGet<ItemRecord[]>("/items"),
    enabled: Boolean(user),
  });
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
      ? language === "ko"
        ? {
            title: "품목 상세",
            subtitle: "품목별 재고 현황과 최근 변경 이력을 확인합니다.",
            breadcrumb: "품목 상세",
          }
        : {
            title: "Item Detail",
            subtitle: "Review current stock and recent changes for this item.",
            breadcrumb: "Item Detail",
          }
      : localizedRouteCopyMap[pathname]?.[language] ?? localizedRouteCopyMap["/groups"][language];
  const isLoginScreen = pathname === "/login";
  const isGroupsScreen = pathname === "/groups";
  const activeRailSections = hasActiveGroup ? getWorkspaceRailSections(language) : getLockedRailSections(language);
  const mobileRailLinks =
    getWorkspaceRailSections(language)[0]?.items.filter((item) => mobileQuickdockVisibleHrefs.has(item.href)) ?? [];
  const workspaceLabel = profile?.activeGroupName ?? (language === "ko" ? "그룹 선택 필요" : "Group required");
  const roleLabel = getRoleLabel(profile?.activeGroupRole);
  const avatarLabel = useMemo(
    () => profile?.name?.trim() || user?.displayName?.trim() || user?.email?.split("@")[0] || "사용자",
    [profile?.name, user?.displayName, user?.email],
  );
  const itemSearchOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (itemRows ?? [])
            .map((itemRow) => itemRow.name.trim())
            .filter((itemName) => itemName.length > 0),
        ),
      ).sort((leftName, rightName) => leftName.localeCompare(rightName, "ko")),
    [itemRows],
  );
  const noticeStorageKey = useMemo(
    () => (user ? `im-read-notices:${user.uid}:${profile?.activeGroupId ?? "none"}` : null),
    [profile?.activeGroupId, user],
  );
  const noticeFeed = useMemo<NoticeItem[]>(() => {
    const lowStockNotices = (lowStockAlerts ?? []).slice(0, 2).map((alertRow) => ({
      id: `low-stock-${alertRow.inventoryId}`,
      title: `${alertRow.itemName} 재고 부족`,
      body: `${alertRow.locationName}에 ${alertRow.quantity}${alertRow.unit} 남아 있습니다.`,
      time: alertRow.status,
      tone: "danger" as const,
    }));

    const joinRequestNotices = (pendingJoinRequests ?? [])
      .filter((requestRow) => isWithinRecentDays(requestRow.requestedAt, 7))
      .slice(0, 2)
      .map((requestRow) => ({
        id: `join-request-${requestRow.id}`,
        title: language === "ko" ? `${requestRow.name} 가입 요청` : `${requestRow.name} requested access`,
        body: requestRow.email || requestRow.userId,
        time: requestRow.requestedAtLabel,
        tone: "warn" as const,
      }));

    const historyNotices = (recentHistoryRows ?? [])
      .filter((historyRow) => isWithinRecentDays(historyRow.createdAt, 7))
      .slice(0, 2)
      .map((historyRow) => ({
        id: `history-${historyRow.id}`,
        title:
          historyRow.changeType === "location_create"
            ? language === "ko"
              ? `${historyRow.itemName} 위치 등록`
              : `${historyRow.itemName} location added`
            : historyRow.changeType === "counterparty_create"
              ? language === "ko"
                ? `${historyRow.itemName} 거래처 등록`
                : `${historyRow.itemName} supplier added`
              : language === "ko"
                ? `${historyRow.itemName} 변경`
                : `${historyRow.itemName} updated`,
        body:
          language === "ko"
            ? `위치 ${historyRow.locationName} / 사유 ${historyRow.reason}`
            : `Location ${historyRow.locationName} / Reason ${historyRow.reason}`,
        time: historyRow.createdAtLabel,
        tone: "ok" as const,
      }));

    return [...lowStockNotices, ...joinRequestNotices, ...historyNotices].slice(0, 6);
  }, [language, lowStockAlerts, pendingJoinRequests, recentHistoryRows]);
  const unreadNoticeCount = useMemo(
    () => noticeFeed.filter((notice) => !readNoticeIds.includes(notice.id)).length,
    [noticeFeed, readNoticeIds],
  );

  const markVisibleNoticesAsRead = () => {
    setReadNoticeIds((current) => {
      const nextIds = new Set(current);
      noticeFeed.forEach((notice) => nextIds.add(notice.id));
      return Array.from(nextIds);
    });
  };

  const markSingleNoticeAsRead = (noticeId: string) => {
    setReadNoticeIds((current) => {
      if (current.includes(noticeId)) {
        return current;
      }
      return [...current, noticeId];
    });
  };

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
    if (!noticeStorageKey) {
      setReadNoticeIds([]);
      return;
    }

    try {
      const savedIds = window.localStorage.getItem(noticeStorageKey);
      setReadNoticeIds(savedIds ? (JSON.parse(savedIds) as string[]) : []);
    } catch {
      setReadNoticeIds([]);
    }
  }, [noticeStorageKey]);

  useEffect(() => {
    document.documentElement.dataset.railTone = layoutPrefs.railTone;
    document.documentElement.dataset.railSize = layoutPrefs.compactRail ? "compact" : "default";
    document.documentElement.dataset.panelTone = layoutPrefs.panelTone;
    document.documentElement.dataset.hudMode = layoutPrefs.hudMode;
    document.documentElement.dataset.canvasWidth = layoutPrefs.canvasWidth;
    window.localStorage.setItem("im-layout-prefs", JSON.stringify(layoutPrefs));
  }, [layoutPrefs]);

  useEffect(() => {
    if (!noticeStorageKey) {
      return;
    }
    window.localStorage.setItem(noticeStorageKey, JSON.stringify(readNoticeIds));
  }, [noticeStorageKey, readNoticeIds]);

  useEffect(() => {
    setNowLabel(formatNowStamp(language));
    const timer = window.setInterval(() => {
      setNowLabel(formatNowStamp(language));
    }, 30000);

    return () => window.clearInterval(timer);
  }, [language]);

  useEffect(() => {
    setQueryDraft(keyword);
  }, [keyword]);

  useEffect(() => {
    const shouldLockScroll = mobileRailOpen || alertRailOpen || styleRailOpen;
    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;

    if (shouldLockScroll) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [alertRailOpen, mobileRailOpen, styleRailOpen]);

  useEffect(() => {
    setMobileRailOpen(false);
    setMobileQuickdockOpen(false);
    setOpenHudMenu(null);
    setAlertRailOpen(false);
    setStyleRailOpen(false);
  }, [pathname]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1100px)");
    const legacyMediaQuery = mediaQuery as MediaQueryList & {
      addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
      removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
    };
    const syncViewportState = () => setIsMobileViewport(mediaQuery.matches);

    syncViewportState();
    if ("addEventListener" in mediaQuery) {
      mediaQuery.addEventListener("change", syncViewportState);
      return () => mediaQuery.removeEventListener("change", syncViewportState);
    }

    legacyMediaQuery.addListener?.(syncViewportState);
    return () => legacyMediaQuery.removeListener?.(syncViewportState);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1101px)");
    const legacyMediaQuery = mediaQuery as MediaQueryList & {
      addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
      removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
    };
    const handleDesktopEnter = () => {
      if (!mediaQuery.matches) {
        return;
      }

      setMobileRailOpen(false);
      setMobileQuickdockOpen(false);
      setAlertRailOpen(false);
      setStyleRailOpen(false);
      setOpenHudMenu(null);
    };

    handleDesktopEnter();
    if ("addEventListener" in mediaQuery) {
      mediaQuery.addEventListener("change", handleDesktopEnter);
      return () => mediaQuery.removeEventListener("change", handleDesktopEnter);
    }

    legacyMediaQuery.addListener?.(handleDesktopEnter);
    return () => legacyMediaQuery.removeListener?.(handleDesktopEnter);
  }, []);

  if (isLoginScreen) {
    return <>{children}</>;
  }

  if (loading || !user) {
    return <div className="loading-state">접속 상태를 확인하는 중입니다.</div>;
  }

  return (
    <div
      className={`shell${mobileRailOpen ? " is-mobile-sidebar-open" : ""}${alertRailOpen ? " is-alert-open" : ""}${styleRailOpen ? " is-style-rail-open" : ""}`}
    >
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
                      title={layoutPrefs.compactRail ? item.label : undefined}
                      data-tooltip={layoutPrefs.compactRail ? item.label : undefined}
                      aria-label={item.label}
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
                data-tooltip={language === "ko" ? "메뉴 열기" : "Open menu"}
                onClick={() => {
                  setOpenHudMenu(null);
                  setAlertRailOpen(false);
                  setStyleRailOpen(false);
                  setMobileRailOpen((prev) => !prev);
                }}
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
                  list="global-item-search-list"
                  placeholder={language === "ko" ? "품목명 검색" : "Search items"}
                  value={queryDraft}
                  onChange={(event) => setQueryDraft(event.target.value)}
                />
              </form>
              <datalist id="global-item-search-list">
                {itemSearchOptions.map((itemName) => (
                  <option key={itemName} value={itemName} />
                ))}
              </datalist>
            </div>

            <div className="hud-end">
              {!isMobileViewport ? (
                <div className="language-switch" aria-label={language === "ko" ? "언어 선택" : "Language switch"}>
                  <button
                    className={`language-button${language === "ko" ? " is-active" : ""}`}
                    onClick={() => setLanguage("ko")}
                    type="button"
                  >
                    KO
                  </button>
                  <button
                    className={`language-button${language === "en" ? " is-active" : ""}`}
                    onClick={() => setLanguage("en")}
                    type="button"
                  >
                    EN
                  </button>
                </div>
              ) : null}
              <div className="hud-end-actions">
                <button
                  className="utility-button has-badge"
                  data-tooltip={language === "ko" ? "최근 7일 알림" : "Alerts from the last 7 days"}
                  onClick={() => {
                    setMobileRailOpen(false);
                    setStyleRailOpen(false);
                    setOpenHudMenu(null);
                    setAlertRailOpen(true);
                  }}
                  type="button"
                >
                  <UtilityIcon kind="bell" />
                  {unreadNoticeCount > 0 ? <span className="utility-badge danger">{unreadNoticeCount}</span> : null}
                </button>

                <div className="hud-anchor">
                  <button
                    className="profile-trigger"
                    data-tooltip={language === "ko" ? "계정 메뉴" : "Account menu"}
                    onClick={() => setOpenHudMenu((prev) => (prev === "profile" ? null : "profile"))}
                    aria-expanded={openHudMenu === "profile"}
                    type="button"
                  >
                    <div className="hud-profile">
                      <span className="identity-chip hud-profile-avatar">{getInitialMark(avatarLabel)}</span>
                      <div className="hud-profile-copy">
                        <strong>{avatarLabel}</strong>
                        <span>{roleLabel}</span>
                      </div>
                    </div>
                    <span className="profile-trigger-icon">
                      <UtilityIcon kind="chevron" />
                    </span>
                  </button>

                  <HudTray open={openHudMenu === "profile"}>
                    <div className="hud-tray-head">
                      <strong>{language === "ko" ? "사용자 메뉴" : "User menu"}</strong>
                    </div>
                    <div className="hud-tray-list">
                      <Link className="hud-tray-item" href="/account" onClick={() => setOpenHudMenu(null)}>
                        <span>{language === "ko" ? "개인정보 수정" : "Account settings"}</span>
                        <small>{language === "ko" ? "이름 변경" : "Change your name"}</small>
                      </Link>
                      <Link className="hud-tray-item" href="/groups" onClick={() => setOpenHudMenu(null)}>
                        <span>{language === "ko" ? "그룹 관리" : "Groups"}</span>
                        <small>{workspaceLabel}</small>
                      </Link>
                      <button
                        className="hud-tray-item"
                        onClick={() => {
                          setOpenHudMenu(null);
                          void signOutUser();
                        }}
                        type="button"
                      >
                        <span>{language === "ko" ? "로그아웃" : "Sign out"}</span>
                        <small>{user.email ?? ""}</small>
                      </button>
                    </div>
                  </HudTray>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="canvas-wrap">
          <div className="canvas-titlebar">
            <div>
              <ol className="canvas-breadcrumbs">
                <li>{routeCopy.breadcrumb}</li>
              </ol>
              <h4>{routeCopy.title}</h4>
              <p>
                {hasActiveGroup
                  ? routeCopy.subtitle
                  : language === "ko"
                    ? "먼저 그룹을 선택해야 다른 화면을 사용할 수 있습니다."
                    : "Select a group first to use the rest of the workspace."}
              </p>
            </div>
            <div className="canvas-actions">
              {profile?.activeGroupName ? (
                <div className="canvas-context-card">
                  <div className="canvas-context-grid">
                    <div>
                      <span className="canvas-context-label">{language === "ko" ? "현재 그룹" : "Current group"}</span>
                      <strong className="canvas-context-value">{profile.activeGroupName}</strong>
                    </div>
                    <div>
                      <span className="canvas-context-label">{language === "ko" ? "현재 시각" : "Current time"}</span>
                      <strong className="canvas-context-value">{nowLabel}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <Link className="button primary" href="/groups">
                  {language === "ko" ? "그룹 선택" : "Select group"}
                </Link>
              )}
            </div>
          </div>

          <div className="canvas-body">{children}</div>
        </main>
      </div>

      <button
        className="style-fab"
        data-tooltip={language === "ko" ? "화면 설정" : "Display settings"}
        onClick={() => {
          setMobileRailOpen(false);
          setAlertRailOpen(false);
          setOpenHudMenu(null);
          setStyleRailOpen(true);
        }}
        style={{
          position: "fixed",
          top: "auto",
          left: "auto",
          right: isMobileViewport ? "18px" : "24px",
          bottom: isMobileViewport ? "18px" : "24px",
          width: "48px",
          minWidth: "48px",
          height: "48px",
          padding: "0",
          borderRadius: "999px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1010,
        }}
        type="button"
      >
        <UtilityIcon kind="settings" />
      </button>

      <StyleRail
        open={styleRailOpen}
        onClose={() => setStyleRailOpen(false)}
        prefs={layoutPrefs}
        onChange={setLayoutPrefs}
        language={language}
      />

      <AlertRail
        open={alertRailOpen}
        onClose={() => setAlertRailOpen(false)}
        notices={noticeFeed}
        readNoticeIds={readNoticeIds}
        onMarkRead={markSingleNoticeAsRead}
      />

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

      <style jsx global>{`
        .shell {
          width: 100%;
        }

        .shell-main {
          width: auto !important;
          min-width: 0;
          max-width: calc(100vw - var(--sidebar-width));
          margin-left: var(--sidebar-width);
          flex: 1 1 auto;
        }

        .control-hud,
        .canvas-wrap,
        .canvas-titlebar,
        .canvas-body {
          width: 100%;
          min-width: 0;
        }

        .style-fab {
          display: inline-flex !important;
          align-items: center;
          justify-content: center;
          width: 48px !important;
          min-width: 48px !important;
          height: 48px !important;
          padding: 0 !important;
          border-radius: 999px !important;
          top: auto !important;
          right: 24px !important;
          bottom: 24px !important;
          left: auto !important;
          inset: auto 24px 24px auto !important;
        }

        .style-fab svg {
          width: 18px;
          height: 18px;
          flex: none;
        }

        @media (max-width: 1100px) {
          .shell-main {
            width: 100% !important;
            max-width: 100% !important;
            margin-left: 0 !important;
            flex: 1 1 auto !important;
          }

          .hud-inner {
            min-height: auto;
            display: flex !important;
            align-items: center;
            gap: 8px;
            padding: 10px 12px;
            flex-wrap: nowrap;
          }

          .hud-start {
            order: 1;
            flex: 1 1 auto;
            min-width: 0;
            display: flex !important;
            align-items: center;
            gap: 8px;
          }

          .hud-end {
            order: 2;
            flex: none;
            min-width: 0;
            width: auto;
            display: flex !important;
            align-items: center;
            justify-content: flex-end;
            gap: 6px;
          }

          .hud-end-actions {
            margin-left: 0;
            gap: 6px;
            flex-wrap: nowrap;
          }

          .language-switch {
            display: none !important;
          }

          .search-dock {
            width: auto !important;
            min-width: 0;
            flex: 1 1 auto;
            height: 36px;
            padding: 0 10px;
          }

          .search-dock input {
            min-width: 0;
            font-size: 0.9rem;
          }

          .mobile-menu-button,
          .utility-button {
            width: 34px;
            height: 34px;
            flex: none;
          }

          .profile-trigger {
            min-height: 34px;
            gap: 4px;
            padding: 2px 4px;
            flex: none;
          }

          .profile-trigger-icon {
            width: 14px;
            height: 14px;
          }

          .hud-profile {
            gap: 0;
          }

          .hud-profile-avatar {
            width: 28px;
            height: 28px;
          }

          .hud-anchor {
            position: relative;
            flex: none;
          }

          .hud-anchor .hud-tray {
            top: calc(100% + 8px);
            right: 0;
            left: auto;
            width: min(280px, calc(100vw - 24px));
            max-width: calc(100vw - 24px);
            padding: 12px;
          }

          .hud-tray-list {
            gap: 6px;
          }

          .hud-tray-item {
            align-items: flex-start;
            gap: 8px;
            padding: 10px 12px;
          }

          .canvas-titlebar {
            flex-direction: column;
            align-items: stretch;
          }

          .canvas-actions {
            width: 100%;
            margin-left: 0;
            justify-content: flex-start;
          }

          .canvas-context-card {
            width: 100%;
            max-width: none;
            margin-left: 0;
          }
        }

        @media (max-width: 720px) {
          .canvas-wrap {
            padding: 16px 14px 112px;
          }

          .hud-inner {
            gap: 6px;
            padding: 10px 10px;
          }

          .search-dock {
            height: 34px;
            padding: 0 8px;
          }

          .search-dock-icon {
            font-size: 0.8rem;
          }

          .search-dock input {
            font-size: 0.82rem;
          }

          .canvas-titlebar h4 {
            font-size: 0.98rem;
          }

          .canvas-titlebar p {
            font-size: 0.82rem;
            line-height: 1.45;
          }
        }
      `}</style>
    </div>
  );
}
