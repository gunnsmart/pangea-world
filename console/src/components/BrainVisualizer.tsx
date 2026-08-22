import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

import { BrainState } from '../sim/types';

interface BrainVisualizerProps {
  brainState: BrainState;
}

export const BrainVisualizer: React.FC<BrainVisualizerProps> = ({ brainState }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !brainState) return;

    const width = 360;
    const height = 180;
    const svg = d3.select(svgRef.current)
      .attr('viewBox', [0, 0, width, height]);

    svg.selectAll('*').remove();

    // 4-Column Layout
    const layerX = [width * 0.1, width * 0.35, width * 0.65, width * 0.9]; 
    
    const nodes: any[] = [];
    
    // 1. Module: Sensory (Input 202 -> Latent 64)
    const sensoryIn = brainState.lastInputs || [];
    const sensoryLatent = brainState.modules?.sensory || [];
    
    // Draw representative subset of sensory inputs (too many to draw all)
    const drawSensoryCount = 20;
    for (let i = 0; i < drawSensoryCount; i++) {
      const idx = Math.floor(i * (sensoryIn.length / drawSensoryCount));
      nodes.push({ id: `si${i}`, x: layerX[0], y: getY(i, drawSensoryCount), activity: sensoryIn[idx] || 0, color: '#00d4ff', label: 'Sensory' });
    }

    // Sensory Latent (64) - Draw subset
    const drawLatentCount = 16;
    for (let i = 0; i < drawLatentCount; i++) {
        const idx = Math.floor(i * (sensoryLatent.length / drawLatentCount));
        nodes.push({ id: `sl${i}`, x: layerX[1], y: getY(i, drawLatentCount + 4), activity: sensoryLatent[idx] || 0, color: '#00e676', label: 'Latent' });
    }

    // 2. Module: Homeostasis (Physio 15 -> Drives 16)
    const homeostasisDrives = brainState.modules?.homeostasis || [];
    const drawDriveCount = 8;
    for (let i = 0; i < drawDriveCount; i++) {
        const idx = Math.floor(i * (homeostasisDrives.length / drawDriveCount));
        // Offset Y to be below Latent or in a separate area
        nodes.push({ id: `hd${i}`, x: layerX[1], y: getY(i + 12, drawLatentCount + 4), activity: homeostasisDrives[idx] || 0, color: '#ffcc00', label: 'Drives' });
    }

    // 3. Module: Motivation (Intents 48)
    const motivationIntents = brainState.modules?.motivation || [];
    const drawIntentCount = 20;
    for (let i = 0; i < drawIntentCount; i++) {
        const idx = Math.floor(i * (motivationIntents.length / drawIntentCount));
        nodes.push({ id: `mi${i}`, x: layerX[2], y: getY(i, drawIntentCount), activity: motivationIntents[idx] || 0, color: '#f472b6', label: 'Intents' });
    }

    // 4. Module: Motor (Outputs 44)
    const motorOutputs = brainState.modules?.motor || brainState.lastOutputs || [];
    const drawOutputCount = 20;
    for (let i = 0; i < drawOutputCount; i++) {
        const idx = Math.floor(i * (motorOutputs.length / drawOutputCount));
        nodes.push({ id: `mo${i}`, x: layerX[3], y: getY(i, drawOutputCount), activity: motorOutputs[idx] || 0, color: '#ff8800', label: 'Actions' });
    }

    function getY(index: number, total: number) {
      const margin = 20;
      const spacing = (height - margin * 2) / Math.max(1, total - 1);
      if (total === 1) return height / 2;
      return margin + index * spacing;
    };

    // Draw nodes
    svg.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', d => 2 + (d.activity || 0) * 4)
      .attr('fill', d => d.activity > 0.1 ? d.color : '#1e3048')
      .attr('stroke', d => d.activity > 0.1 ? '#fff' : 'rgba(255,255,255,0.1)')
      .attr('stroke-width', 0.5)
      .style('filter', d => d.activity > 0.5 ? `drop-shadow(0 0 4px ${d.color})` : 'none');

    // Labels
    const labels = [
        { x: layerX[0], text: 'SENSORY' },
        { x: layerX[1], text: 'INTERNAL' },
        { x: layerX[2], text: 'INTENT' },
        { x: layerX[3], text: 'MOTOR' }
    ];
    svg.append('g')
        .selectAll('text')
        .data(labels)
        .join('text')
        .attr('x', d => d.x)
        .attr('y', 10)
        .attr('text-anchor', 'middle')
        .attr('fill', 'rgba(255,255,255,0.4)')
        .attr('font-size', '7px')
        .attr('font-family', 'monospace')
        .text(d => d.text);

  }, [brainState]);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
};
