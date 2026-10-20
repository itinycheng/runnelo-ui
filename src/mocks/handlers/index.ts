import type { RequestHandler } from "msw";
import { authHandlers } from "./auth";
import { dashboardHandlers } from "./dashboard";
import { workflowHandlers } from "./job";
import { adminHandlers } from "./admin";
import { resourceHandlers } from "./resource";
import { auditHandlers } from "./audit";
import { runHandlers } from "./run";
import { alertRuleHandlers } from "./alert";
import { queryHandlers } from "./query";
import { workspaceHandlers } from "./workspace";
import { jobFlowHandlers } from "./jobFlow";
import { pickerHandlers } from "./picker";
import { environmentHandlers } from "./environment";

export const handlers: RequestHandler[] = [
  ...authHandlers,
  ...environmentHandlers,
  ...dashboardHandlers,
  ...workflowHandlers,
  ...resourceHandlers,
  ...adminHandlers,
  ...auditHandlers,
  ...runHandlers,
  ...alertRuleHandlers,
  ...queryHandlers,
  ...workspaceHandlers,
  ...pickerHandlers,
  ...jobFlowHandlers,
];
