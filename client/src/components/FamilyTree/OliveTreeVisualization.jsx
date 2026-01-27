/**
 * Olive Tree Visualization - Enhanced Version
 * A beautiful organic visualization with special emphasis on main ancestors.
 * Family members are rendered as leaves and olives on a natural tree structure.
 */

import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

const OliveTreeVisualization = ({ data, onNodeClick, className = '', style = {} }) => {
    const svgRef = useRef(null);
    const wrapperRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 1200, height: 900 });

    useEffect(() => {
        if (!data || !wrapperRef.current) return;

        const updateDimensions = () => {
            const { offsetWidth, offsetHeight } = wrapperRef.current;
            setDimensions({
                width: Math.max(offsetWidth, 800),
                height: Math.max(offsetHeight, 600)
            });
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);

        // D3 Setup
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const { width, height } = dimensions;

        // Definitions for gradients and filters
        const defs = svg.append('defs');

        // Trunk gradient
        const trunkGradient = defs.append('linearGradient')
            .attr('id', 'trunkGradient')
            .attr('x1', '0%').attr('y1', '0%')
            .attr('x2', '100%').attr('y2', '100%');
        trunkGradient.append('stop').attr('offset', '0%').attr('stop-color', '#5D4037');
        trunkGradient.append('stop').attr('offset', '50%').attr('stop-color', '#3E2723');
        trunkGradient.append('stop').attr('offset', '100%').attr('stop-color', '#4E342E');

        // Golden gradient for main ancestors
        const goldGradient = defs.append('radialGradient')
            .attr('id', 'goldGradient')
            .attr('cx', '50%').attr('cy', '30%').attr('r', '70%');
        goldGradient.append('stop').attr('offset', '0%').attr('stop-color', '#FFD700');
        goldGradient.append('stop').attr('offset', '50%').attr('stop-color', '#DAA520');
        goldGradient.append('stop').attr('offset', '100%').attr('stop-color', '#B8860B');

        // Glow filter for main ancestors
        const glowFilter = defs.append('filter')
            .attr('id', 'glow')
            .attr('x', '-50%').attr('y', '-50%')
            .attr('width', '200%').attr('height', '200%');
        glowFilter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur');
        const feMerge = glowFilter.append('feMerge');
        feMerge.append('feMergeNode').attr('in', 'coloredBlur');
        feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

        // Main group for transformations
        const mainGroup = svg.append('g').attr('class', 'main-group');

        // Zoom Behavior
        const zoom = d3.zoom()
            .scaleExtent([0.2, 4])
            .on('zoom', (event) => {
                mainGroup.attr('transform', event.transform);
            });

        svg.call(zoom);

        // Hierarchical Layout
        // Sort by siblingOrder to match the order entered in the form
        const root = d3.hierarchy(data)
            .sort((a, b) => {
                // First, sort by siblingOrder (the order entered in the form)
                const orderA = a.data.siblingOrder || 0;
                const orderB = b.data.siblingOrder || 0;
                if (orderA !== orderB) {
                    return orderA - orderB;
                }
                // If siblingOrder is the same, fall back to fullName for consistent ordering
                return (a.data.fullName || "").localeCompare(b.data.fullName || "");
            });
        const nodeCount = root.descendants().length;

        // Dynamic sizing based on tree size
        const treeWidth = Math.max(width * 2, nodeCount * 100);
        const treeHeight = Math.max(height * 1.5, root.height * 200);

        // Use tree layout for clear hierarchy
        const treeLayout = d3.tree()
            .size([treeWidth, treeHeight])
            .separation((a, b) => {
                // More space between main branches
                if (a.depth <= 1 || b.depth <= 1) return 3;
                return (a.parent === b.parent ? 1.5 : 2);
            });

        treeLayout(root);

        // Color Palette
        const colors = {
            trunk: '#3D2914',
            trunkLight: '#5C4033',
            branch: '#4A3520',
            branchLight: '#6B4423',
            leafDark: '#2D5016',
            leaf: '#4A7023',
            leafLight: '#6B8E23',
            leafPale: '#8FBC8F',
            olive: '#556B2F',
            oliveRipe: '#8B7355',
            gold: '#DAA520',
            text: '#FFFFFF',
            ground: '#7CB342'
        };

        // Branch colors for main ancestors (depth 1)
        const branchColors = {
            'زهار': '#0d9488',  // Teal
            'صالح': '#d97706',  // Amber
            'براهيم': '#7c3aed', // Violet (for إبراهيم)
            'إبراهيم': '#7c3aed' // Violet
        };

        // Thickness scale for branches
        const maxDescendants = root.copy().count().value;
        const thicknessScale = d3.scalePow()
            .exponent(0.5)
            .domain([1, maxDescendants])
            .range([4, 55]);

        // Draw Ground/Hill
        const groundGroup = mainGroup.append('g').attr('class', 'ground');
        const trunkX = root.x;
        const trunkY = -root.y;

        // Larger hill
        groundGroup.append('ellipse')
            .attr('cx', trunkX)
            .attr('cy', trunkY + 50)
            .attr('rx', 180)
            .attr('ry', 50)
            .attr('fill', colors.ground)
            .attr('opacity', 0.9);

        // Draw Branches (Links)
        const linksGroup = mainGroup.append('g').attr('class', 'links');

        linksGroup.selectAll('.link')
            .data(root.links())
            .enter()
            .append('path')
            .attr('class', 'link')
            .attr('d', d => {
                const sourceX = d.source.x;
                const sourceY = -d.source.y;
                const targetX = d.target.x;
                const targetY = -d.target.y;

                const midY = (sourceY + targetY) / 2;
                const controlOffset = (targetX - sourceX) * 0.35;

                return `M ${sourceX} ${sourceY} 
                        C ${sourceX + controlOffset} ${midY}, 
                          ${targetX - controlOffset} ${midY}, 
                          ${targetX} ${targetY}`;
            })
            .attr('fill', 'none')
            .attr('stroke', d => {
                // Color main branches by ancestor
                if (d.source.depth === 0 && d.target.depth === 1) {
                    const name = d.target.data.fullName || '';
                    for (const [key, color] of Object.entries(branchColors)) {
                        if (name.includes(key)) return color;
                    }
                    return colors.trunk;
                }
                if (d.source.depth === 0) return colors.trunk;
                if (d.source.depth === 1) return colors.trunkLight;
                return colors.branch;
            })
            .attr('stroke-width', d => {
                const load = d.target.copy().count().value;
                // Thicker branches for main ancestors
                const baseWidth = thicknessScale(load);
                if (d.target.depth === 1) return baseWidth * 1.3;
                return baseWidth;
            })
            .attr('stroke-linecap', 'round')
            .attr('stroke-linejoin', 'round');

        // Draw Nodes
        const nodesGroup = mainGroup.append('g').attr('class', 'nodes');

        const node = nodesGroup.selectAll('.node')
            .data(root.descendants())
            .enter()
            .append('g')
            .attr('class', d => `node depth-${d.depth}`)
            .attr('transform', d => `translate(${d.x},${-d.y})`)
            .style('cursor', 'pointer')
            .on('click', (event, d) => {
                event.stopPropagation();
                if (onNodeClick) onNodeClick(d.data);
            });

        // === ROOT ANCESTOR (محمد الشاعر) ===
        const rootNode = node.filter(d => d.depth === 0);

        // Large golden trunk base
        rootNode.append('ellipse')
            .attr('rx', 60)
            .attr('ry', 45)
            .attr('fill', 'url(#goldGradient)')
            .attr('stroke', '#8B6914')
            .attr('stroke-width', 4)
            .attr('filter', 'url(#glow)');

        // Crown icon for root
        rootNode.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', -5)
            .attr('font-size', '28px')
            .text('👑');

        // Root name below
        rootNode.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', 75)
            .attr('font-size', '20px')
            .attr('font-weight', 'bold')
            .attr('font-family', 'Cairo, Tajawal, sans-serif')
            .attr('fill', '#1a1a1a')
            .style('paint-order', 'stroke')
            .style('stroke', '#fff')
            .style('stroke-width', '4px')
            .text(d => d.data.fullName);

        // === MAIN ANCESTORS (صالح, زهار, إبراهيم) - Depth 1 ===
        const mainAncestors = node.filter(d => d.depth === 1);

        // Large colored circles for main ancestors
        mainAncestors.append('circle')
            .attr('r', 35)
            .attr('fill', d => {
                const name = d.data.fullName || '';
                for (const [key, color] of Object.entries(branchColors)) {
                    if (name.includes(key)) return color;
                }
                return colors.branchLight;
            })
            .attr('stroke', '#fff')
            .attr('stroke-width', 4)
            .attr('filter', 'url(#glow)');

        // Icon inside
        mainAncestors.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', 8)
            .attr('font-size', '24px')
            .text('🌳');

        // Name label below
        mainAncestors.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', 60)
            .attr('font-size', '18px')
            .attr('font-weight', 'bold')
            .attr('font-family', 'Cairo, Tajawal, sans-serif')
            .attr('fill', d => {
                const name = d.data.fullName || '';
                for (const [key, color] of Object.entries(branchColors)) {
                    if (name.includes(key)) return color;
                }
                return '#333';
            })
            .style('paint-order', 'stroke')
            .style('stroke', '#fff')
            .style('stroke-width', '3px')
            .text(d => d.data.fullName);

        // === INTERMEDIATE ANCESTORS (Depth 2-3) ===
        const intermediateNodes = node.filter(d => d.depth >= 2 && d.children);

        intermediateNodes.append('circle')
            .attr('r', d => Math.max(12, 20 - d.depth * 3))
            .attr('fill', colors.branchLight)
            .attr('stroke', colors.trunk)
            .attr('stroke-width', 2);

        intermediateNodes.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', d => 30 + (5 - d.depth) * 3)
            .attr('font-size', d => Math.max(10, 14 - d.depth))
            .attr('font-weight', 'bold')
            .attr('font-family', 'Cairo, Tajawal, sans-serif')
            .attr('fill', colors.text)
            .style('paint-order', 'stroke')
            .style('stroke', '#000')
            .style('stroke-width', '2.5px')
            .text(d => d.data.fullName);

        // === LEAF NODES (No children) ===
        const leafNodes = node.filter(d => !d.children);

        leafNodes.each(function (d) {
            const leafGroup = d3.select(this);
            const numLeaves = 2 + Math.floor(Math.random() * 2);

            for (let i = 0; i < numLeaves; i++) {
                const angle = (i / numLeaves) * 360 + Math.random() * 40 - 20;
                const distance = 12 + Math.random() * 8;
                const scale = 0.7 + Math.random() * 0.3;
                const leafColors = [colors.leafDark, colors.leaf, colors.leafLight, colors.leafPale];
                const leafColor = leafColors[Math.floor(Math.random() * leafColors.length)];

                leafGroup.append('path')
                    .attr('d', 'M0,0 C3,-2 7,-7 8,-14 C6,-17 3,-18 0,-18 C-3,-18 -6,-17 -8,-14 C-7,-7 -3,-2 0,0')
                    .attr('fill', leafColor)
                    .attr('stroke', colors.leafDark)
                    .attr('stroke-width', 0.5)
                    .attr('transform', `rotate(${angle}) translate(0, ${-distance}) scale(${scale})`)
                    .attr('opacity', 0.85);
            }

            // Add olive fruit
            if (Math.random() > 0.4) {
                const oliveColor = Math.random() > 0.5 ? colors.olive : colors.oliveRipe;
                leafGroup.append('ellipse')
                    .attr('cx', Math.random() * 16 - 8)
                    .attr('cy', -12 - Math.random() * 10)
                    .attr('rx', 4)
                    .attr('ry', 6)
                    .attr('fill', oliveColor)
                    .attr('stroke', '#333')
                    .attr('stroke-width', 0.5);
            }
        });

        // Leaf node labels
        leafNodes.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', 35)
            .attr('font-size', '11px')
            .attr('font-weight', 'bold')
            .attr('font-family', 'Cairo, Tajawal, sans-serif')
            .attr('fill', colors.text)
            .style('paint-order', 'stroke')
            .style('stroke', '#000')
            .style('stroke-width', '2px')
            .text(d => d.data.fullName);

        // Fit view to show entire tree
        const bounds = mainGroup.node().getBBox();
        const fullWidth = bounds.width;
        const fullHeight = bounds.height;

        const scale = Math.min(
            (width * 0.85) / fullWidth,
            (height * 0.8) / fullHeight,
            1.0
        );

        const translateX = width / 2 - (bounds.x + fullWidth / 2) * scale;
        const translateY = height * 0.55 - (bounds.y + fullHeight / 2) * scale;

        const initialTransform = d3.zoomIdentity
            .translate(translateX, translateY)
            .scale(scale);

        svg.call(zoom.transform, initialTransform);

        return () => {
            window.removeEventListener('resize', updateDimensions);
        };
    }, [data, dimensions.width, dimensions.height]);

    return (
        <div
            ref={wrapperRef}
            className={`w-full relative overflow-hidden ${className}`}
            style={{
                minHeight: '80vh',
                height: '100%',
                background: 'linear-gradient(180deg, #87CEEB 0%, #B0E0E6 25%, #E0F7FA 50%, #C8E6C9 75%, #A5D6A7 100%)',
                ...style
            }}
        >
            {/* Decorative frame */}
            <div className="absolute inset-2 border-4 border-amber-600/40 rounded-xl pointer-events-none" />
            <div className="absolute inset-4 border-2 border-amber-700/25 rounded-lg pointer-events-none" />

            {/* Title */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-amber-600 to-amber-700 text-white px-8 py-3 rounded-full shadow-lg z-10">
                <h2 className="text-xl font-bold" style={{ fontFamily: 'Cairo, sans-serif' }}>
                    🌳 شجرة عائلة الشاعر 🌳
                </h2>
            </div>

            {/* Legend */}
            <div className="absolute top-20 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-10 text-sm" dir="rtl">
                <h3 className="font-bold mb-2 text-gray-800">دليل الألوان:</h3>
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-amber-500"></span>
                        <span>الجد الأكبر</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full" style={{ backgroundColor: '#0d9488' }}></span>
                        <span>فرع زهار</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full" style={{ backgroundColor: '#d97706' }}></span>
                        <span>فرع صالح</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full" style={{ backgroundColor: '#7c3aed' }}></span>
                        <span>فرع إبراهيم</span>
                    </div>
                </div>
            </div>

            <svg
                ref={svgRef}
                width="100%"
                height="100%"
                style={{ display: 'block', minHeight: '80vh' }}
            />

            {/* Hint */}
            <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-white/90 pointer-events-none">
                🔍 اسحب للتنقل • قرّب للتكبير • اضغط على الاسم للتفاصيل
            </div>
        </div>
    );
};

export default OliveTreeVisualization;
