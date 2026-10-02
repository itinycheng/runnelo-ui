import JobTree from "@/pages/Studio/JobTree";
import { SearchOutlined, ApartmentOutlined, WarningOutlined, DeleteOutlined, FilterOutlined } from "@ant-design/icons";
import { Badge, Button, Divider, Flex, Input, Popover, Tag, Tooltip, Typography } from "antd";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const JOB_TYPE_FILTERS = [
  { label: "Flink SQL", value: "FLINK_SQL" },
  { label: "MySQL", value: "MYSQL_SQL" },
  { label: "Shell", value: "SHELL" },
  { label: "FLOW", value: "workflow" },
];

const STATUS_FILTERS = [
  { labelKey: "jobStatus.success", value: "success" },
  { labelKey: "jobStatus.failed", value: "failed" },
  { labelKey: "jobStatus.running", value: "running" },
  { labelKey: "jobStatus.pending", value: "pending" },
  { labelKey: "jobStatus.stopped", value: "stopped" },
  { labelKey: "jobStatus.scheduling", value: "scheduling" },
];

type PanelKey = "tree" | "search" | "errors" | "trash";

const PANELS: { key: PanelKey; icon: React.ReactNode; tooltip: string }[] = [
  { key: "tree", icon: <ApartmentOutlined />, tooltip: "sider.tree" },
  { key: "search", icon: <SearchOutlined />, tooltip: "sider.search" },
  { key: "errors", icon: <WarningOutlined />, tooltip: "sider.errors" },
  { key: "trash", icon: <DeleteOutlined />, tooltip: "sider.trash" },
];

const ICON_BAR_WIDTH = 45;
const ICON_SIZE = 45;

const MIN_PANEL_WIDTH = 180;
const MAX_PANEL_WIDTH = 480;
const DEFAULT_PANEL_WIDTH = 240;

/** Panel width with a drag-to-resize handler (resets to default on refresh). */
function usePanelWidth() {
  const [width, setWidth] = useState(DEFAULT_PANEL_WIDTH);

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = width;
      const onMove = (ev: MouseEvent) => {
        const next = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, startWidth + ev.clientX - startX));
        setWidth(next);
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [width],
  );

  return { width, startResize };
}

const iconStyle: React.CSSProperties = {
  width: ICON_SIZE,
  height: ICON_SIZE,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontSize: 18,
  borderRadius: 2,
  transition: "all 0.15s",
};

const iconActiveStyle: React.CSSProperties = {
  ...iconStyle,
  borderLeft: "2px solid var(--ant-color-primary)",
  color: "var(--ant-color-text)",
};

const iconInactiveStyle: React.CSSProperties = {
  ...iconStyle,
  borderLeft: "2px solid transparent",
  color: "var(--ant-color-text-tertiary)",
};

export default function SiderPanel() {
  const [activePanel, setActivePanel] = useState<PanelKey | null>("tree");
  const { width, startResize } = usePanelWidth();

  const handlePanelClick = useCallback((key: PanelKey) => {
    setActivePanel((prev) => (prev === key ? null : key));
  }, []);

  return (
    <Flex style={{ height: "100%", overflow: "hidden" }}>
      <ActivityBar activePanel={activePanel} onPanelClick={handlePanelClick} />
      {activePanel && (
        <>
          <PanelContent activePanel={activePanel} width={width} />
          <div className="sider-resizer" onMouseDown={startResize} />
        </>
      )}
    </Flex>
  );
}

function ActivityBar({
  activePanel,
  onPanelClick,
}: {
  activePanel: PanelKey | null;
  onPanelClick: (key: PanelKey) => void;
}) {
  const { t } = useTranslation();
  return (
    <Flex
      vertical
      align="center"
      style={{
        width: ICON_BAR_WIDTH,
        flexShrink: 0,
        paddingTop: 4,
        gap: 2,
        background: "var(--ant-color-bg-layout)",
        borderRight: "1px solid var(--ant-color-border-secondary)",
      }}
    >
      {PANELS.map((panel) => (
        <Tooltip key={panel.key} title={t(panel.tooltip)} placement="right">
          <div
            style={activePanel === panel.key ? iconActiveStyle : iconInactiveStyle}
            onClick={() => onPanelClick(panel.key)}
          >
            {panel.icon}
          </div>
        </Tooltip>
      ))}
    </Flex>
  );
}

function PanelContent({ activePanel, width }: { activePanel: PanelKey; width: number }) {
  return (
    <Flex
      vertical
      style={{
        width,
        flexShrink: 0,
        overflow: "hidden",
        borderRight: "1px solid var(--ant-color-border-secondary)",
      }}
    >
      {activePanel === "tree" && <TreePanel />}
      {activePanel === "search" && <SearchPanel />}
      {activePanel === "errors" && <ErrorsPanel />}
      {activePanel === "trash" && <TrashPanel />}
    </Flex>
  );
}

interface FilterState {
  keyword: string;
  types: string[];
  statuses: string[];
}

/** Type + status checkable tags shown inside the filter popover. */
function FilterPopoverContent({
  types,
  statuses,
  onToggleType,
  onToggleStatus,
  onClear,
}: {
  types: string[];
  statuses: string[];
  onToggleType: (value: string) => void;
  onToggleStatus: (value: string) => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  const section = (
    title: string,
    items: { value: string; label: string }[],
    selected: string[],
    onToggle: (value: string) => void,
  ) => (
    <div>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {title}
      </Typography.Text>
      <Flex wrap gap={4} style={{ marginTop: 6 }}>
        {items.map((item) => (
          <Tag
            key={item.value}
            color={selected.includes(item.value) ? "blue" : undefined}
            onClick={() => onToggle(item.value)}
            style={{ cursor: "pointer", margin: 0 }}
          >
            {item.label}
          </Tag>
        ))}
      </Flex>
    </div>
  );

  return (
    <Flex vertical gap={10} style={{ width: 208 }}>
      {section(t("sider.filterType"), JOB_TYPE_FILTERS, types, onToggleType)}
      {section(
        t("sider.filterStatus"),
        STATUS_FILTERS.map((s) => ({ value: s.value, label: t(s.labelKey) })),
        statuses,
        onToggleStatus,
      )}
      {types.length + statuses.length > 0 && (
        <Button
          type="link"
          size="small"
          style={{ padding: 0, height: "auto", alignSelf: "flex-start" }}
          onClick={onClear}
        >
          {t("sider.clearFilter")}
        </Button>
      )}
    </Flex>
  );
}

/** Explorer header with a collapsible inline filter (keyword + type/status popover). */
function TreeFilterBar({ onChange }: { onChange: (filter: FilterState) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const activeFilterCount = types.length + statuses.length;

  useEffect(() => onChange({ keyword, types, statuses }), [keyword, types, statuses, onChange]);

  // Collapsing the filter also clears it, so a hidden filter never silently narrows the tree.
  const toggleOpen = useCallback(() => {
    setOpen((prev) => {
      if (prev) {
        setKeyword("");
        setTypes([]);
        setStatuses([]);
      }
      return !prev;
    });
  }, []);

  const toggle = (value: string, setList: React.Dispatch<React.SetStateAction<string[]>>) =>
    setList((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  const active = open && (keyword.trim() !== "" || activeFilterCount > 0);

  return (
    <>
      <Flex align="center" justify="space-between" style={{ flexShrink: 0, paddingInline: 4 }}>
        <Typography.Text strong style={{ fontSize: 14 }}>
          {t("sider.jobs")}
        </Typography.Text>
        <Tooltip title={t("sider.filter")} placement="left">
          <SearchOutlined
            onClick={toggleOpen}
            style={{
              cursor: "pointer",
              fontSize: 14,
              padding: 4,
              borderRadius: 4,
              color: active ? "var(--ant-color-primary)" : "var(--ant-color-text-tertiary)",
            }}
          />
        </Tooltip>
      </Flex>
      {open && (
        <Flex gap={4} style={{ flexShrink: 0, padding: "6px 4px 0" }}>
          <Input
            placeholder={t("workflow.searchPlaceholder")}
            prefix={<SearchOutlined />}
            allowClear
            size="small"
            autoFocus
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <Popover
            trigger="click"
            placement="bottomRight"
            content={
              <FilterPopoverContent
                types={types}
                statuses={statuses}
                onToggleType={(v) => toggle(v, setTypes)}
                onToggleStatus={(v) => toggle(v, setStatuses)}
                onClear={() => {
                  setTypes([]);
                  setStatuses([]);
                }}
              />
            }
          >
            <Badge count={activeFilterCount} size="small" offset={[-2, 2]}>
              <Button size="small" icon={<FilterOutlined />} type={activeFilterCount > 0 ? "primary" : "default"} />
            </Badge>
          </Popover>
        </Flex>
      )}
    </>
  );
}

/** Tree panel — job tree with add group button and a collapsible inline filter */
function TreePanel() {
  const [filter, setFilter] = useState<FilterState>({ keyword: "", types: [], statuses: [] });

  return (
    <Flex vertical style={{ height: "100%", padding: "4px 4px 0" }}>
      <TreeFilterBar onChange={setFilter} />
      <Divider style={{ margin: "2px 0 6px" }} />
      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        <JobTree searchKeyword={filter.keyword} typeFilter={filter.types} statusFilter={filter.statuses} />
      </div>
    </Flex>
  );
}

/** Search panel — keyword + type filter + results */
function SearchPanel() {
  const { t } = useTranslation();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState<string[]>([]);

  const toggleTypeFilter = useCallback((value: string) => {
    setTypeFilter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }, []);

  return (
    <Flex vertical style={{ height: "100%", padding: "4px 4px 0" }}>
      <Flex vertical style={{ flexShrink: 0, paddingInline: 4, gap: 8 }}>
        <Typography.Text strong style={{ fontSize: 12 }}>
          {t("sider.search")}
        </Typography.Text>
        <Input
          placeholder={t("workflow.searchPlaceholder")}
          prefix={<SearchOutlined />}
          allowClear
          size="small"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          autoFocus
        />
        <Flex wrap gap={4}>
          {JOB_TYPE_FILTERS.map((item) => (
            <Tag
              key={item.value}
              color={typeFilter.includes(item.value) ? "blue" : undefined}
              onClick={() => toggleTypeFilter(item.value)}
              style={{ cursor: "pointer", margin: 0 }}
            >
              {item.label}
            </Tag>
          ))}
        </Flex>
      </Flex>
      <Divider style={{ margin: "6px 0" }} />
      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        {searchKeyword.trim() || typeFilter.length > 0 ? (
          <JobTree searchKeyword={searchKeyword} typeFilter={typeFilter} />
        ) : (
          <Flex vertical align="center" justify="center" style={{ height: "100%", opacity: 0.4 }}>
            <SearchOutlined style={{ fontSize: 24 }} />
            <Typography.Text type="secondary" style={{ marginTop: 8, fontSize: 12 }}>
              {t("workflow.searchPlaceholder")}
            </Typography.Text>
          </Flex>
        )}
      </div>
    </Flex>
  );
}

/** Errors panel — placeholder for failed job list */
function ErrorsPanel() {
  const { t } = useTranslation();
  return (
    <Flex vertical align="center" justify="center" style={{ height: "100%", padding: 16 }}>
      <WarningOutlined style={{ fontSize: 24, color: "var(--ant-color-text-quaternary)" }} />
      <Typography.Text type="secondary" style={{ marginTop: 8, fontSize: 12 }}>
        {t("sider.noErrors")}
      </Typography.Text>
    </Flex>
  );
}

/** Trash panel — placeholder for deleted jobs */
function TrashPanel() {
  const { t } = useTranslation();
  return (
    <Flex vertical align="center" justify="center" style={{ height: "100%", padding: 16 }}>
      <DeleteOutlined style={{ fontSize: 20, color: "var(--ant-color-text-quaternary)" }} />
      <Typography.Text type="secondary" style={{ marginTop: 8, fontSize: 12 }}>
        {t("sider.trashEmpty")}
      </Typography.Text>
    </Flex>
  );
}
