import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { KNOWLEDGE_GRAPH, KnowledgeNode } from '../data/knowledgeGraph';
import { X, Info, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KnowledgeBrainProps {
  character: 'ALPHA' | 'BETA' | 'Both';
  onClose: () => void;
}

export const KnowledgeBrain: React.FC<KnowledgeBrainProps> = ({ character, onClose }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const nodes = KNOWLEDGE_GRAPH.nodes.filter(n => 
      character === 'Both' || n.character === character || n.character === 'Both'
    ).map(d => ({ ...d }));

    const nodeIds = new Set(nodes.map(n => n.id));
    const edges = KNOWLEDGE_GRAPH.edges.filter(e => 
      nodeIds.has(e.source) && nodeIds.has(e.target)
    ).map(d => ({ ...d }));

    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(edges).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(50));

    const link = svg.append("g")
      .attr("stroke", "rgba(168, 232, 255, 0.1)")
      .attr("stroke-width", 1)
      .selectAll("line")
      .data(edges)
      .join("line");

    const node = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .on("click", (event, d: any) => setSelectedNode(d))
      .call(d3.drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any);

    node.append("circle")
      .attr("r", 6)
      .attr("fill", (d: any) => 
        d.character === 'BETA' ? "#ff00f2" : 
        d.character === 'ALPHA' ? "#00f2ff" : "#3fff52"
      )
      .attr("filter", "blur(1px)");

    node.append("text")
      .text((d: any) => d.label)
      .attr("x", 12)
      .attr("y", 4)
      .attr("fill", "rgba(218, 226, 253, 0.6)")
      .attr("font-size", "10px")
      .attr("font-family", "Space Grotesk");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => simulation.stop();
  }, [character]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      <div className="flex justify-between items-center p-6 border-b border-primary/5">
        <div>
          <h2 className="text-xl font-headline font-bold tracking-tighter">
            NEURAL_KNOWLEDGE_GRAPH: {character === 'Both' ? 'SHARED_CONSCIOUSNESS' : (character === 'BETA' ? 'EVE_BASE' : 'ADAM_BASE')}
          </h2>
          <p className="text-[10px] font-headline font-bold tracking-widest text-dim uppercase mt-1">Neural patterns and core subject heuristics</p>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-white/5 rounded-full transition-colors text-dim hover:text-text"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex-1 relative flex overflow-hidden">
        <div className="flex-1 relative bg-background/40">
          <svg ref={svgRef} className="w-full h-full" />
          
          {/* Legend */}
          <div className="absolute bottom-6 left-6 flex flex-col gap-2 glass p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#ff00f2] animate-pulse" />
              <span className="text-[9px] font-headline font-bold tracking-widest text-dim uppercase">Eve Heuristics</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#00f2ff] animate-pulse" />
              <span className="text-[9px] font-headline font-bold tracking-widest text-dim uppercase">Adam Heuristics</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#3fff52] animate-pulse" />
              <span className="text-[9px] font-headline font-bold tracking-widest text-dim uppercase">Collective Data</span>
            </div>
          </div>
        </div>

        {/* Node Detail Panel */}
        <div className="w-80 glass border-l border-primary/5 p-6 flex flex-col gap-4 overflow-y-auto">
          {selectedNode ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Brain className={cn(
                    "w-4 h-4",
                    selectedNode.character === 'BETA' ? "text-[#ff00f2]" : 
                    selectedNode.character === 'ALPHA' ? "text-[#00f2ff]" : "text-[#3fff52]"
                  )} />
                  <h3 className="text-lg font-headline font-bold tracking-tighter leading-tight">{selectedNode.label}</h3>
                </div>
                <div className="text-[9px] font-headline font-bold tracking-widest text-primary/60 uppercase">
                  Category: {selectedNode.category}
                </div>
              </div>
              
              <div className="bg-surface-high/40 rounded-2xl p-5 italic text-sm text-dim leading-relaxed">
                "{selectedNode.description}"
              </div>

              <div className="space-y-4">
                <div className="text-[10px] font-headline font-bold tracking-[0.2em] text-primary/40 uppercase">Related Neural Paths</div>
                <div className="space-y-2">
                  {KNOWLEDGE_GRAPH.edges
                    .filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
                    .map((e, i) => {
                      const otherNodeId = e.source === selectedNode.id ? e.target : e.source;
                      const otherNode = KNOWLEDGE_GRAPH.nodes.find(n => n.id === otherNodeId);
                      return (
                        <div key={i} className="text-xs font-mono p-3 rounded-xl bg-white/5 border border-primary/5 flex items-center justify-between group hover:bg-white/10 transition-colors">
                          <span className="text-text/80">{otherNode?.label}</span>
                          <span className="text-[9px] font-headline font-bold tracking-tighter text-dim uppercase">{e.relation}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center">
                <Info className="w-6 h-6 text-primary/20" />
              </div>
              <p className="text-[10px] font-headline font-bold tracking-widest text-dim uppercase leading-relaxed">
                Select a neural node<br/>to analyze data
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
