import { useCallback, useEffect, useMemo } from "react";
import ReactFlow, {
  Background, Controls, MiniMap, addEdge, useEdgesState, useNodesState,
  type Node, type Edge, type Connection, MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { motion } from "framer-motion";

export type ExtractedConcept = { name: string; confidence: "strong" | "weak" | "gap"; related?: string[] };

const colorFor = (c: ExtractedConcept["confidence"]) =>
  c === "strong" ? "#F59E0B" : c === "weak" ? "#60A5FA" : "#EF4444";

export function MindMap({ concepts, extracting = false }: { concepts: ExtractedConcept[]; extracting?: boolean }) {
  const initial = useMemo(() => {
    const nodes: Node[] = concepts.map((c, i) => {
      const angle = (i / Math.max(concepts.length, 1)) * Math.PI * 2;
      const r = 110 + Math.min(40, concepts.length * 4);
      const color = colorFor(c.confidence);
      return {
        id: `n-${i}-${c.name}`,
        position: { x: 150 + Math.cos(angle) * r, y: 130 + Math.sin(angle) * r },
        data: { label: c.name },
        style: {
          background: `${color}1a`,
          border: `1.5px solid ${color}`,
          color: "#F1F5F9",
          fontFamily: "Hind Siliguri, sans-serif",
          fontSize: 11,
          padding: "6px 10px",
          borderRadius: 14,
          boxShadow: `0 0 14px ${color}66`,
        },
      };
    });
    const edges: Edge[] = [];
    concepts.forEach((c, i) => {
      (c.related ?? []).forEach((r) => {
        const target = concepts.findIndex((x) => x.name === r);
        if (target >= 0 && target !== i) {
          edges.push({
            id: `e-${i}-${target}`,
            source: `n-${i}-${c.name}`,
            target: `n-${target}-${concepts[target].name}`,
            animated: true,
            style: { stroke: "#60A5FA", strokeWidth: 1, opacity: 0.5 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#60A5FA" },
          });
        }
      });
    });
    return { nodes, edges };
  }, [concepts]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

  useEffect(() => {
    setNodes(initial.nodes);
    setEdges(initial.edges);
  }, [initial, setNodes, setEdges]);

  const onConnect = useCallback((c: Connection) => setEdges((es) => addEdge(c, es)), [setEdges]);

  return (
    <div
      className="relative w-full h-full transition-shadow duration-500"
      style={extracting ? { boxShadow: "inset 0 0 40px rgba(139,92,246,0.25)" } : undefined}
    >
      <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded-full bg-black/40 backdrop-blur border border-[var(--border)] text-[10px] font-bangla text-[var(--text-secondary)]">
        {concepts.length} ধারণা চিহ্নিত{extracting ? " • আপডেট হচ্ছে…" : ""}
      </div>
      {concepts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center text-center px-6"
        >
          <p className="text-xs text-[var(--text-secondary)]/70 font-bangla leading-relaxed">
            তুমি যখন বোঝাতে শুরু করবে,<br />ধারণাগুলো এখানে আঁকা হবে।
          </p>
        </motion.div>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
          nodesDraggable
          panOnDrag
          zoomOnScroll
        >
          <Background color="#1e293b" gap={16} size={1} />
          <Controls
            className="!bg-black/40 !border !border-[var(--border)] !rounded-lg [&>button]:!bg-transparent [&>button]:!border-0 [&>button]:!text-[var(--text-secondary)]"
            showInteractive={false}
          />
          <MiniMap pannable zoomable className="!bg-black/60 !border !border-[var(--border)]" maskColor="rgba(8,11,20,0.85)" />
        </ReactFlow>
      )}
    </div>
  );
}
