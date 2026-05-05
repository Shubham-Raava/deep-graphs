"use client";

import { memo, useState, type CSSProperties } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";

export type PrerequisiteEdgeData = {
  sourceName: string;
  targetName: string;
};

export type PrerequisiteFlowEdge = Edge<PrerequisiteEdgeData, "prerequisite">;

function PrerequisiteEdgeComponent(props: EdgeProps<PrerequisiteFlowEdge>) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    markerEnd,
    style,
    data,
    animated,
    selected,
    interactionWidth,
  } = props;

  const [hovered, setHovered] = useState(false);
  const sourceName = data?.sourceName ?? "Prerequisite";
  const targetName = data?.targetName ?? "Concept";

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 12,
  });

  const baseStyle = (style ?? {}) as CSSProperties;
  const strokeWidth =
    typeof baseStyle.strokeWidth === "number"
      ? baseStyle.strokeWidth
      : typeof baseStyle.strokeWidth === "string"
        ? Number.parseFloat(baseStyle.strokeWidth) || 2
        : 2;

  const mergedStyle: CSSProperties = {
    ...baseStyle,
    strokeWidth: hovered ? Math.max(strokeWidth + 1.25, 3.25) : strokeWidth,
    transition: "stroke-width 0.14s ease, filter 0.18s ease, opacity 0.18s ease",
    filter: hovered
      ? "drop-shadow(0 0 12px rgba(167, 139, 250, 0.75))"
      : animated
        ? "drop-shadow(0 0 8px rgba(221, 214, 254, 0.5))"
        : baseStyle.filter,
  };

  const showChip = hovered || selected;

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: "pointer" }}
    >
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={mergedStyle}
        interactionWidth={hovered ? 40 : interactionWidth ?? 32}
      />
      {showChip && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan rounded-md border border-violet-400/40 bg-[#0f1228]/95 px-2.5 py-1 text-[10px] font-medium leading-tight text-violet-100 shadow-lg shadow-violet-950/40 backdrop-blur-sm"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "none",
              maxWidth: 220,
            }}
          >
            <span className="text-slate-400">Requires</span>{" "}
            <span className="text-white">{sourceName}</span>
            <span className="text-slate-500"> → </span>
            <span className="text-violet-200">{targetName}</span>
          </div>
        </EdgeLabelRenderer>
      )}
    </g>
  );
}

export const PrerequisiteEdge = memo(PrerequisiteEdgeComponent);
