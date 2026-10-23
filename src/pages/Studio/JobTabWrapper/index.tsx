import { useState } from "react";
import { Alert, Button, Drawer, Flex } from "antd";
import { useTranslation } from "react-i18next";
import type { JobTreeNode } from "@/types/job";
import DAGEditor from "@/pages/Studio/DAGEditor";
import JobForm from "@/pages/Studio/JobForm";
import SchedulePanel from "./SchedulePanel";
import ParamsPanel from "./ParamsPanel";
import AlertsPanel from "./AlertsPanel";
import { USE_MOCK_DEFINITION_GROUPS } from "@/config";

type PanelKey = "schedule" | "params" | "alerts";

interface PanelDef {
  key: PanelKey;
  titleKey: string;
}

const PANELS: PanelDef[] = [
  { key: "schedule", titleKey: "sidePanel.schedule" },
  { key: "params", titleKey: "sidePanel.params" },
  { key: "alerts", titleKey: "sidePanel.alerts" },
];

const BAR_WIDTH = 24;

interface PanelBarItemProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function PanelBarItem({ label, isActive, onClick }: PanelBarItemProps) {
  return (
    <Button
      type="text"
      aria-pressed={isActive}
      onClick={onClick}
      style={{
        writingMode: "vertical-rl",
        textOrientation: "mixed",
        width: BAR_WIDTH,
        height: "auto",
        padding: "8px 4px",
        fontSize: "var(--app-font-meta)",
        letterSpacing: 1,
        whiteSpace: "nowrap",
        borderRadius: "var(--ant-border-radius-sm)",
        background: isActive ? "var(--ant-color-primary-bg)" : "transparent",
        color: isActive ? "var(--ant-color-primary)" : "var(--ant-color-text-tertiary)",
        fontWeight: isActive ? 500 : 400,
        transition: "color var(--ant-motion-duration-fast), background var(--ant-motion-duration-fast)",
        userSelect: "none",
      }}
    >
      {label}
    </Button>
  );
}

export default function JobTabWrapper({ node }: { node: JobTreeNode }) {
  const { t } = useTranslation();
  const [activePanel, setActivePanel] = useState<PanelKey | null>(null);
  const isWorkflow = node.kind === "workflow";
  const hasDefinitionSettings = node.kind !== "group";
  const canEditSettings = isWorkflow || USE_MOCK_DEFINITION_GROUPS || activePanel === "params";

  const toggle = (key: PanelKey) => {
    setActivePanel((prev) => (prev === key ? null : key));
  };

  return (
    <Flex style={{ height: "100%", overflow: "hidden" }}>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {isWorkflow ? <DAGEditor embedded workflowId={node.refId} /> : <JobForm nodeId={node.id} />}
        {hasDefinitionSettings && (
          <Drawer
            title={activePanel ? t(`sidePanel.${activePanel}`) : ""}
            placement="right"
            open={activePanel !== null}
            onClose={() => setActivePanel(null)}
            getContainer={false}
            closable={false}
            mask={false}
            size={320}
            styles={{
              body: { padding: "12px 16px" },
              header: { padding: "12px 16px" },
              wrapper: {
                boxShadow: "var(--ant-box-shadow-secondary)",
                borderLeft: "1px solid var(--ant-color-border-secondary)",
              },
            }}
          >
            {canEditSettings ? (
              <>
                {activePanel === "schedule" && <SchedulePanel nodeId={node.id} />}
                {activePanel === "params" && <ParamsPanel nodeId={node.id} />}
                {activePanel === "alerts" && <AlertsPanel nodeId={node.id} />}
              </>
            ) : (
              <Alert type="info" showIcon message={t("sidePanel.taskSettingsUnavailable")} />
            )}
          </Drawer>
        )}
      </div>

      {hasDefinitionSettings && (
        <Flex
          vertical
          align="center"
          style={{
            width: BAR_WIDTH,
            flexShrink: 0,
            borderLeft: "1px solid var(--ant-color-border-secondary)",
            background: "var(--ant-color-bg-layout)",
            paddingTop: 8,
            gap: 0,
          }}
        >
          {PANELS.map((panel) => (
            <PanelBarItem
              key={panel.key}
              label={t(panel.titleKey)}
              isActive={activePanel === panel.key}
              onClick={() => toggle(panel.key)}
            />
          ))}
        </Flex>
      )}
    </Flex>
  );
}
