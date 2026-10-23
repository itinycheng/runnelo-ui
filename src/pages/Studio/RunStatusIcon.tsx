import { Tooltip } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  Loading3QuartersOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { JobStatus } from "@/types/job";
import { STATUS_TOKEN_COLOR } from "@/utils/statusColor";

const RUN_ICON: Record<JobStatus, { color: string; Icon: typeof CheckCircleOutlined; spin?: boolean }> = {
  success: { color: STATUS_TOKEN_COLOR.success, Icon: CheckCircleOutlined },
  failed: { color: STATUS_TOKEN_COLOR.error, Icon: CloseCircleOutlined },
  running: { color: STATUS_TOKEN_COLOR.info, Icon: Loading3QuartersOutlined, spin: true },
  pending: { color: STATUS_TOKEN_COLOR.neutral, Icon: ClockCircleOutlined },
  stopped: { color: STATUS_TOKEN_COLOR.neutral, Icon: CloseCircleOutlined },
  scheduling: { color: STATUS_TOKEN_COLOR.success, Icon: ClockCircleOutlined },
};

/** Latest-run status of a definition node, shown as an icon (distinct from the lifecycle dot). */
export function RunStatusIcon({ status }: { status?: JobStatus }) {
  const { t } = useTranslation();
  const cfg = status ? RUN_ICON[status] : undefined;
  const label = `${t("jobStatus.lastRun")}: ${status ? t(`jobStatus.${status}`) : t("jobStatus.neverRun")}`;
  const { Icon, color, spin } = cfg ?? { Icon: ClockCircleOutlined, color: STATUS_TOKEN_COLOR.neutral, spin: false };
  return (
    <Tooltip title={label}>
      <Icon className="studio-run-status-icon" spin={spin} style={{ fontSize: 12, color }} aria-label={label} />
    </Tooltip>
  );
}
