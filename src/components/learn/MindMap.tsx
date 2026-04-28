import { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background, Controls, MiniMap, addEdge, useEdgesState, useNodesState,
  Handle, Position, ReactFlowProvider, useReactFlow,
  type Node, type Edge, type Connection, type NodeProps, type NodeMouseHandler, MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { AnimatePresence, motion } from "framer-motion";
import { X, Sparkles, Link2, Target } from "lucide-react";

export type ExtractedConcept = { name: string; confidence: "strong" | "weak" | "gap"; reason?: string; related?: string[] };

const colorFor = (c: ExtractedConcept["confidence"]) =>
  c === "strong" ? "#F59E0B" : c === "weak" ? "#60A5FA" : "#EF4444";

const labelFor = (c: ExtractedConcept["confidence"]) =>
  c === "strong" ? "শক্তিশালী" : c === "weak" ? "দুর্বল" : "ফাঁক";

type ConceptNodeData = {
  label: string;
  color: string;
  reason?: string;
  confidence?: ExtractedConcept["confidence"];
  selected?: boolean;
  onDelete?: (name: string) => void;
};

function ConceptNode({ data }: NodeProps<ConceptNodeData>) {
  const verdictLabel = data.confidence
    ? data.confidence === "strong" ? "শক্তিশালী"
      : data.confidence === "weak" ? "দুর্বল" : "ফাঁক"
    : null;
  return (
    <div
      className="group relative font-bangla text-[12px] leading-tight transition-all duration-300 hover:scale-[1.04]"
      style={{
        background: `linear-gradient(135deg, ${data.color}26, ${data.color}0d)`,
        border: `${data.selected ? 2 : 1.5}px solid ${data.color}`,
        color: "#F8FAFC",
        padding: data.reason ? "8px 14px 9px" : "8px 14px",
        paddingRight: data.onDelete ? 26 : 14,
        borderRadius: data.reason ? 14 : 999,
        maxWidth: 230,
        boxShadow: data.selected
          ? `0 0 28px ${data.color}cc, inset 0 0 14px ${data.color}33`
          : `0 0 18px ${data.color}55, inset 0 0 12px ${data.color}1a`,
        backdropFilter: "blur(6px)",
        transform: data.selected ? "scale(1.06)" : undefined,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: "none" }} />
      <div className="flex items-center gap-1.5">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: data.color, boxShadow: `0 0 8px ${data.color}` }}
        />
        <span className="font-medium truncate">{data.label}</span>
        {verdictLabel && (
          <span
            className="ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide"
            style={{ background: `${data.color}22`, color: data.color, border: `1px solid ${data.color}55` }}
          >
            {verdictLabel}
          </span>
        )}
      </div>
      {data.reason && (
        <p
          className="mt-1 text-[10px] leading-snug text-white/70"
          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
          title={data.reason}
        >
          {data.reason}
        </p>
      )}
      {data.onDelete && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); data.onDelete?.(data.label); }}
          aria-label={`Remove ${data.label}`}
          title="Remove concept"
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-black/70 border border-white/20 text-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/90 hover:text-white transition-opacity"
        >
          <X className="w-2.5 h-2.5" strokeWidth={3} />
        </button>
      )}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: "none" }} />
    </div>
  );
}

const nodeTypes = { concept: ConceptNode };

function MindMapInner({
  concepts,
  extracting = false,
  onDelete,
}: {
  concepts: ExtractedConcept[];
  extracting?: boolean;
  onDelete?: (name: string) => void;
}) {
  const { setCenter, getNode } = useReactFlow();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const initial = useMemo(() => {
    const nodes: Node<ConceptNodeData>[] = concepts.map((c, i) => {
      const angle = (i / Math.max(concepts.length, 1)) * Math.PI * 2;
      const r = 150 + Math.min(80, concepts.length * 8);
      const color = colorFor(c.confidence);
      return {
        id: `n-${i}-${c.name}`,
        type: "concept",
        position: { x: 180 + Math.cos(angle) * r, y: 160 + Math.sin(angle) * r },
        data: { label: c.name, color, reason: c.reason, confidence: c.confidence, onDelete },
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
  }, [concepts, onDelete]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

  useEffect(() => {
    setNodes(initial.nodes.map((n) => ({ ...n, data: { ...n.data, selected: n.id === selectedId } })));
    setEdges(initial.edges);
  }, [initial, selectedId, setNodes, setEdges]);

  const onConnect = useCallback((c: Connection) => setEdges((es) => addEdge(c, es)), [setEdges]);

  const selectedConcept = useMemo(() => {
    if (!selectedId) return null;
    const idx = concepts.findIndex((_, i) => `n-${i}-${concepts[i].name}` === selectedId);
    return idx >= 0 ? { concept: concepts[idx], index: idx } : null;
  }, [selectedId, concepts]);

  const focusNode = useCallback((id: string) => {
    const node = getNode(id);
    if (node) {
      setCenter(node.position.x + 60, node.position.y + 20, { zoom: 1.5, duration: 800 });
    }
  }, [getNode, setCenter]);

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    setSelectedId(node.id);
    focusNode(node.id);
  }, [focusNode]);

  const onPaneClick = useCallback(() => setSelectedId(null), []);

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
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
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

      <AnimatePresence>
        {selectedConcept && (
          <motion.div
            key={selectedId}
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 240 }}
            className="absolute top-0 right-0 h-full w-[280px] max-w-[80%] z-20 bg-black/70 backdrop-blur-xl border-l border-[var(--border)] p-4 overflow-y-auto font-bangla"
            style={{ boxShadow: `-12px 0 40px ${colorFor(selectedConcept.concept.confidence)}33` }}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    background: colorFor(selectedConcept.concept.confidence),
                    boxShadow: `0 0 10px ${colorFor(selectedConcept.concept.confidence)}`,
                  }}
                />
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                  {labelFor(selectedConcept.concept.confidence)}
                </span>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 text-white/70 flex items-center justify-center transition-colors"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <h3 className="text-lg text-white font-semibold mb-3 text-balance leading-snug">
              {selectedConcept.concept.name}
            </h3>

            <div className="space-y-3 text-xs text-[var(--text-secondary)]">
              <div className="flex items-start gap-2">
                <Target className="w-3.5 h-3.5 mt-0.5 text-amber-400 shrink-0" />
                <p className="leading-relaxed">
                  এই ধারণাটি তোমার ব্যাখ্যা থেকে চিহ্নিত হয়েছে।
                  {selectedConcept.concept.confidence === "weak" && " আরও অনুশীলন প্রয়োজন।"}
                  {selectedConcept.concept.confidence === "gap" && " এটি একটি ফাঁক — শিখতে হবে।"}
                  {selectedConcept.concept.confidence === "strong" && " তুমি এটি ভালো বুঝেছ।"}
                </p>
              </div>

              {selectedConcept.concept.related && selectedConcept.concept.related.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2 text-white/80">
                    <Link2 className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-semibold">সংযুক্ত ধারণা</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedConcept.concept.related.map((r) => {
                      const idx = concepts.findIndex((x) => x.name === r);
                      const id = idx >= 0 ? `n-${idx}-${r}` : null;
                      return (
                        <button
                          key={r}
                          disabled={!id}
                          onClick={() => id && (setSelectedId(id), focusNode(id))}
                          className="px-2 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-white/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {r}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-white/5 flex items-center gap-2 text-[10px] text-white/50">
                <Sparkles className="w-3 h-3" />
                নোডে ক্লিক করে আরও বিস্তারিত দেখো
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MindMap(props: {
  concepts: ExtractedConcept[];
  extracting?: boolean;
  onDelete?: (name: string) => void;
}) {
  return (
    <ReactFlowProvider>
      <MindMapInner {...props} />
    </ReactFlowProvider>
  );
}
