"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type OnNodesChange,
} from "@xyflow/react";
import { useLayoutEffect, useMemo } from "react";
import "@xyflow/react/dist/style.css";
import { PrerequisiteEdge } from "./PrerequisiteEdge";

const edgeTypes = { prerequisite: PrerequisiteEdge };

type GraphCanvasProps = {
  nodes: Node[];
  edges: Edge[];
  onNodeClick: (conceptId: string) => void;
  /** Optional: e.g. open assessment without hunting the side panel. */
  onNodeDoubleClick?: (conceptId: string) => void;
  /** Click an edge: typically selects the dependent concept; Shift+click selects the prerequisite. */
  onEdgeClick?: (payload: { sourceId: string; targetId: string; shiftKey: boolean }) => void;
  onNodesChange: OnNodesChange<Node>;
};

function GraphCanvasInner({
  nodes,
  edges,
  onNodeClick,
  onNodeDoubleClick,
  onEdgeClick,
  onNodesChange,
}: GraphCanvasProps) {
  const { fitView } = useReactFlow();
  const signature = useMemo(
    () =>
      `${edges.length}:${nodes
        .map((node) => `${node.id}:${node.position?.x ?? 0}:${node.position?.y ?? 0}`)
        .join("|")}`,
    [edges.length, nodes],
  );

  useLayoutEffect(() => {
    if (nodes.length === 0) return undefined;
    let frame = 0;

    const scheduleFit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        fitView({
          padding: 0.35,
          duration: 280,
          includeHiddenNodes: true,
        });
      });
    };

    scheduleFit();
    window.addEventListener("resize", scheduleFit);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", scheduleFit);
    };
  }, [fitView, nodes.length, signature]);

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden rounded-none bg-[#0b1020] lg:rounded-md">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={(_, node) => onNodeClick(node.id)}
        onNodeDoubleClick={
          onNodeDoubleClick ? (_, node) => onNodeDoubleClick(node.id) : undefined
        }
        onEdgeClick={
          onEdgeClick
            ? (_, edge) =>
                onEdgeClick({
                  sourceId: edge.source,
                  targetId: edge.target,
                  shiftKey: _.shiftKey,
                })
            : undefined
        }
        defaultEdgeOptions={{
          type: "prerequisite",
          interactionWidth: 34,
        }}
        fitView
        minZoom={0.1}
        maxZoom={2.2}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        onlyRenderVisibleElements={false}
        panOnScroll
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick={false}
        preventScrolling={false}
        attributionPosition="bottom-left"
        className="h-full w-full text-white"
      >
        <MiniMap
          className="!bg-[#11142a]"
          nodeColor="#8b5cf6"
          maskColor="rgba(5, 7, 16, 0.65)"
        />
        <Controls className="!border-white/15 !bg-[#11142a]" />
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1.2}
          color="#312e81"
        />
      </ReactFlow>
    </div>
  );
}

export function GraphCanvas(props: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
