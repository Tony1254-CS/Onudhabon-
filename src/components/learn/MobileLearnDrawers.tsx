import { useState } from "react";
import { Menu, Brain } from "lucide-react";
import { MobileSheet } from "@/components/learn/MobileSheet";
import { LeftPanel, type ConceptNode } from "@/components/learn/LeftPanel";
import { MindMap, type ExtractedConcept } from "@/components/learn/MindMap";
import { CognitivePanel } from "@/components/learn/CognitivePanel";
import type { CognitiveState } from "@/hooks/useCognitiveState";

export function MobileLearnDrawers({
  topic, onTopic, nodes, concepts, cognitiveState, onDeleteConcept,
}: {
  topic: string;
  onTopic: (t: string) => void;
  nodes: ConceptNode[];
  concepts: ExtractedConcept[];
  cognitiveState: CognitiveState;
  onDeleteConcept?: (name: string) => void;
}) {
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setLeftOpen(true)}
        aria-label="topics"
        className="lg:hidden fixed left-3 top-[72px] z-40 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#0B0F1B]/80 text-white/80 backdrop-blur hover:bg-white/10"
      >
        <Menu className="h-5 w-5" />
      </button>
      <button
        onClick={() => setRightOpen(true)}
        aria-label="mind map"
        className="xl:hidden fixed right-3 bottom-24 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-300 backdrop-blur hover:bg-amber-400/20"
        style={{ boxShadow: "0 0 24px rgba(245,158,11,0.25)" }}
      >
        <Brain className="h-5 w-5" />
      </button>
      <MobileSheet open={leftOpen} onClose={() => setLeftOpen(false)} side="left" title="বিষয় ও ধারণা">
        <LeftPanel topic={topic} onTopic={(t) => { onTopic(t); setLeftOpen(false); }} nodes={nodes} mobile />
      </MobileSheet>
      <MobileSheet open={rightOpen} onClose={() => setRightOpen(false)} side="bottom" title="Live Mind Map">
        <div className="flex flex-col h-full">
          <div className="flex-1 min-h-[280px]"><MindMap concepts={concepts} onDelete={onDeleteConcept} /></div>
          <div className="border-t border-white/10"><CognitivePanel state={cognitiveState} /></div>
        </div>
      </MobileSheet>
    </>
  );
}
