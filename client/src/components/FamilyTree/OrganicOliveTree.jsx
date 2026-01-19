/**
 * شجرة العائلة - إصدار "غصن الزيتون" - دائري كامل 360 درجة
 * Organic Olive Branch - Full 360 Radial Layout
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';

// ==================== CONFIGURATION ====================
const COLORS = {
    bg: '#F9F9F0',
    trunk: '#3E2723', // Darker brown
    branch: '#5D4037', // Dark brown
    leafFill: '#2E7D32', // Vibrant green
    leafStroke: '#1B5E20',
    text: '#FFFFFF',
    gold: '#FFD700',
    rootText: '#FFFFFF'
};

const OrganicOliveTree = ({ data, onNodeClick, className = '', style = {}, isFullTreeMode = false }) => {
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const [renderError, setRenderError] = useState(null);

    // ==================== ASSETS ====================
    // Realistic Olive Leaf Path (svg path data)
    const LEAF_PATH = "M0,0 Q5,-5 15,0 T30,0 Q25,5 15,0 T0,0";
    // Simplified trunk path for the center (can be replaced with more complex one)
    const TRUNK_PATH = "M-20,0 L-15,-40 Q0,-60 15,-40 L20,0 L15,10 Q0,20 -15,10 Z";

    // ==================== DATA PROCESSING ====================
    const processedData = useMemo(() => {
        try {
            if (!data || Object.keys(data).length === 0) return null;

            // 1. Hierarchy & Sort
            const root = d3.hierarchy(data)
                .sort((a, b) => (b.height - a.height) || (a.data.fullName || "").localeCompare(b.data.fullName || ""));

            // 2. Count Leaves
            root.count();
            return { root };
        } catch (err) {
            console.error("Error processing hierarchy:", err);
            setRenderError("خطأ في معالجة بيانات الشجرة");
            return null;
        }
    }, [data]);

    // ==================== RENDER ====================
    useEffect(() => {
        if (!processedData) return;
        if (!svgRef.current || (!containerRef.current && !isFullTreeMode)) return;

        try {
            const { root } = processedData;

            // Setup Dimensions - MASSIVE canvas for full tree to ensure spacing
            let width, height;

            if (isFullTreeMode) {
                width = 5000; // Increased to 5000px
                height = 5000;
            } else {
                const rect = containerRef.current.getBoundingClientRect();
                width = Math.max(rect.width || 1200, 1200);
                height = Math.max(rect.height || 1200, 1200);
            }

            const cx = width / 2;
            const cy = height / 2;

            // Use radius that fits, but leave margin
            const radius = Math.min(width, height) / 2 * 0.90;

            // Clear SVG
            const svg = d3.select(svgRef.current);
            svg.selectAll('*').remove();

            // Set SVG attributes
            svg.attr('viewBox', `0 0 ${width} ${height}`)
                .attr('width', width)
                .attr('height', height)
                .attr('xmlns', 'http://www.w3.org/2000/svg');

            // Setup Zoom Group
            const g = svg.append('g').attr('class', 'tree-layer');

            // ALWAYS ENABLE ZOOM (User request: zoom capability even for large tree)
            const zoom = d3.zoom()
                .scaleExtent([0.1, 10]) // Allow zooming out far (0.1) and in close (10)
                .on('zoom', (e) => g.attr('transform', e.transform));

            svg.call(zoom);

            // Initial Centering
            // For full tree mode, zoom out to fit everything initially
            const initialScale = isFullTreeMode ? 0.8 : 0.95;
            svg.call(zoom.transform, d3.zoomIdentity
                .translate(width / 2, height / 2)
                .scale(initialScale)
                .translate(-cx, -cy)
            );

            // =========================================================
            // LAYOUT ALGORITHM
            // =========================================================

            const tree = d3.tree()
                .size([2 * Math.PI, radius])
                .separation((a, b) => {
                    const sameSibling = a.parent === b.parent;
                    // Much wider separation to prevent overlapping text
                    return (sameSibling ? 10 : 25) / a.depth;
                });

            tree(root);

            // Adjust radial distances
            const maxDepth = root.height;
            const depthStep = radius / (maxDepth + 1); // Even distribution

            root.each(node => {
                // Push outer leaves further out
                node.y = node.depth * depthStep;
            });

            // =========================================================
            // DRAW BRANCHES (Curves)
            // =========================================================

            // Custom curved link generator for organic look
            const branchGenerator = (d) => {
                const angle = d.x - Math.PI / 2;
                const radius = d.y;
                const parentAngle = d.parent.x - Math.PI / 2;
                const parentRadius = d.parent.y;

                const x0 = parentRadius * Math.cos(parentAngle);
                const y0 = parentRadius * Math.sin(parentAngle);
                const x1 = radius * Math.cos(angle);
                const y1 = radius * Math.sin(angle);

                // Control points for bezier curve
                const k = (d.y - d.parent.y) / 2;
                const cp1x = (parentRadius + k) * Math.cos(parentAngle);
                const cp1y = (parentRadius + k) * Math.sin(parentAngle);
                const cp2x = (radius - k) * Math.cos(angle);
                const cp2y = (radius - k) * Math.sin(angle);

                return `M${cx + x0},${cy + y0} C${cx + cp1x},${cy + cp1y} ${cx + cp2x},${cy + cp2y} ${cx + x1},${cy + y1}`;
            };

            g.selectAll('.link')
                .data(root.descendants().slice(1))
                .enter()
                .append('path')
                .attr('class', 'link')
                .attr('fill', 'none')
                .attr('stroke', '#4E342E') // Dark wood color
                .attr('stroke-width', d => Math.max(1, 15 - d.depth * 2.5)) // Tapering branches
                .attr('stroke-linecap', 'round')
                .attr('d', branchGenerator)
                .style('opacity', 0.8);

            // =========================================================
            // DRAW TRUNK (Center)
            // =========================================================
            const trunkGroup = g.append('g')
                .attr('transform', `translate(${cx}, ${cy})`);

            // Draw realistic trunk base
            trunkGroup.append('path')
                .attr('d', "M-40,0 Q-20,-60 0,-90 Q20,-60 40,0 Q20,20 0,30 Q-20,20 -40,0")
                .attr('fill', '#3E2723')
                .attr('stroke', '#281815')
                .attr('stroke-width', 2);

            trunkGroup.append('text')
                .attr('dy', '10')
                .attr('text-anchor', 'middle')
                .attr('fill', '#FFD700')
                .attr('font-family', "'Cairo', sans-serif")
                .attr('font-weight', 'bold')
                .text("محمد الشاعر");

            // =========================================================
            // DRAW LEAVES (Nodes)
            // =========================================================

            const nodes = g.selectAll('.node')
                .data(root.descendants().slice(1))
                .enter()
                .append('g')
                .attr('class', 'node')
                .attr('transform', d => {
                    const angle = d.x - Math.PI / 2;
                    const x = d.y * Math.cos(angle);
                    const y = d.y * Math.sin(angle);
                    return `translate(${cx + x}, ${cy + y})`;
                })
                .style('cursor', 'pointer')
                .on('click', (e, d) => {
                    // Node click logic from original
                    if (onNodeClick) {
                        const ancestors = [];
                        let current = d.parent;
                        while (current && current.depth > 0) { // Don't include root in ancestors list
                            ancestors.push({
                                _id: current.data._id,
                                fullName: current.data.fullName
                            });
                            current = current.parent;
                        }
                        onNodeClick({
                            ...d.data,
                            parentNode: d.parent ? d.parent.data : null,
                            ancestors
                        });
                    }
                });

            // Draw Leaves using SVG Path
            nodes.append('path')
                .attr('d', LEAF_PATH)
                .attr('fill', d => d.children ? '#2E7D32' : '#558B2F') // Darker for parents, lighter for leaves
                .attr('stroke', '#1B5E20')
                .attr('stroke-width', 1)
                .attr('transform', d => {
                    const angleDeg = (d.x * 180 / Math.PI) - 90;
                    // Scale leaf based on weight
                    const scale = d.children ? 2.5 : 1.8;
                    return `rotate(${angleDeg}) scale(${scale})`;
                })
                .style('filter', 'drop-shadow(1px 2px 2px rgba(0,0,0,0.2))');

            // Text Labels
            nodes.append('text')
                .attr('dy', '0.35em')
                .attr('text-anchor', d => {
                    // Logic to flip text on left side of circle for readability
                    const angleDeg = (d.x * 180 / Math.PI) % 360;
                    return (angleDeg > 180) ? "end" : "start";
                })
                .attr('transform', d => {
                    const angleDeg = (d.x * 180 / Math.PI) - 90;
                    const isLeft = (d.x * 180 / Math.PI) % 360 > 180;
                    // Flip text if on left side
                    const rotate = isLeft ? angleDeg + 180 : angleDeg;
                    const offset = d.children ? 45 : 35; // Moved text further out
                    return `rotate(${rotate}) translate(${isLeft ? -offset : offset}, 0)`;
                })
                .text(d => d.data.fullName)
                .attr('fill', '#000') // Black text for readability on light background
                .attr('font-size', d => d.children ? '24px' : '18px') // Larger text
                .attr('font-family', "'Cairo', sans-serif")
                .attr('font-weight', 'bold')
                .style('text-shadow', '0px 0px 4px rgba(255,255,255,0.8)'); // White glow behind text

            nodes.append('title').text(d => d.data.fullName);

        } catch (err) {
            console.error("Error rendering tree:", err);
            setRenderError("حدث خطأ أثناء رسم الشجرة: " + err.message);
        }

    }, [processedData, isFullTreeMode]);

    if (renderError) {
        return <div className="text-red-600 p-4 text-center">{renderError}</div>;
    }

    return (
        <div ref={containerRef} className="w-full h-full relative bg-[#F9F9F0] overflow-hidden" dir="rtl">
            <svg ref={svgRef} className="w-full h-full block touch-action-none" />
        </div>
    );
};

export default OrganicOliveTree;
