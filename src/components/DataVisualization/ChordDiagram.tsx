'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { arc } from 'd3-shape';
import { useVisualizationData } from './shared/useVisualizationData';
import { VisualizationContainer } from './shared/VisualizationContainer';
import { DataInsightPanel } from './shared/DataInsightPanel';
import { QuestionSelector } from './shared/QuestionSelector';
import { 
  processChordData, 
  chordConfig, 
  cyclingModes, 
  getChordColor,
  chordAnimations,
  filterConnectedCategories,
  type ChordMatrix,
  type ChordGroup,
  type ChordLink
} from './shared/chordUtils';
import { useAppContext } from '@/lib/context/AppContext';
import GlobalControlsNav from '@/components/shared/GlobalControlsNav';
import { getYearsCategory } from './shared/colorUtils';

interface ChordDiagramProps {
  width?: number;
  height?: number;
  autoPlay?: boolean;
  onRelationshipChange?: (source: string, target: string) => void;
  enableRotation?: boolean;
  showAllConnections?: boolean;
}

// Helper to get color for a node using global context
function getNodeColor(nodeName: string, category: string, globalColors: any): string {
  if (category === 'years_at_medtronic') {
    return globalColors.years_at_medtronic?.[nodeName] || '#FF6B6B';
  }
  
  // Use global colors if available, otherwise fallback to defaults
  if (category === 'learning_style') {
    return globalColors.learning_style?.[nodeName] || '#60a5fa';
  }
  if (category === 'peak_performance') {
    return globalColors.peak_performance?.[nodeName] || '#4F8EF7';
  }
  if (category === 'motivation') {
    return globalColors.motivation?.[nodeName] || '#9467bd';
  }
  if (category === 'shaped_by') {
    return globalColors.shaped_by?.[nodeName] || '#1f77b4';
  }
  return '#8884d8';
}

export default function ChordDiagram({
  width = 1100,
  height = 800,
  autoPlay = true,
  onRelationshipChange,
  enableRotation = true,
  showAllConnections = false,
}: ChordDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { data, isLoading, error } = useVisualizationData();
  const [currentSource, setCurrentSource] = useState('years_at_medtronic');
  const [currentTarget, setCurrentTarget] = useState('learning_style');
  const [insights, setInsights] = useState<Array<{ title: string; value: string; description?: string }>>([]);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null);
  const { settings } = useAppContext();
  const [lastCategoryChange, setLastCategoryChange] = useState<{ source: string; target: string }>({ source: currentSource, target: currentTarget });

  // Define available fields for the selector
  const availableFields = [
    { value: 'years_at_medtronic', label: 'Years at Medtronic' },
    { value: 'peak_performance', label: 'Peak Performance' },
    { value: 'learning_style', label: 'Learning Style' },
    { value: 'motivation', label: 'Motivation' },
    { value: 'shaped_by', label: 'Shaped By' }
  ];

  // Typography constants (reuse from alluvial)
  const labelFontSize = 18;
  const labelFontWeight = 700;
  const labelColor = '#170F5F';
  const labelFontFamily = 'Avenir Next World, -apple-system, BlinkMacSystemFont, "SF Pro", "Roboto", sans-serif';

  // Auto-cycling logic
  useEffect(() => {
    if (!autoPlay || !settings.isAutoPlayEnabled) return;

    const interval = setInterval(() => {
      const currentModeIndex = cyclingModes.findIndex(
        mode => mode.source === currentSource && mode.target === currentTarget
      );
      const nextModeIndex = (currentModeIndex + 1) % cyclingModes.length;
      const nextMode = cyclingModes[nextModeIndex];
      
      setCurrentSource(nextMode.source);
      setCurrentTarget(nextMode.target);
      setLastCategoryChange({ source: nextMode.source, target: nextMode.target });
      onRelationshipChange?.(nextMode.source, nextMode.target);
    }, settings.autoPlaySpeed || 6000); // Use global setting

    return () => clearInterval(interval);
  }, [autoPlay, onRelationshipChange, currentSource, currentTarget, settings.isAutoPlayEnabled, settings.autoPlaySpeed]);

  // Gentle rotation during auto-play
  useEffect(() => {
    if (!autoPlay || !enableRotation || !settings.isAutoPlayEnabled) return;

    const interval = setInterval(() => {
      setRotationAngle(prev => (prev + 0.5) % 360);
    }, 100);

    return () => clearInterval(interval);
  }, [autoPlay, enableRotation, settings.isAutoPlayEnabled]);

  // Render circular chord diagram
  useEffect(() => {
    if (!svgRef.current || !data.length || isLoading) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    // Filter data based on global settings
    const filteredData = settings.useTestData 
      ? data 
      : data.filter(item => !(item as any).test_data);

    const svg = d3.select(svgRef.current);
    
    // Add margins to prevent cropping
    const margin = { top: 60, right: 60, bottom: 80, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const radius = Math.min(chartWidth, chartHeight) / 2 - 100;

    // Create definitions for gradients
    const defs = svg.append('defs');

    // Define fixed order for years at Medtronic
    const YEARS_GROUPS = ['0-5', '6-10', '11-15', '16-20', '20+'];

    // Get unique values for left and right sides, using fixed order for years
    const leftValues = currentSource === 'years_at_medtronic'
      ? YEARS_GROUPS
      : Array.from(new Set(filteredData.map(d => (d as any)[currentSource]))).filter(Boolean);
    const rightValues = currentTarget === 'years_at_medtronic'
      ? YEARS_GROUPS
      : Array.from(new Set(filteredData.map(d => (d as any)[currentTarget]))).filter(Boolean);

    // Process data for chord layout
    const chordData = processChordData(filteredData, currentSource, currentTarget);
    
    // Separate source and target categories
    const sourceCategories = new Set<string>();
    const targetCategories = new Set<string>();
    
    filteredData.forEach((d: any) => {
      if (currentSource === 'years_at_medtronic') {
        sourceCategories.add(getYearsCategory(d.years_at_medtronic || 0));
      } else {
        sourceCategories.add(d[currentSource] || 'Unknown');
      }
      
      if (currentTarget === 'years_at_medtronic') {
        targetCategories.add(getYearsCategory(d.years_at_medtronic || 0));
      } else {
        targetCategories.add(d[currentTarget] || 'Unknown');
      }
    });

    // Convert to arrays and sort
    const sourceArray = Array.from(sourceCategories).sort() as string[];
    const targetArray = Array.from(targetCategories).sort() as string[];

    // Calculate totals for each category
    const leftTotals = sourceArray.map(cat => 
      filteredData.filter((d: any) => {
        const value = currentSource === 'years_at_medtronic' 
          ? getYearsCategory(d.years_at_medtronic || 0) 
          : d[currentSource];
        return value === cat;
      }).length
    );
    
    const rightTotals = targetArray.map(cat => 
      filteredData.filter((d: any) => {
        const value = currentTarget === 'years_at_medtronic' 
          ? getYearsCategory(d.years_at_medtronic || 0) 
          : d[currentTarget];
        return value === cat;
      }).length
    );

    const leftTotalSum = leftTotals.reduce((sum, val) => sum + val, 0);
    const rightTotalSum = rightTotals.reduce((sum, val) => sum + val, 0);

    // Create connection matrix
    const connectionMatrix = sourceArray.map(sourceCat => 
      targetArray.map(targetCat => {
        return filteredData.filter((d: any) => {
          const source = currentSource === 'years_at_medtronic' 
            ? getYearsCategory(d.years_at_medtronic || 0) 
            : d[currentSource];
          const target = currentTarget === 'years_at_medtronic' 
            ? getYearsCategory(d.years_at_medtronic || 0) 
            : d[currentTarget];
          return source === sourceCat && target === targetCat;
        }).length;
      })
    );

    // Check if this is a category change that should trigger animation
    const isCategoryChange = lastCategoryChange.source !== currentSource || lastCategoryChange.target !== currentTarget;

    // --- True left/right bipartite layout ---
    // Left arcs: 180°+gap to 360°-gap (Math.PI+gap to 2*Math.PI-gap)
    // Right arcs: 0+gap to 180°-gap (0+gap to Math.PI-gap)
    const arcGap = Math.PI * 0.06; // ~11° gap at top and bottom
    const leftStart = Math.PI + arcGap;      // 180° + gap
    const leftEnd = 2 * Math.PI - arcGap;    // 360° - gap
    const rightStart = 0 + arcGap;           // 0° + gap
    const rightEnd = Math.PI - arcGap;       // 180° - gap
    const leftArcSpan = leftEnd - leftStart;     // 180° - 2*gap
    const rightArcSpan = rightEnd - rightStart;  // 180° - 2*gap

    // Assign arc angles for left arcs (years_at_medtronic: equal spacing)
    let leftAngle = leftStart;
    const leftArcs = leftValues.map((value, i) => {
      const count = filteredData.filter(d =>
        currentSource === 'years_at_medtronic'
          ? getYearsCategory(d.years_at_medtronic || 0) === value
          : (d as any)[currentSource] === value
      ).length;
      // Equal arc span for each group if years_at_medtronic
      const arcSpan = currentSource === 'years_at_medtronic'
        ? leftArcSpan / leftValues.length
        : leftArcSpan * (count / (leftTotalSum || 1));
      const startAngle = leftAngle;
      const endAngle = leftAngle + arcSpan;
      leftAngle = endAngle;
      const color = getNodeColor(value, currentSource, settings.categoryColors);
      const opacity = count === 0 ? 0.15 : 0.8;
      return { name: value, value: count, startAngle, endAngle, color, opacity };
    });

    // Assign arc angles for right arcs (years_at_medtronic: equal spacing)
    let rightAngle = rightStart;
    const rightArcs = rightValues.map((value, i) => {
      const count = filteredData.filter(d =>
        currentTarget === 'years_at_medtronic'
          ? getYearsCategory(d.years_at_medtronic || 0) === value
          : (d as any)[currentTarget] === value
      ).length;
      // Equal arc span for each group if years_at_medtronic
      const arcSpan = currentTarget === 'years_at_medtronic'
        ? rightArcSpan / rightValues.length
        : rightArcSpan * (count / (rightTotalSum || 1));
      const startAngle = rightAngle;
      const endAngle = rightAngle + arcSpan;
      rightAngle = endAngle;
      const color = getNodeColor(value, currentTarget, settings.categoryColors);
      const opacity = count === 0 ? 0.15 : 0.8;
      return { name: value, value: count, startAngle, endAngle, color, opacity };
    });

    // Draw arcs (use per-arc opacity)
    const arcGen = d3.arc()
      .innerRadius(radius * 0.8)
      .outerRadius(radius * 0.9)
      .cornerRadius((d: any) => {
        // Only round the outer corners (outerRadius), not the inner
        // D3 v7+ supports cornerRadius as a function
        // We'll return 0 for inner, 8 for outer
        // But d3.arc() only supports one value, so we need to use custom path if we want true squared inner corners
        // As a workaround, set cornerRadius to 0 if the arc is small, else 8
        return 0;
      });
    
    // Position the chart group with margins to prevent cropping
    const g = svg.append('g').attr('transform', `translate(${margin.left + chartWidth / 2}, ${margin.top + chartHeight / 2})`);

    // Add gradients for arcs
    leftArcs.forEach((arc, i) => {
      const baseColor = arc.color;
      const lighterColor = d3.color(baseColor)?.brighter(0.3).toString() || baseColor;
      defs.append('linearGradient')
        .attr('id', `left-arc-gradient-${i}`)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', 0)
        .attr('y2', 1)
        .selectAll('stop')
        .data([
          { offset: '0%', color: baseColor },
          { offset: '100%', color: lighterColor }
        ])
        .enter()
        .append('stop')
        .attr('offset', d => d.offset)
        .attr('stop-color', d => d.color);
    });
    rightArcs.forEach((arc, i) => {
      const baseColor = arc.color;
      const lighterColor = d3.color(baseColor)?.brighter(0.3).toString() || baseColor;
      defs.append('linearGradient')
        .attr('id', `right-arc-gradient-${i}`)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', 0)
        .attr('y2', 1)
        .selectAll('stop')
        .data([
          { offset: '0%', color: baseColor },
          { offset: '100%', color: lighterColor }
        ])
        .enter()
        .append('stop')
        .attr('offset', d => d.offset)
        .attr('stop-color', d => d.color);
    });
    g.selectAll('path.left-arc')
      .data(leftArcs)
      .enter()
      .append('path')
      .attr('class', 'left-arc')
      .attr('d', d => arcGen({ startAngle: d.startAngle, endAngle: d.endAngle } as any))
      .attr('fill', (d, i) => `url(#left-arc-gradient-${i})`)
      .attr('opacity', d => d.opacity)
      .on('mouseenter', function(event, d) {
        if (d.value === 0) return;
        setTooltip({
          x: event.pageX,
          y: event.pageY,
          content: (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{(d.name || 'Unknown').toString().replace(/_/g, ' ')}</div>
              <div>Count: {d.value}</div>
            </div>
          )
        });
      })
      .on('mouseleave', () => setTooltip(null));
    g.selectAll('path.right-arc')
      .data(rightArcs)
      .enter()
      .append('path')
      .attr('class', 'right-arc')
      .attr('d', d => arcGen({ startAngle: d.startAngle, endAngle: d.endAngle } as any))
      .attr('fill', (d, i) => `url(#right-arc-gradient-${i})`)
      .attr('opacity', d => d.opacity)
      .on('mouseenter', function(event, d) {
        if (d.value === 0) return;
        setTooltip({
          x: event.pageX,
          y: event.pageY,
          content: (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{(d.name || 'Unknown').toString().replace(/_/g, ' ')}</div>
              <div>Count: {d.value}</div>
            </div>
          )
        });
      })
      .on('mouseleave', () => setTooltip(null));

    // Draw ribbons for connections (distributed along arc, proportional thickness)
    // Use d3.ribbon() for each connection, but set the width by using the full segment for each connection
    const ribbonGen = d3.ribbon().radius(radius * 0.8);
    const connections = [];
    for (let i = 0; i < sourceArray.length; i++) {
      for (let j = 0; j < targetArray.length; j++) {
        const value = connectionMatrix[i][j];
        if (value > 0) {
          // Find the segment for this connection on both arcs
          const leftSeg = leftArcs[i];
          const rightSeg = rightArcs[j];
          // Compute arc midpoints for gradient direction
          const leftMidAngle = (leftSeg.startAngle + leftSeg.endAngle) / 2 - Math.PI / 2;
          const rightMidAngle = (rightSeg.startAngle + rightSeg.endAngle) / 2 - Math.PI / 2;
          const leftX = Math.cos(leftMidAngle) * radius * 0.8;
          const leftY = Math.sin(leftMidAngle) * radius * 0.8;
          const rightX = Math.cos(rightMidAngle) * radius * 0.8;
          const rightY = Math.sin(rightMidAngle) * radius * 0.8;
          // Add gradient for this ribbon
          const leftColor = leftArcs[i].color || d3.schemeCategory10[i % 10];
          const rightColor = rightArcs[j].color || d3.schemeCategory10[(j + 5) % 10];
          defs.append('linearGradient')
            .attr('id', `ribbon-gradient-${i}-${j}`)
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', leftX)
            .attr('y1', leftY)
            .attr('x2', rightX)
            .attr('y2', rightY)
            .selectAll('stop')
            .data([
              { offset: '0%', color: leftColor },
              { offset: '100%', color: rightColor }
            ])
            .enter()
            .append('stop')
            .attr('offset', d => d.offset)
            .attr('stop-color', d => d.color);
          connections.push({
            source: {
              startAngle: leftSeg.startAngle,
              endAngle: leftSeg.endAngle,
              index: i
            },
            target: {
              startAngle: rightSeg.startAngle,
              endAngle: rightSeg.endAngle,
              index: j
            },
            value,
            left: leftArcs[i],
            right: rightArcs[j],
            gradientId: `ribbon-gradient-${i}-${j}`
          });
        }
      }
    }
    g.selectAll('path.ribbon')
      .data(connections)
      .enter()
      .append('path')
      .attr('class', 'ribbon')
      .attr('d', function(d) { const path = ribbonGen({ source: d.source, target: d.target } as any); return typeof path === 'string' ? path : ''; })
      .attr('fill', d => `url(#${d.gradientId})`)
      .attr('opacity', 0.6)
      .on('mouseenter', function(event, d) {
        setTooltip({
          x: event.pageX,
          y: event.pageY,
          content: (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                {(d.left.name || 'Unknown').toString().replace(/_/g, ' ')} ↔ {(d.right.name || 'Unknown').toString().replace(/_/g, ' ')}
              </div>
              <div>Connections: {d.value}</div>
            </div>
          )
        });
      })
      .on('mouseleave', () => setTooltip(null));

    // --- Label placement: horizontal at arc midpoint ---
    const labelRadius = radius * 1.15; // Slightly reduce label radius to prevent cropping
    const labelGroup = svg.append('g').attr('transform', `translate(${margin.left + chartWidth / 2}, ${margin.top + chartHeight / 2})`);
    
    // Add labels with better positioning logic
    labelGroup.selectAll('text.left-label')
      .data(leftArcs)
      .enter()
      .append('text')
      .attr('class', 'left-label')
      .attr('x', d => labelRadius * Math.cos(((d.startAngle + d.endAngle) / 2) - Math.PI / 2))
      .attr('y', d => labelRadius * Math.sin(((d.startAngle + d.endAngle) / 2) - Math.PI / 2))
      .attr('text-anchor', 'end')
      .attr('alignment-baseline', 'middle')
      .style('font-family', labelFontFamily)
      .style('font-weight', 'bold')
      .style('font-size', '18px') // Slightly smaller font
      .style('fill', labelColor)
      .style('text-transform', 'uppercase')
      .text(d => (d.name || 'Unknown').toString().replace(/_/g, ' '));
    
    labelGroup.selectAll('text.right-label')
      .data(rightArcs)
      .enter()
      .append('text')
      .attr('class', 'right-label')
      .attr('x', d => labelRadius * Math.cos(((d.startAngle + d.endAngle) / 2) - Math.PI / 2))
      .attr('y', d => labelRadius * Math.sin(((d.startAngle + d.endAngle) / 2) - Math.PI / 2))
      .attr('text-anchor', 'start')
      .attr('alignment-baseline', 'middle')
      .style('font-family', labelFontFamily)
      .style('font-weight', 'bold')
      .style('font-size', '18px') // Slightly smaller font
      .style('fill', labelColor)
      .style('text-transform', 'uppercase')
      .text(d => (d.name || 'Unknown').toString().replace(/_/g, ' '));

    // Update insights
    const totalConnections = connections.reduce((sum, d) => sum + d.value, 0);
    const strongestConnection = connections.length > 0 
      ? connections.reduce((max, d) => d.value > max.value ? d : max, connections[0])
      : null;
    setInsights([
      { title: 'Total Responses', value: filteredData.length.toString() },
      { title: 'Current View', value: `${currentSource} ↔ ${currentTarget}` },
      strongestConnection
        ? { 
            title: 'Strongest Connection', 
            value: `${strongestConnection.left.name || 'Unknown'} ↔ ${strongestConnection.right.name || 'Unknown'}`, 
            description: `${strongestConnection.value} connections` 
          }
        : { title: 'Strongest Connection', value: 'No connections found', description: '' },
      { title: 'Total Connections', value: totalConnections.toString() },
    ]);

  }, [data, currentSource, currentTarget, rotationAngle, settings.useTestData, settings.categoryColors, isLoading, lastCategoryChange]);

  // Tooltip rendering
  const tooltipEl = tooltip ? (
    <div
      style={{
        position: 'absolute',
        left: tooltip.x + 16,
        top: tooltip.y + 16,
        background: 'rgba(20,20,30,0.98)',
        color: '#fff',
        padding: '10px 16px',
        borderRadius: 8,
        pointerEvents: 'none',
        zIndex: 100,
        fontFamily: 'Avenir Next World, sans-serif',
        fontWeight: 600,
        fontSize: 16,
        boxShadow: '0 4px 24px 0 rgba(16, 16, 235, 0.12)',
        maxWidth: 320,
      }}
      role="tooltip"
      aria-live="polite"
    >
      {tooltip.content}
    </div>
  ) : null;

  // Apply theme based on global settings
  const themeClass = settings.isDarkMode ? 'dark' : '';
  const backgroundColor = settings.isDarkMode ? '#1a1a1a' : '#ffffff';
  const textColor = settings.isDarkMode ? '#ffffff' : '#0A0A0F';

  return (
    <div className={`w-full h-full flex flex-col items-center justify-center ${themeClass}`} style={{ backgroundColor }}>
      <GlobalControlsNav />
      <div className="w-full h-full flex flex-col items-center justify-center">
        <div className="w-full flex flex-col items-center justify-center mb-4">
          <QuestionSelector
            availableFields={availableFields}
            currentSource={currentSource}
            currentTarget={currentTarget}
            onChange={(source, target) => {
              setCurrentSource(source);
              setCurrentTarget(target);
              setLastCategoryChange({ source, target });
            }}
          />
        </div>
        <div 
          className="w-full flex justify-center items-center relative"
          style={{ height: height * 0.85 }} // Use 85% of available height for the chart to account for labels
        >
          <svg
            ref={svgRef}
            width={width}
            height={height * 0.85}
            style={{ display: 'block', margin: '0 auto', background: 'transparent', color: textColor }}
          />
          {tooltipEl}
        </div>
      </div>
    </div>
  );
} 