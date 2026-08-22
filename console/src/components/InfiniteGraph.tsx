import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { AgentDiscovery } from '../services/stigmergyService';
import { cn } from '../lib/utils';

interface InfiniteGraphProps {
  discoveries: AgentDiscovery[];
}

export const InfiniteGraph: React.FC<InfiniteGraphProps> = ({ discoveries }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || discoveries.length === 0) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const nodes = discoveries.map(d => ({ ...d }));
    const links: any[] = [];

    discoveries.forEach(d => {
      d.connections.forEach(targetId => {
        if (discoveries.find(node => node.id === targetId)) {
          links.push({ source: d.id, target: targetId });
        }
      });
    });

    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(50))
      .force("charge", d3.forceManyBody().strength(-100))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg.append("g")
      .attr("stroke", "var(--border)")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 1);

    const node = svg.append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d: any) => 5 + (d.karma || 0))
      .attr("fill", (d: any) => {
        switch(d.community) {
          case 'physics': return '#3b82f6';
          case 'chemistry': return '#ef4444';
          case 'biology': return '#10b981';
          case 'engineering': return '#f59e0b';
          case 'survival': return '#8b5cf6';
          default: return '#94a3b8';
        }
      })
      .call(d3.drag<any, any>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    node.append("title")
      .text((d: any) => `${d.label}\nBy: ${d.authorName}\nKarma: ${d.karma}`);

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);
    });

    return () => simulation.stop();
  }, [discoveries]);

  return (
    <div className="w-full h-full bg-[var(--panel)] rounded-xl overflow-hidden border border-[var(--border)] relative">
      <svg ref={svgRef} className="w-full h-full" />
      <div className="absolute top-2 left-2 flex flex-wrap gap-2 pointer-events-none">
        {['physics', 'chemistry', 'biology', 'engineering', 'survival'].map(c => (
          <div key={c} className="flex items-center gap-1.5 bg-[var(--bg)] px-2 py-1 rounded-md border border-[var(--border)]">
            <div className={cn("w-1.5 h-1.5 rounded-full", 
              c === 'physics' ? 'bg-blue-500' : 
              c === 'chemistry' ? 'bg-red-500' : 
              c === 'biology' ? 'bg-green-500' : 
              c === 'engineering' ? 'bg-amber-500' : 'bg-purple-500'
            )} />
            <span className="text-[10px] font-medium text-[var(--dim)] capitalize">{c}</span>
          </div>
        ))}
      </div>
    </div>
  );
};