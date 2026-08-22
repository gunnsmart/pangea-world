
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { HumanState, Relationship } from '../sim/types';

interface FamilyTreeProps {
  humans: HumanState[];
}

export const FamilyTree: React.FC<FamilyTreeProps> = ({ humans }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || humans.length === 0) return;

    const width = 800;
    const height = 500;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const nodes = humans.map(h => ({ ...h }));
    const links: any[] = [];

    // Create links based on affinity > 60
    humans.forEach(hA => {
      Object.entries(hA.emotions.relationships).forEach(([targetId, relData]) => {
        const rel = relData as Relationship;
        if (rel.affinity > 60) {
          const target = humans.find(h => h.id === targetId);
          if (target) {
            links.push({
              source: hA.id,
              target: targetId,
              value: rel.affinity
            });
          }
        }
      });
    });

    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX(width / 2).strength(0.1))
      .force("y", d3.forceY(height / 2).strength(0.1));

    const link = svg.append("g")
      .attr("stroke", "#rgba(59, 130, 246, 0.2)")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", (d: any) => Math.sqrt(d.value - 60));

    const node = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(d3.drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    node.append("circle")
      .attr("r", 20)
      .attr("fill", "rgba(59, 130, 246, 0.1)")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 1);

    node.append("text")
      .text((d: any) => d.name)
      .attr("x", 0)
      .attr("y", 4)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("font-size", "10px")
      .attr("font-family", "monospace")
      .attr("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
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
  }, [humans]);

  return (
    <div className="glass rounded-3xl p-6 border border-white/5 relative overflow-hidden">
        <div className="absolute top-4 right-6 text-[8px] font-mono text-dim uppercase tracking-[0.2em] z-10">Social Topology :: v1.0</div>
        <svg 
            ref={svgRef} 
            viewBox="0 0 800 500" 
            className="w-full h-[400px] cursor-move"
        />
    </div>
  );
};
