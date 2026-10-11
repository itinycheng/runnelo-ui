import { useEffect, useState } from "react";
import {
  activeEdgeStyle,
  backgroundStyle,
  captionStyle,
  dotStyle,
  edgeStyle,
  expandedTaskStyle,
  smallTextStyle,
  stateRectStyle,
  taskLabelStyle,
  taskRectStyle,
  titleStyle,
  topologyStyle,
  type VisualTone,
} from "./Login.styles";

interface TaskNode {
  id: string;
  label: string;
  status: string;
  x: number;
  y: number;
  tone: "success" | "running" | "waiting";
}

interface StateNode {
  name: string;
  x: number;
  y: number;
  tone?: "current" | "success" | "failed" | "killed";
}

const tasks: TaskNode[] = [
  { id: "extract_orders", label: "extract_orders", status: "SUCCESS", x: 64, y: 316, tone: "success" },
  { id: "quality_gate", label: "quality_gate", status: "SUCCESS", x: 64, y: 588, tone: "success" },
  { id: "publish_daily", label: "publish_daily", status: "WAITING", x: 1260, y: 316, tone: "waiting" },
  { id: "notify_owner", label: "notify_owner", status: "CREATED", x: 1260, y: 588, tone: "waiting" },
  { id: "archive_result", label: "archive_result", status: "WAITING", x: 342, y: 760, tone: "waiting" },
  { id: "emit_metrics", label: "emit_metrics", status: "CREATED", x: 998, y: 760, tone: "waiting" },
];

const dependencies = [
  { from: "extract_orders", to: "aggregate_daily", d: "M180 340 H274 V160 H470" },
  { from: "quality_gate", to: "aggregate_daily", d: "M180 612 H274 V234 H470" },
  { from: "aggregate_daily", to: "publish_daily", d: "M970 160 H1168 V340 H1260" },
  { from: "aggregate_daily", to: "notify_owner", d: "M970 234 H1168 V612 H1260" },
  { from: "quality_gate", to: "archive_result", d: "M180 612 H274 V784 H342" },
  { from: "archive_result", to: "emit_metrics", d: "M458 784 H998" },
  { from: "emit_metrics", to: "notify_owner", d: "M1114 784 H1168 V612 H1260" },
];

const states: StateNode[] = [
  { name: "CREATED", x: 500, y: 132 },
  { name: "SUBMITTED", x: 590, y: 132 },
  { name: "WAITING", x: 696, y: 132 },
  { name: "RUNNING", x: 786, y: 132, tone: "current" },
  { name: "SUCCESS", x: 884, y: 104, tone: "success" },
  { name: "FAILURE", x: 884, y: 146, tone: "failed" },
  { name: "KILLED", x: 884, y: 188, tone: "killed" },
];

const mobileStates: StateNode[] = [
  { name: "CREATED", x: 30, y: 86 },
  { name: "SUBMITTED", x: 104, y: 86 },
  { name: "WAITING", x: 194, y: 86 },
  { name: "RUNNING", x: 268, y: 86, tone: "current" },
  { name: "SUCCESS", x: 70, y: 132, tone: "success" },
  { name: "FAILURE", x: 160, y: 132, tone: "failed" },
  { name: "KILLED", x: 250, y: 132, tone: "killed" },
];

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}

function AnimatedEdge({
  d,
  active = false,
  reducedMotion = false,
}: {
  d: string;
  active?: boolean;
  reducedMotion?: boolean;
}) {
  return (
    <path style={active ? activeEdgeStyle : edgeStyle} d={d}>
      {active && !reducedMotion && (
        <animate attributeName="stroke-dashoffset" from="0" to="-52" dur="11s" repeatCount="indefinite" />
      )}
    </path>
  );
}

function StatusDot({
  cx,
  cy,
  tone,
  reducedMotion = false,
}: {
  cx: number;
  cy: number;
  tone: VisualTone;
  reducedMotion?: boolean;
}) {
  const animated = tone === "current" || tone === "running";
  return (
    <circle style={dotStyle(tone)} cx={cx} cy={cy} r="3">
      {animated && !reducedMotion && (
        <animate attributeName="opacity" values="0.42;1;0.42" dur="3.6s" repeatCount="indefinite" />
      )}
    </circle>
  );
}

function Task({ task, reducedMotion = false }: { task: TaskNode; reducedMotion?: boolean }) {
  return (
    <g data-task={task.id}>
      <rect style={taskRectStyle} x={task.x} y={task.y} width="116" height="48" rx="6" />
      <text style={taskLabelStyle} x={task.x + 14} y={task.y + 21}>
        {task.label}
      </text>
      <StatusDot cx={task.x + 102} cy={task.y + 35} tone={task.tone} reducedMotion={reducedMotion} />
      <text style={smallTextStyle} x={task.x + 14} y={task.y + 38}>
        {task.status}
      </text>
    </g>
  );
}

function LifecycleState({ state, reducedMotion = false }: { state: StateNode; reducedMotion?: boolean }) {
  const width = state.name === "SUBMITTED" ? 86 : 72;
  return (
    <g data-state={state.name}>
      <rect style={stateRectStyle(state.tone)} x={state.x} y={state.y} width={width} height="28" rx="4" />
      <text style={smallTextStyle} x={state.x + 11} y={state.y + 18}>
        {state.name}
      </text>
      {state.tone && (
        <StatusDot cx={state.x + width - 10} cy={state.y + 14} tone={state.tone} reducedMotion={reducedMotion} />
      )}
    </g>
  );
}

function MobileTopology({ reducedMotion }: { reducedMotion: boolean }) {
  const mobileTasks: TaskNode[] = [
    { id: "extract_orders", label: "extract", status: "SUCCESS", x: 18, y: 620, tone: "success" },
    { id: "publish_daily", label: "publish", status: "WAITING", x: 256, y: 620, tone: "waiting" },
    { id: "quality_gate", label: "quality", status: "SUCCESS", x: 18, y: 716, tone: "success" },
    { id: "notify_owner", label: "notify", status: "CREATED", x: 256, y: 716, tone: "waiting" },
  ];
  return (
    <svg data-layout="mobile" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid meet" style={topologyStyle(true)}>
      <g>
        <AnimatedEdge d="M136 188 H78 V620" />
        <AnimatedEdge d="M254 188 H314 V620" />
        <AnimatedEdge d="M76 668 V716" />
        <AnimatedEdge d="M314 668 V716" />
        <AnimatedEdge d="M134 740 H256" />
      </g>
      <g data-task="aggregate_daily" data-expanded="true">
        <rect style={expandedTaskStyle} x="16" y="28" width="358" height="174" rx="8" />
        <text style={titleStyle} x="30" y="54">
          aggregate_daily
        </text>
        <AnimatedEdge d="M102 100 H104 M190 100 H194 M266 100 H268" active reducedMotion={reducedMotion} />
        <AnimatedEdge d="M340 100 H352 V122 H106" />
        <path data-transition-target="SUCCESS" style={edgeStyle} d="M106 122 V132" />
        <path data-transition-target="FAILURE" style={edgeStyle} d="M196 122 V132" />
        <path data-transition-target="KILLED" style={edgeStyle} d="M286 122 V132" />
        {mobileStates.map((state) => (
          <LifecycleState key={state.name} state={state} reducedMotion={reducedMotion} />
        ))}
      </g>
      {mobileTasks.map((task) => (
        <Task key={task.id} task={task} reducedMotion={reducedMotion} />
      ))}
    </svg>
  );
}

function DesktopTopology({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <svg data-layout="desktop" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid meet" style={topologyStyle(false)}>
      <g>
        {dependencies.map((edge, index) => (
          <path
            key={`${edge.from}-${edge.to}`}
            data-edge="dependency"
            data-from={edge.from}
            data-to={edge.to}
            style={index === 0 ? activeEdgeStyle : edgeStyle}
            d={edge.d}
          >
            {index === 0 && !reducedMotion && (
              <animate attributeName="stroke-dashoffset" from="0" to="-52" dur="11s" repeatCount="indefinite" />
            )}
          </path>
        ))}
      </g>

      <g data-task="aggregate_daily" data-expanded="true">
        <rect style={expandedTaskStyle} x="470" y="70" width="500" height="192" rx="8" />
        <text style={titleStyle} x="496" y="100">
          aggregate_daily
        </text>
        <text style={captionStyle} x="810" y="100">
          representative lifecycle
        </text>
        <AnimatedEdge d="M572 146 H590 M676 146 H696 M768 146 H786" active reducedMotion={reducedMotion} />
        <AnimatedEdge d="M858 146 H872 V118 H884 M872 146 V160 H884 M872 146 V202 H884" />
        {states.map((state) => (
          <LifecycleState key={state.name} state={state} reducedMotion={reducedMotion} />
        ))}
      </g>

      {tasks.map((task) => (
        <Task key={task.id} task={task} reducedMotion={reducedMotion} />
      ))}
    </svg>
  );
}

export default function LoginBackground() {
  const mobile = useMediaQuery("(max-width: 760px)");
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  return (
    <div style={backgroundStyle} data-testid="login-background" aria-hidden="true">
      {mobile ? <MobileTopology reducedMotion={reducedMotion} /> : <DesktopTopology reducedMotion={reducedMotion} />}
    </div>
  );
}
