'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
// @ts-expect-error: No types for d3-interpolate-path
import { interpolatePath } from 'd3-interpolate-path';
import { useVisualizationData } from './shared/useVisualizationData';
import { VisualizationContainer } from './shared/VisualizationContainer';
import { DataInsightPanel } from './shared/DataInsightPanel';
import { yearsColorScale, getYearsCategory } from './shared/colorUtils';
import { QuestionSelector } from './shared/QuestionSelector';
import { useAppContext } from '@/lib/context/AppContext';

interface AlluvialDiagramProps {
  width?: number;
  height?: number;
  autoPlay?: boolean;
  onQuestionChange?: (source: string, target: string) => void;
}

const availableFields = [
  { value: 'years_at_medtronic', label: 'Years at Medtronic' },
  { value: 'learning_style', label: 'Learning Style' },
  { value: 'shaped_by', label: 'Shaped By' },
  { value: 'peak_performance', label: 'Peak Performance' },
  { value: 'motivation', label: 'Motivation' },
  // Add more fields as needed
];

const YEARS_CATEGORIES = ['0-5', '6-10', '11-15', '16-20', '20+'];

// Custom wave path generator for Sankey links
function sankeyLinkWave(d: any, waveAmplitude = 8, waveFrequency = 1.1) {
  // d has source/target: {x0, x1, y0, y1}
  const x0 = d.source.x1;
  const x1 = d.target.x0;
  const y0 = d.y0;
  const y1 = d.y1;
  const midX = (x0 + x1) / 2;
  // Add a sine wave to the control points
  const waveY0 = y0 + waveAmplitude * Math.sin(waveFrequency * Math.PI * 0.25);
  const waveY1 = y1 + waveAmplitude * Math.sin(waveFrequency * Math.PI * 0.75);
  return `M${x0},${y0}
    C${midX},${waveY0} ${midX},${waveY1} ${x1},${y1}`;
}

// Helper to get color for a node using global context
function getNodeColor(node: any, globalColors: any): string {
  if (node.category === 'years_at_medtronic') {
    return globalColors.years_at_medtronic?.[node.name] || yearsColorScale(node.name);
  }
  
  // Use global colors if available, otherwise fallback to defaults
  if (node.category === 'learning_style') {
    return globalColors.learning_style?.[node.name] || '#60a5fa';
  }
  if (node.category === 'peak_performance') {
    return globalColors.peak_performance?.[node.name] || '#4F8EF7';
  }
  if (node.category === 'motivation') {
    return globalColors.motivation?.[node.name] || '#9467bd';
  }
  if (node.category === 'shaped_by') {
    return globalColors.shaped_by?.[node.name] || '#1f77b4';
  }
  return '#8884d8';
}

export default function AlluvialDiagram({
  width = 800,
  height = 600,
  autoPlay = true,
  onQuestionChange,
}: AlluvialDiagramProps) {
  // D3-safe margins - further reduced to prevent cropping
  const margin = { top: 20, right: 180, bottom: 20, left: 180 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const svgRef = useRef<SVGSVGElement>(null);
  const { data, isLoading, error } = useVisualizationData();
  const { settings } = useAppContext();
  const [currentSource, setCurrentSource] = useState('years_at_medtronic');
  const [currentTarget, setCurrentTarget] = useState('learning_style');
  const [insights, setInsights] = useState<Array<{ title: string; value: string | number; description?: string }>>([]);
  const [hoveredNode, setHoveredNode] = useState<any | null>(null);
  const [hoveredLink, setHoveredLink] = useState<any | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null);
  const [lastCategoryChange, setLastCategoryChange] = useState<{ source: string; target: string }>({ source: currentSource, target: currentTarget });
  const [highlightedSourceIndex, setHighlightedSourceIndex] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(true);
  const [hoveredSourceIndex, setHoveredSourceIndex] = useState<number | null>(null);
  const [isInFullOpacityState, setIsInFullOpacityState] = useState(false);

  // Compute sources and targets for the current categories
  const sources: string[] = useMemo(() => {
    if (!data.length) return [];
    if (currentSource === 'years_at_medtronic') {
      return YEARS_CATEGORIES.filter(cat => data.some(d => getYearsCategory(d.years_at_medtronic || 0) === cat));
    } else {
      return Array.from(new Set(data.map((d: any) => d[currentSource]))).filter(Boolean);
    }
  }, [data, currentSource]);

  const targets: string[] = useMemo(() => {
    if (!data.length) return [];
    if (currentTarget === 'years_at_medtronic') {
      return YEARS_CATEGORIES.filter(cat => data.some(d => getYearsCategory(d.years_at_medtronic || 0) === cat));
    } else {
      return Array.from(new Set(data.map((d: any) => 
        currentTarget === 'years_at_medtronic' 
          ? getYearsCategory(d.years_at_medtronic || 0) 
          : d[currentTarget]
      ))).filter(Boolean);
    }
  }, [data, currentTarget]);

  const nodeLabelFontSize = 18; // larger for readability
  const nodeLabelFontWeight = 700;
  const nodeLabelColor = '#170F5F';
  const nodeLabelFontFamily = 'Avenir Next World, -apple-system, BlinkMacSystemFont, "SF Pro", "Roboto", sans-serif';
  const nodeLabelOffset = 24;

  // Auto-cycling logic - DISABLED: Now controlled by animation cycle
  // useEffect(() => {
  //   if (!autoPlay || !settings.isAutoPlayEnabled) return;

  //   // Only cycle the target (right) category, keep source fixed
  //   const targetOptions = availableFields.filter(f => f.value !== currentSource).map(f => f.value);
  //   let currentIndex = targetOptions.indexOf(currentTarget);
  //   const interval = setInterval(() => {
  //     currentIndex = (currentIndex + 1) % targetOptions.length;
  //     const nextTarget = targetOptions[currentIndex];
  //     setCurrentTarget(nextTarget);
  //     setLastCategoryChange({ source: currentSource, target: nextTarget });
  //     onQuestionChange?.(currentSource, nextTarget);
  //   }, settings.autoPlaySpeed || 6000); // Use global setting

  //   return () => clearInterval(interval);
  // }, [autoPlay, onQuestionChange, currentSource, currentTarget, settings.isAutoPlayEnabled, settings.autoPlaySpeed]);

  // Animation cycle for sequential highlighting
  useEffect(() => {
    if (!autoPlay || !settings.isAutoPlayEnabled) return;
    if (!isAnimating) return;
    if (!data.length) return;

    const targetOptions = availableFields.filter(f => f.value !== currentSource).map(f => f.value);
    let currentTargetIndex = targetOptions.indexOf(currentTarget);
    let sourceIndex = 0;
    setIsAnimating(true);

    let highlightTimer: NodeJS.Timeout | null = null;
    let switchCategoryTimer: NodeJS.Timeout | null = null;
    let running = true;

    // Calculate timing based on global settings
    const baseSpeed = settings.autoPlaySpeed || 6000;
    const stepDuration = Math.max(800, baseSpeed / 8); // Each step takes 1/8 of the total cycle time
    const pauseDuration = Math.max(400, baseSpeed / 16); // Pause between steps

    // Create sorted sources array for animation (same order as rendering)
    const sortedSources = [...sources];
    if (currentSource === 'years_at_medtronic') {
      sortedSources.sort((a, b) => YEARS_CATEGORIES.indexOf(a) - YEARS_CATEGORIES.indexOf(b));
    } else {
      sortedSources.sort();
    }

    console.log('Animation cycle starting with sources:', sortedSources, 'current target:', currentTarget);

    function startAnimationCycle() {
      if (!running) return;
      console.log('Starting full opacity state');
      setIsInFullOpacityState(true);
      setHighlightedSourceIndex(null);
      highlightTimer = setTimeout(() => {
        setIsInFullOpacityState(false);
        highlightNext();
      }, stepDuration + pauseDuration);
    }

    function highlightNext() {
      if (!running) return;
      console.log(`Highlighting source ${sourceIndex}: ${sortedSources[sourceIndex]}`);
      setHighlightedSourceIndex(sourceIndex);
      
      if (sourceIndex < sortedSources.length - 1) {
        // Continue to next source
        highlightTimer = setTimeout(() => {
          sourceIndex++;
          highlightNext();
        }, stepDuration + pauseDuration);
      } else {
        // Finished all sources, switch right-side category
        console.log('Finished all sources, switching category');
        switchCategoryTimer = setTimeout(() => {
          currentTargetIndex = (currentTargetIndex + 1) % targetOptions.length;
          const nextTarget = targetOptions[currentTargetIndex];
          console.log(`Switching to target: ${nextTarget}`);
          setCurrentTarget(nextTarget);
          setLastCategoryChange({ source: currentSource, target: nextTarget });
          onQuestionChange?.(currentSource, nextTarget);
          setHighlightedSourceIndex(0);
          setIsInFullOpacityState(false);
        }, stepDuration + pauseDuration);
      }
    }

    startAnimationCycle();
    return () => {
      running = false;
      if (highlightTimer) clearTimeout(highlightTimer);
      if (switchCategoryTimer) clearTimeout(switchCategoryTimer);
    };
  }, [autoPlay, settings.isAutoPlayEnabled, isAnimating, data, currentSource, onQuestionChange, settings.autoPlaySpeed, sources]);

  // Pause animation on hover
  useEffect(() => {
    if (hoveredSourceIndex !== null && isInFullOpacityState) {
      setIsAnimating(false);
    } else if (hoveredSourceIndex === null) {
      setIsAnimating(true);
    }
  }, [hoveredSourceIndex, isInFullOpacityState]);

  // Render Sankey diagram
  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    // --- Persistent SVG structure ---
    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous content
    svg
      .attr('width', width)
      .attr('height', height);

    // Create a group for the chart area with margin translation
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    let defs = svg.select<SVGDefsElement>('defs');
    if (defs.empty()) defs = svg.append('defs') as d3.Selection<SVGDefsElement, unknown, null, undefined>;
    let linksG = g.append('g').attr('class', 'links');
    let nodesG = g.append('g').attr('class', 'nodes');

    // Sankey transformation
    const sourceAccessor = (d: any) =>
      currentSource === 'years_at_medtronic'
        ? getYearsCategory(d.years_at_medtronic || 0)
        : d[currentSource];
    const targetAccessor = (d: any) =>
      currentTarget === 'years_at_medtronic'
        ? getYearsCategory(d.years_at_medtronic || 0)
        : d[currentTarget];

    // Sort source nodes to maintain a fixed order (same as animation)
    const sortedSources = [...sources];
    if (currentSource === 'years_at_medtronic') {
      sortedSources.sort((a, b) => YEARS_CATEGORIES.indexOf(a) - YEARS_CATEGORIES.indexOf(b));
    } else {
      sortedSources.sort();
    }

    // Filter data to only include valid values (no additional filtering for peak_performance)
    const filteredData = data.filter(d =>
      (currentSource !== 'years_at_medtronic' || d.years_at_medtronic !== null) &&
      (currentTarget !== 'years_at_medtronic' || d.years_at_medtronic !== null)
    );

    // 2. Build nodes array with unique ids
    const nodes = [
      ...sortedSources.map((name) => ({ id: `${currentSource}:${name}`, name, category: currentSource })),
      ...targets.map((name) => ({ id: `${currentTarget}:${name}`, name, category: currentTarget })),
    ];

    // 3. Build links array (aggregate counts for each source-target pair)
    const linksMap = new Map<string, { source: string; target: string; value: number, isDummy?: boolean }>();
    filteredData.forEach((d) => {
      const source = sourceAccessor(d);
      const target = targetAccessor(d);
      const sourceId = `${currentSource}:${source}`;
      const targetId = `${currentTarget}:${target}`;
      if (!sortedSources.includes(source) || !targets.includes(target)) return; // Exclude invalid
      const key = `${sourceId}→${targetId}`;
      if (!linksMap.has(key)) {
        linksMap.set(key, { source: sourceId, target: targetId, value: 0 });
      }
      linksMap.get(key)!.value += 1;
    });
    // Add dummy links for target categories with no incoming links
    const targetNodeIds = targets.map((name) => `${currentTarget}:${name}`);
    const sourceNodeIds = sortedSources.map((name) => `${currentSource}:${name}`);
    // Add a hidden dummy source node if needed
    const DUMMY_SOURCE_ID = '__dummy_source__';
    const DUMMY_TARGET_ID = '__dummy_target__';
    let dummySourceNodeAdded = false;
    let dummyTargetNodeAdded = false;
    targetNodeIds.forEach((targetId) => {
      const hasIncoming = Array.from(linksMap.values()).some((l) => l.target === targetId);
      if (!hasIncoming) {
        // Add dummy source node if not already present
        if (!dummySourceNodeAdded) {
          nodes.unshift({ id: DUMMY_SOURCE_ID, name: '', category: '__dummy__' });
          dummySourceNodeAdded = true;
        }
        linksMap.set(`${DUMMY_SOURCE_ID}→${targetId}`, { source: DUMMY_SOURCE_ID, target: targetId, value: 0.0001, isDummy: true });
      }
    });
    // Add dummy links for source categories with no outgoing links
    sourceNodeIds.forEach((sourceId) => {
      const hasOutgoing = Array.from(linksMap.values()).some((l) => l.source === sourceId);
      if (!hasOutgoing) {
        // Add dummy target node if not already present
        if (!dummyTargetNodeAdded) {
          nodes.push({ id: DUMMY_TARGET_ID, name: '', category: '__dummy__' });
          dummyTargetNodeAdded = true;
        }
        linksMap.set(`${sourceId}→${DUMMY_TARGET_ID}`, { source: sourceId, target: DUMMY_TARGET_ID, value: 0.0001, isDummy: true });
      }
    });
    const links = Array.from(linksMap.values());

    // 4. Sankey layout with nodeId accessor
    const sankeyGenerator = sankey<any, any>()
      .nodeId((d: any) => d.id)
      .nodeWidth(24)
      .nodePadding(24)
      .extent([[0, 0], [chartWidth, chartHeight]]);
    const sankeyData = sankeyGenerator({
      nodes: nodes.map((d) => ({ ...d })),
      links: links.map((d) => ({ ...d })),
    });

    // Remove old gradients (no longer needed)
    defs.selectAll('linearGradient.link-gradient').remove();

    // --- Add clipPath for links group ---
    svg.select('defs').selectAll('#link-clip').remove();
    defs.append('clipPath')
      .attr('id', 'link-clip')
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', width)
      .attr('height', height);
    linksG.attr('clip-path', 'url(#link-clip)');

    // --- Links update pattern ---
    const filteredLinks = sankeyData.links.filter((d: any) => d.source.id !== DUMMY_SOURCE_ID && d.target.id !== DUMMY_TARGET_ID);
    linksG.style('mix-blend-mode', 'multiply');
    const linkKey = (d: any) => `${d.source.id}→${d.target.id}`;
    const linkSel = linksG.selectAll('path')
      .data(filteredLinks, linkKey);

    // EXIT: fade out and remove all old links
    linkSel.exit()
      .transition().duration(400)
      .attr('opacity', 0)
      .remove();

    // Remove all links before drawing new ones (force draw-in on every category change only)
    linksG.selectAll('path').remove();

    // Check if this is a category change that should trigger animation
    const isCategoryChange = lastCategoryChange.source !== currentSource || lastCategoryChange.target !== currentTarget;

    // ENTER: draw in all new links
    linksG.selectAll('path')
      .data(filteredLinks, linkKey)
      .enter()
      .append('path')
      .attr('d', (d: any) => sankeyLinkWave(d, 8, 1.1))
      .attr('stroke', (d: any) => getNodeColor(d.source, settings.categoryColors))
      .attr('stroke-width', (d: any) => Math.max(1, d.width))
      .attr('fill', 'none')
      .attr('filter', (d: any) => (hoveredLink === d ? 'url(#glow)' : null))
      .attr('pointer-events', 'all')
      .attr('stroke-linecap', 'round')
      .attr('opacity', (d: any) => {
        if (!highlightSourceName) return 0.6;
        return d.source.name === highlightSourceName ? 0.9 : 0.1;
      })
      .each(function (d: any) {
        // Always animate on category changes, but not on hover
        const path = d3.select(this);
        const totalLength = (this as SVGPathElement).getTotalLength();
        path
          .attr('stroke-dasharray', totalLength)
          .attr('stroke-dashoffset', totalLength)
          .transition()
          .duration(1400)
          .ease(d3.easeCubicInOut)
          .attr('stroke-dashoffset', 0)
          .on('end', function () {
            d3.select(this)
              .attr('stroke-linecap', 'butt') // crisp edge after animation
              .attr('stroke-dasharray', null)
              .attr('stroke-dashoffset', null);
          });
      })
      .on('mousemove', function (event: any, d: any) {
        setHoveredLink(d);
        setTooltip({
          x: event.offsetX,
          y: event.offsetY,
          content: (
            <div>
              <div className="font-bold">{d.source.name} → {d.target.name}</div>
              <div>{d.value} attendees</div>
            </div>
          ),
        });
      })
      .on('mouseleave', function () {
        setHoveredLink(null);
        setTooltip(null);
      });

    // --- Nodes update pattern (rects) ---
    const filteredNodes = sankeyData.nodes.filter((d: any) => d.id !== DUMMY_SOURCE_ID && d.id !== DUMMY_TARGET_ID);
    const nodeSel = nodesG.selectAll('rect')
      .data(filteredNodes, (d: any) => d.id);
    nodeSel.exit().remove();
    nodeSel.join(
      enter => enter.append('rect')
        .attr('x', (d: any) => d.x0)
        .attr('y', (d: any) => d.y0)
        .attr('height', (d: any) => (d.value === 0 ? 0.0001 : d.y1 - d.y0))
        .attr('width', (d: any) => d.x1 - d.x0)
        .attr('fill', (d: any) => getNodeColor(d, settings.categoryColors))
        .attr('stroke', '#22223b')
        .attr('opacity', (d: any) => {
          // Source blocks (left side) always stay at full opacity
          if (d.category === currentSource) {
            return 1;
          }
          // Target nodes change opacity based on highlighting
          if (!highlightSourceName) return 1;
          const isConnected = filteredLinks.some(l => l.source.name === highlightSourceName && l.target.name === d.name);
          return isConnected ? 1 : 0.1;
        })
        .on('mousemove', function (event: any, d: any) {
          setHoveredNode(d);
          setTooltip({
            x: event.offsetX,
            y: event.offsetY,
            content: (
              <div>
                <div className="font-bold">{d.name}</div>
                <div>Category: {d.category}</div>
                <div>Responses: {d.value}</div>
              </div>
            ),
          });
        })
        .on('mouseleave', function () {
          setHoveredNode(null);
          setTooltip(null);
        })
        .on('mouseenter', function (event: any, d: any) {
          if (d.category === currentSource) {
            const idx = sortedSources.indexOf(d.name);
            setHoveredSourceIndex(idx);
          }
        })
        .on('mouseleave', function (event: any, d: any) {
          if (d.category === currentSource) {
            setHoveredSourceIndex(null);
          }
        }),
      update => update
        .transition(d3.transition().duration(750).ease(d3.easeCubicInOut))
        .attr('x', (d: any) => d.x0)
        .attr('y', (d: any) => d.y0)
        .attr('height', (d: any) => (d.value === 0 ? 0.0001 : d.y1 - d.y0))
        .attr('width', (d: any) => d.x1 - d.x0)
        .attr('fill', (d: any) => getNodeColor(d, settings.categoryColors))
        .attr('opacity', (d: any) => {
          // Source blocks (left side) always stay at full opacity
          if (d.category === currentSource) {
            return 1;
          }
          // Target nodes change opacity based on highlighting
          if (!highlightSourceName) return 1;
          const isConnected = filteredLinks.some(l => l.source.name === highlightSourceName && l.target.name === d.name);
          return isConnected ? 1 : 0.1;
        })
    );

    // --- Node labels (re-render as before) ---
    g.selectAll('g.label-layer').remove();
    const labelLayer = g.append('g').attr('class', 'label-layer');
    const sourceNodeSet = new Set(sortedSources);
    const targetNodeSet = new Set(targets);
    const sourceNodes = sankeyData.nodes.filter(d => d.category === currentSource);
    const targetNodes = sankeyData.nodes.filter(d => d.category === currentTarget);
    sourceNodes.forEach((node: any) => {
      if (sourceNodeSet.has(node.name)) {
        labelLayer
          .append('text')
          .attr('x', node.x0 - nodeLabelOffset)
          .attr('y', (node.y0 + node.y1) / 2)
          .attr('text-anchor', 'end')
          .attr('alignment-baseline', 'middle')
          .attr('font-family', nodeLabelFontFamily)
          .attr('font-weight', nodeLabelFontWeight)
          .attr('font-size', nodeLabelFontSize)
          .attr('fill', nodeLabelColor)
          .attr('aria-label', node.name)
          .attr('opacity', node.value === 0 ? 0.5 : 1)
          .text(node.name);
      }
    });
    targetNodes.forEach((node: any) => {
      if (targetNodeSet.has(node.name)) {
        labelLayer
          .append('text')
          .attr('x', node.x1 + nodeLabelOffset)
          .attr('y', (node.y0 + node.y1) / 2)
          .attr('text-anchor', 'start')
          .attr('alignment-baseline', 'middle')
          .attr('font-family', nodeLabelFontFamily)
          .attr('font-weight', nodeLabelFontWeight)
          .attr('font-size', nodeLabelFontSize)
          .attr('fill', nodeLabelColor)
          .attr('aria-label', node.name)
          .attr('opacity', node.value === 0 ? 0.5 : 1)
          .text(node.name);
      }
    });

    // 6. Update insights
    let mostCommon: typeof links[0] | undefined = links.length > 0 ? links.reduce((a, b) => (b.value > a.value ? b : a), links[0]) : undefined;
    setInsights([
      { title: 'Total Responses', value: data.length },
      { title: 'Current View', value: `${currentSource} → ${currentTarget}` },
      mostCommon
        ? { title: 'Most Common Flow', value: `${mostCommon.source.split(':')[1]} → ${mostCommon.target.split(':')[1]}`, description: `${mostCommon.value} attendees` }
        : { title: 'Most Common Flow', value: 'N/A', description: '' },
    ]);

    // 7. Automatic animation on question change only
    const transition = d3.transition().duration(750).ease(d3.easeCubicInOut);

    // Animate nodes
    nodeSel
      .transition(transition)
      .attr('x', (d: any) => d.x0)
      .attr('y', (d: any) => d.y0)
      .attr('height', (d: any) => d.y1 - d.y0)
      .attr('width', (d: any) => d.x1 - d.x0)
      .attr('fill', (d: any) => getNodeColor(d, settings.categoryColors));

  }, [data, currentSource, currentTarget, width, height, settings.categoryColors, lastCategoryChange]);

  // Separate effect for hover interactions (doesn't re-render the whole visualization)
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current);
    const g = svg.select('g');
    
    // Update link hover effects
    g.selectAll('path')
      .each(function(d: any) {
        const path = d3.select(this);
        const isHovered = hoveredLink === d;
        path.attr('filter', isHovered ? 'url(#glow)' : null);
      });

  }, [hoveredNode, hoveredLink]);

  // Tooltip rendering
  const tooltipEl = tooltip ? (
    <div
      style={{
        position: 'absolute',
        left: tooltip.x + 16,
        top: tooltip.y + 16,
        background: 'rgba(20,20,30,0.98)',
        color: '#fff',
        padding: '8px 12px',
        borderRadius: 6,
        pointerEvents: 'none',
        zIndex: 100,
        fontFamily: 'Avenir Next World, sans-serif',
        fontWeight: 600,
        fontSize: 14,
        boxShadow: '0 4px 24px 0 rgba(16, 16, 235, 0.12)',
        maxWidth: 280,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
      role="tooltip"
      aria-live="polite"
    >
      {tooltip.content}
    </div>
  ) : null;

  // Create sorted sources array for highlighting (same as rendering and animation)
  const sortedSourcesForHighlight = [...sources];
  if (currentSource === 'years_at_medtronic') {
    sortedSourcesForHighlight.sort((a, b) => YEARS_CATEGORIES.indexOf(a) - YEARS_CATEGORIES.indexOf(b));
  } else {
    sortedSourcesForHighlight.sort();
  }

  // To do this, after building sources/targets, add:
  let highlightSourceName: string | null = null;
  if (isInFullOpacityState) {
    highlightSourceName = null;
  } else if (hoveredSourceIndex !== null && !isAnimating) {
    highlightSourceName = sortedSourcesForHighlight[hoveredSourceIndex];
  } else if (highlightedSourceIndex !== null) {
    highlightSourceName = sortedSourcesForHighlight[highlightedSourceIndex];
  }

  return (
    <div className="w-full h-full flex flex-col items-start justify-start bg-white">
      {/* Question Selector - Reduced top padding to move visualization higher */}
      <div className="w-full flex flex-col items-center justify-start pt-4 pb-6 mb-4" style={{ zIndex: 1000 }}>
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
      {/* Visualization Container - Takes remaining space */}
      <div
        style={{
          position: 'relative',
          width: width,
          height: height * 0.75, // Use 75% of available height for the chart
          overflow: 'visible',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'transparent',
          borderRadius: 0,
          boxShadow: 'none',
          margin: '0 auto',
        }}
        className="my-2"
      >
        <svg ref={svgRef} width={width} height={height * 0.75} style={{ overflow: 'visible', display: 'block', margin: '0 auto' }} />
        {tooltipEl}
      </div>
    </div>
  );
} 