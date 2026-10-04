import { ConfigProvider, Flex, Tabs, Typography, type ThemeConfig } from "antd";
import { InboxOutlined, CloseOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useJobStore, findNodeById } from "@/stores/jobStore";
import SiderPanel from "@/pages/Studio/Sider";
import JobTabWrapper from "@/pages/Studio/JobTabWrapper";
import { TaskIcon } from "@/components/TaskIcon";
import React from "react";
import "./StudioTabs.css";

const tabTheme: ThemeConfig = {
  components: {
    Tabs: {
      horizontalMargin: "0",
      cardBg: "var(--ant-color-bg-layout)",
      cardHeight: 35,
      cardPadding: "4px 12px",
      cardGutter: -1,
    },
  },
};

function getTabIcon(jobType: string | undefined): React.ReactNode {
  return <TaskIcon type={jobType} size={16} style={{ marginRight: 4 }} />;
}

export default function StudioPage() {
  const { selectedNode, treeData, openTabs, activeTabKey, closeTab, setActiveTab } = useJobStore();
  const { t } = useTranslation();

  const breadcrumbItems = [{ title: t("nav.workflow") }];
  if (selectedNode?.pid) {
    const parent = findNodeById(treeData, selectedNode.pid);
    if (parent) breadcrumbItems.push({ title: parent.name });
  }
  if (selectedNode && selectedNode.kind !== "group") {
    breadcrumbItems.push({ title: selectedNode.name });
  }

  const tabItems = openTabs.map((tab) => ({
    key: tab.key,
    label: (
      <span style={{ display: "inline-flex", alignItems: "center", paddingInline: 4 }}>
        {getTabIcon(tab.node.jobType ?? tab.node.kind)}
        <span
          style={{
            maxWidth: 120,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "inline-block",
            verticalAlign: "middle",
          }}
        >
          {tab.node.name}
        </span>
        <CloseOutlined
          style={{ color: "inherit" }}
          onClick={(e) => {
            e.stopPropagation();
            closeTab(tab.key);
          }}
        />
      </span>
    ),
    children: <JobTabWrapper node={tab.node} />,
  }));

  return (
    <Flex style={{ height: "100%", overflow: "hidden" }}>
      <div style={{ flexShrink: 0 }}>
        <SiderPanel />
      </div>

      <Flex vertical style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
        {tabItems.length > 0 ? (
          <ConfigProvider theme={tabTheme}>
            <Tabs
              type="card"
              rootClassName="job-tabs-wrapper"
              activeKey={activeTabKey ?? undefined}
              onChange={setActiveTab}
              items={tabItems}
              size="small"
              style={{ flex: 1, minHeight: 0 }}
              styles={{
                header: { background: "var(--ant-color-bg-layout)" },
                content: { flex: 1, height: "100%" },
              }}
            />
          </ConfigProvider>
        ) : (
          <Flex vertical align="center" justify="center" style={{ flex: 1 }}>
            <InboxOutlined style={{ fontSize: 32, color: "var(--ant-color-text-quaternary)" }} />
            <Typography.Text type="secondary" style={{ marginTop: 8 }}>
              {selectedNode?.kind === "group" ? t("workflow.selectGroupHint") : t("workflow.selectWorkflowHint")}
            </Typography.Text>
          </Flex>
        )}
      </Flex>
    </Flex>
  );
}
