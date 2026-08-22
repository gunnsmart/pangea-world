
import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { NeuralKnowledgeEntry } from '../../sim/NeuralKnowledgeService';

interface VectorGalaxyProps {
  entries: NeuralKnowledgeEntry[];
  selectedEntry: NeuralKnowledgeEntry | null;
  onSelectEntry: (entry: NeuralKnowledgeEntry) => void;
  width?: number;
  height?: number;
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  entry: NeuralKnowledgeEntry;
  color: string;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  value: number;
}

export const VectorGalaxy: React.FC<VectorGalaxyProps> = ({ 
  entries, 
  selectedEntry, 
  onSelectEntry,
  width = 800,
  height = 600
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  const nodes: Node[] = useMemo(() => {
    const domainColors: Record<string, string> = {
      'biology': '#00ff9d',
      'physics': '#00f2ff',
      'chemistry': '#ff8c00',
      'wisdom': '#f8fafc',
      'social': '#a855f7',
      'logic': '#3b82f6'
    };

    return entries.map((entry, i) => ({
      id: entry.skill + i,
      entry,
      color: domainColors[entry.domain] || '#94a3b8'
    }));
  }, [entries]);

  const links: Link[] = useMemo(() => {
    const linksBatch: Link[] = [];
    // Link nodes that share domain or have high similarity (simulated by sequence for now)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < Math.min(i + 5, nodes.length); j++) {
        if (nodes[i].entry.domain === nodes[j].entry.domain) {
          linksBatch.push({
            source: nodes[i].id,
            target: nodes[j].id,
            value: 1
          });
        }
      }
    }
    return linksBatch;
  }, [nodes]);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g");

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom as any);

    const simulation = d3.forceSimulation<Node>(nodes)
      .force("link", d3.forceLink<Node, Link>(links).id(d => d.id).distance(50))
      .force("charge", d3.forceManyBody().strength(-100))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(20));

    const link = g.append("g")
      .attr("stroke", "rgba(255,255,255,0.05)")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", d => Math.sqrt(d.value));

    const node = g.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 0)
      .selectAll<SVGCircleElement, Node>("circle")
      .data(nodes)
      .join("circle")
      .attr("r", d => d.entry.confidence * 8 + 2)
      .attr("fill", d => d.color)
      .attr("fill-opacity", 0.6)
      .attr("class", "cursor-pointer transition-all hover:scale-150")
      .style("filter", d => `drop-shadow(0 0 5px ${d.color})`)
      .on("click", (event, d) => {
        onSelectEntry(d.entry);
      });

    node.append("title").text(d => d.entry.skill);

    // Selected state indicator
    if (selectedEntry) {
      const selectedNode = nodes.find(n => n.entry.skill === selectedEntry.skill);
      if (selectedNode) {
        g.append("circle")
          .attr("cx", selectedNode.x || 0)
          .attr("cy", selectedNode.y || 0)
          .attr("r", 15)
          .attr("fill", "none")
          .attr("stroke", "#00f2ff")
          .attr("stroke-width", 2)
          .attr("class", "pulse-ring")
          .attr("stroke-dasharray", "4 2");
      }
    }

    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as any).x)
        .attr("y1", d => (d.source as any).y)
        .attr("x2", d => (d.target as any).x)
        .attr("y2", d => (d.target as any).y);

      node
        .attr("cx", d => d.x || 0)
        .attr("cy", d => d.y || 0);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links, width, height, selectedEntry]);

  const vectorDim = nodes.length > 0 ? nodes[0].entry.content.length > 0 ? 512 : 128 : 128; // Dynamic heuristic or fallback
  // Better: Add dimension to component props or fetch from service
  
  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden glass-panel border border-primary/10">
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 pointer-events-none">
        <span className="text-[8px] font-headline font-bold text-primary/40 uppercase tracking-[0.2em]">Neural_Galaxy_Map</span>
        <span className="text-[10px] font-mono text-dim">Projection: {nodes.length > 0 ? 'High-D' : '---'} -{'>'} 2D (Force-Directed)</span>
      </div>
      
      <svg 
        ref={svgRef} 
        width={width} 
        height={height} 
        className="w-full h-full"
      />

      <style dangerouslySetInnerHTML={{ __html: `
        .pulse-ring {
          animation: d3-pulse 2s infinite linear;
        }
        @keyframes d3-pulse {
          from { stroke-dashoffset: 20; opacity: 1; }
          to { stroke-dashoffset: 0; opacity: 0.5; }
        }
      `}} />
    </div>
  );
};
