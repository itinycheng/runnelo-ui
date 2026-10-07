import type React from "react";
import type { JobType } from "@/constants/enums";
import { JOB_TYPES } from "@/constants/enums";
import {
  ConditionConfigFields,
  DependentConfigFields,
  FlinkJarConfigFields,
  FlinkSqlConfigFields,
  FlowConfigFields,
  JavaConfigFields,
  ShellConfigFields,
  SqlConfigFields,
} from "./configFields";

export interface TaskTypeDef {
  type: JobType;
  labelKey: string;
  ConfigFields: React.FC;
  needsSubject: boolean;
}

export const TASK_TYPE_REGISTRY: Record<JobType, TaskTypeDef> = {
  FLINK_SQL: {
    type: "FLINK_SQL",
    labelKey: "enums.JobType.FLINK_SQL",
    ConfigFields: FlinkSqlConfigFields,
    needsSubject: true,
  },
  FLINK_JAR: {
    type: "FLINK_JAR",
    labelKey: "enums.JobType.FLINK_JAR",
    ConfigFields: FlinkJarConfigFields,
    needsSubject: true,
  },
  COMMON_JAR: {
    type: "COMMON_JAR",
    labelKey: "enums.JobType.COMMON_JAR",
    ConfigFields: JavaConfigFields,
    needsSubject: true,
  },
  CLICKHOUSE_SQL: {
    type: "CLICKHOUSE_SQL",
    labelKey: "enums.JobType.CLICKHOUSE_SQL",
    ConfigFields: SqlConfigFields,
    needsSubject: true,
  },
  MYSQL_SQL: {
    type: "MYSQL_SQL",
    labelKey: "enums.JobType.MYSQL_SQL",
    ConfigFields: SqlConfigFields,
    needsSubject: true,
  },
  HIVE_SQL: {
    type: "HIVE_SQL",
    labelKey: "enums.JobType.HIVE_SQL",
    ConfigFields: SqlConfigFields,
    needsSubject: true,
  },
  SHELL: {
    type: "SHELL",
    labelKey: "enums.JobType.SHELL",
    ConfigFields: ShellConfigFields,
    needsSubject: true,
  },
  CONDITION: {
    type: "CONDITION",
    labelKey: "enums.JobType.CONDITION",
    ConfigFields: ConditionConfigFields,
    needsSubject: false,
  },
  DEPENDENT: {
    type: "DEPENDENT",
    labelKey: "enums.JobType.DEPENDENT",
    ConfigFields: DependentConfigFields,
    needsSubject: false,
  },
  SUB_FLOW: {
    type: "SUB_FLOW",
    labelKey: "enums.JobType.SUB_FLOW",
    ConfigFields: FlowConfigFields,
    needsSubject: false,
  },
};

export function getTaskTypeDef(type: JobType): TaskTypeDef | undefined {
  return TASK_TYPE_REGISTRY[type];
}

export function taskTypeOptions(t: (k: string) => string): { value: JobType; label: string }[] {
  return JOB_TYPES.map((ty) => ({ value: ty, label: t(TASK_TYPE_REGISTRY[ty].labelKey) }));
}
