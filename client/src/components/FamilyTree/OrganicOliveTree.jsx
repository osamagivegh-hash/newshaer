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

const OrganicOliveTree = ({ data, onNodeClick, className = '', style = {} }) => {
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const [selectedNode, setSelectedNode] = useState(null);
    const [renderError, setRenderError] = useState(null);

    // ==================== DATA PROCESSING ====================
    const processedData = useMemo(() => {
        try {
            if (!data || Object.keys(data).length === 0) return null;

            // 1. Hierarchy & Sort
            // Sort by children length to balance the tree visually
            const root = d3.hierarchy(data)
                .sort((a, b) => (b.height - a.height) || (a.data.fullName || "").localeCompare(b.data.fullName || ""));

            // 2. Count Leaves (Weight)
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
        if (!svgRef.current || !containerRef.current) return;

        try {

            const { root } = processedData;

            // Setup Dimensions
            const rect = containerRef.current.getBoundingClientRect();
            const width = Math.max(rect.width || 1200, 1200);
            const height = Math.max(rect.height || 1200, 1200);

            const cx = width / 2;
            const cy = height / 2;
            // Use a larger radius for a fuller look (Barham style)
            const radius = Math.min(width, height) / 2 * 0.95;

            // Clear SVG
            const svg = d3.select(svgRef.current);
            svg.selectAll('*').remove();

            // Setup Zoom Group
            const g = svg.append('g').attr('class', 'tree-layer');
            const zoom = d3.zoom()
                .scaleExtent([0.1, 8])
                .on('zoom', (e) => g.attr('transform', e.transform));
            svg.call(zoom);

            // =========================================================
            // ALGORITHM: Weighted Radial Tree (360 Degrees)
            // OPTIMIZED: Fixed constants for consistent spacing across ALL branches
            // =========================================================

            // Calculate max depth for radial spacing logic
            const maxDepth = root.height;
            const totalNodes = root.descendants().length;

            // ==================== FIXED CONFIGURATION (Barham Style) ====================
            // These values ensure consistent spacing regardless of branch size
            const CONFIG = {
                // Separation between nodes (fixed values - not dependent on tree size)
                SIBLING_SEPARATION: 2.5,      // Space between brothers (same parent)
                COUSIN_SEPARATION: 5,         // Space between cousins (different parents)

                // Radial distance between generations (fixed per depth level)
                GENERATION_BASE_DISTANCE: 100,  // Minimum distance from center to first generation
                GENERATION_STEP: 80,           // Fixed distance between each generation level
                GENERATION_EXTRA_PADDING: 25,  // Additional padding per depth level

                // Minimum arc space per node (prevents crowding in large branches)
                MIN_ARC_SPACE: 0.08,           // Minimum radians per node
            };

            // Calculate separation dynamically based on tree density
            const leafCount = root.leaves().length;
            const densityFactor = Math.max(1, leafCount / 20); // Scale separation for large trees

            const tree = d3.tree()
                .size([2 * Math.PI, radius])
                .separation((a, b) => {
                    // Fixed separation values - consistent across all branches
                    const sameSibling = a.parent === b.parent;

                    // Apply consistent separation with slight adjustment for very large branches
                    const baseSeparation = sameSibling
                        ? CONFIG.SIBLING_SEPARATION
                        : CONFIG.COUSIN_SEPARATION;

                    // Ensure minimum arc space for readability
                    const depthMultiplier = Math.max(1, (6 - Math.min(a.depth, b.depth)) * 0.15);

                    return baseSeparation * depthMultiplier;
                });

            tree(root);

            // =========================================================
            // POST-PROCESS: Fixed radial distances for consistent spacing
            // =========================================================

            // Apply FIXED generation distances (not dependent on maxDepth ratio)
            root.each(node => {
                if (node.depth === 0) {
                    node.y = 0; // Root at center
                } else {
                    // Fixed formula: base + (depth * step) + (depth * extra padding)
                    node.y = CONFIG.GENERATION_BASE_DISTANCE
                        + (node.depth * CONFIG.GENERATION_STEP)
                        + (node.depth * CONFIG.GENERATION_EXTRA_PADDING);
                }
            });

            // =========================================================
            // DRAW LINKS (BRANCHES)
            // =========================================================

            const linkGenerator = d3.linkRadial()
                .angle(d => d.x)
                .radius(d => d.y);

            g.selectAll('.link')
                .data(root.links())
                .enter()
                .append('path')
                .attr('class', 'link')
                .attr('fill', 'none')
                .attr('stroke', COLORS.branch)
                // Thinner branches to avoid overlap
                .attr('stroke-width', d => Math.max(1, 8 - d.target.depth * 1.5))
                .attr('stroke-opacity', 0.7)
                .attr('stroke-linecap', 'round')
                .attr('d', linkGenerator)
                .attr('transform', `translate(${cx},${cy})`);

            // =========================================================
            // DRAW CENTERS (Root Visuals)
            // =========================================================

            const trunkGroup = g.append('g').attr('class', 'trunk-group')
                .attr('transform', `translate(${cx}, ${cy})`);

            // Central Core Circle for Founder
            trunkGroup.append('circle')
                .attr('r', 40)
                .attr('fill', COLORS.trunk)
                .attr('stroke', COLORS.gold)
                .attr('stroke-width', 3)
                .style('filter', 'drop-shadow(0px 0px 10px rgba(93, 64, 55, 0.5))');

            trunkGroup.append('text')
                .attr('dy', '0.35em')
                .attr('text-anchor', 'middle')
                .attr('font-family', "'Cairo', sans-serif")
                .attr('font-weight', '800')
                .attr('fill', COLORS.gold)
                .attr('font-size', '14px')
                .text(root.data.fullName || "محمد الشاعر");

            // =========================================================
            // DRAW LEAVES (NODES) - Enhanced for Parents & Children
            // =========================================================

            // Calculate siblings count for each node to determine leaf size
            const getSiblingCount = (node) => {
                if (!node.parent) return 1;
                return node.parent.children?.length || 1;
            };

            // Check if node is a main patriarch (depth 1 or 2 with children)
            const isMainPatriarch = (node) => {
                return (node.depth <= 2 && node.children && node.children.length > 0);
            };

            // Get different colors for different levels
            const getNodeColor = (node) => {
                if (node.depth === 1) {
                    return { fill: '#8B4513', stroke: '#5D3A1A', textColor: '#FFD700' }; // Brown/Gold for main branches
                } else if (node.depth === 2 && node.children && node.children.length > 0) {
                    return { fill: '#2E7D32', stroke: '#1B5E20', textColor: '#FFFFFF' }; // Darker green for sub-branches
                }
                return { fill: COLORS.leafFill, stroke: COLORS.leafStroke, textColor: 'white' };
            };

            const nodes = g.selectAll('.node')
                .data(root.descendants().slice(1)) // Skip root
                .enter()
                .append('g')
                .attr('class', d => `node ${isMainPatriarch(d) ? 'patriarch' : 'regular'}`)
                .attr('transform', d => {
                    const r = d.y;
                    const a = d.x - Math.PI / 2;
                    const x = r * Math.cos(a);
                    const y = r * Math.sin(a);
                    return `translate(${cx + x}, ${cy + y})`;
                })
                .style('cursor', 'pointer')
                .on('click', (e, d) => {
                    e.stopPropagation();
                    setSelectedNode(d.data);
                    if (onNodeClick) {
                        // Build full ancestry chain by traversing up the tree
                        const ancestors = [];
                        let current = d.parent;
                        while (current) {
                            ancestors.push({
                                _id: current.data._id,
                                fullName: current.data.fullName
                            });
                            current = current.parent;
                        }

                        // Include parent (father) and full ancestry
                        const nodeWithAncestry = {
                            ...d.data,
                            parentNode: d.parent ? d.parent.data : null,
                            ancestors: ancestors // Full lineage chain
                        };
                        onNodeClick(nodeWithAncestry);
                    }
                });

            // ==================== FIXED LEAF SIZES (Consistent across all branches) ====================
            // These fixed values ensure uniform appearance regardless of family size
            const LEAF_SIZES = {
                // Patriarch (depth 1-2 with children) - main branch heads
                PATRIARCH_W: 75,
                PATRIARCH_H: 35,

                // Regular nodes - fixed size for consistency
                REGULAR_W: 50,      // Fixed width for all regular leaves
                REGULAR_H: 22,      // Fixed height for all regular leaves

                // Sub-patriarch (depth 2 with children)
                SUB_PATRIARCH_SCALE: 0.85
            };

            nodes.append('ellipse')
                .attr('rx', d => {
                    // Patriots are larger
                    if (isMainPatriarch(d)) {
                        return d.depth === 1
                            ? LEAF_SIZES.PATRIARCH_W / 2
                            : (LEAF_SIZES.PATRIARCH_W / 2) * LEAF_SIZES.SUB_PATRIARCH_SCALE;
                    }
                    // Regular nodes - FIXED size (no dynamic scaling)
                    return LEAF_SIZES.REGULAR_W / 2;
                })
                .attr('ry', d => {
                    if (isMainPatriarch(d)) {
                        return d.depth === 1
                            ? LEAF_SIZES.PATRIARCH_H / 2
                            : (LEAF_SIZES.PATRIARCH_H / 2) * LEAF_SIZES.SUB_PATRIARCH_SCALE;
                    }
                    // Regular nodes - FIXED size (no dynamic scaling)
                    return LEAF_SIZES.REGULAR_H / 2;
                })
                .attr('fill', d => getNodeColor(d).fill)
                .attr('stroke', d => getNodeColor(d).stroke)
                .attr('stroke-width', d => isMainPatriarch(d) ? 3 : 1.5)
                .attr('transform', d => {
                    const angleDeg = (d.x * 180 / Math.PI) - 90;
                    return `rotate(${angleDeg})`;
                })
                .style('filter', d => isMainPatriarch(d) ? 'drop-shadow(0px 2px 4px rgba(0,0,0,0.3))' : 'none')
                .on('mouseover', function (e, d) {
                    if (isMainPatriarch(d)) {
                        d3.select(this).attr('fill', '#A0522D').attr('stroke', COLORS.gold);
                    } else {
                        d3.select(this).attr('fill', '#4CAF50').attr('stroke', COLORS.gold);
                    }
                })
                .on('mouseout', function (e, d) {
                    const colors = getNodeColor(d);
                    d3.select(this).attr('fill', colors.fill).attr('stroke', colors.stroke);
                });

            // Draw small connecting dots for patriarchs to show they have children
            nodes.filter(d => isMainPatriarch(d))
                .append('circle')
                .attr('r', 4)
                .attr('fill', COLORS.gold)
                .attr('cx', d => {
                    const angleDeg = (d.x * 180 / Math.PI) - 90;
                    const rad = angleDeg * Math.PI / 180;
                    return Math.cos(rad) * (LEAF_SIZES.PATRIARCH_W / 2 + 8);
                })
                .attr('cy', d => {
                    const angleDeg = (d.x * 180 / Math.PI) - 90;
                    const rad = angleDeg * Math.PI / 180;
                    return Math.sin(rad) * (LEAF_SIZES.PATRIARCH_W / 2 + 8);
                })
                .style('filter', 'drop-shadow(0px 0px 3px rgba(255,215,0,0.8))');

            // Leaf Labels - FIXED font sizes for consistency across all branches
            const FONT_SIZES = {
                PATRIARCH_DEPTH1: '13px',
                PATRIARCH_DEPTH2: '11px',
                REGULAR: '9px'  // Fixed font size for regular nodes
            };

            nodes.append('text')
                .attr('dy', '0.35em')
                .attr('text-anchor', 'middle')
                .attr('font-family', "'Cairo', sans-serif")
                .attr('font-size', d => {
                    if (isMainPatriarch(d)) {
                        return d.depth === 1 ? FONT_SIZES.PATRIARCH_DEPTH1 : FONT_SIZES.PATRIARCH_DEPTH2;
                    }
                    // FIXED font size for regular nodes (no dynamic scaling)
                    return FONT_SIZES.REGULAR;
                })
                .attr('font-weight', d => isMainPatriarch(d) ? '800' : '600')
                .attr('fill', d => getNodeColor(d).textColor)
                .text(d => {
                    if (!d.data.fullName) return '';
                    const name = d.data.fullName.trim();
                    const words = name.split(' ');

                    // Handle compound Arabic names
                    const compoundPrefixes = ['أبو', 'ابو', 'عبد', 'عبدال', 'ابن', 'أم', 'ام', 'بنت'];
                    const firstWord = words[0];

                    // If first word is a compound prefix and there's a second word, combine them
                    if (words.length > 1 && compoundPrefixes.some(prefix => firstWord === prefix || firstWord.startsWith(prefix))) {
                        return words[0] + ' ' + words[1];
                    }

                    // For short names or single words, return as is
                    if (name.length <= 10 || words.length === 1) {
                        return name;
                    }

                    // Otherwise return first word only
                    return firstWord;
                })
                .attr('transform', d => {
                    let angleDeg = (d.x * 180 / Math.PI) - 90;

                    // SMART ROTATION 360:
                    let normalizedAngle = angleDeg % 360;
                    if (normalizedAngle < 0) normalizedAngle += 360;

                    if (normalizedAngle > 90 && normalizedAngle < 270) {
                        angleDeg += 180;
                    }

                    return `rotate(${angleDeg})`;
                });

            nodes.append('title').text(d => d.data.fullName);

            // Initial Zoom to fit center
            const initialScale = 0.95;
            svg.call(zoom.transform, d3.zoomIdentity
                .translate(width / 2, height / 2)
                .scale(initialScale)
                .translate(-cx, -cy)
            );

        } catch (err) {
            console.error("Error rendering tree:", err);
            setRenderError("حدث خطأ أثناء رسم الشجرة: " + err.message);
        }

    }, [processedData]);

    if (renderError) {
        return (
            <div className="flex items-center justify-center w-full h-full bg-[#F9F9F0] text-red-600">
                <div className="text-center">
                    <p className="text-xl font-bold mb-2">⚠️ عذراً</p>
                    <p>{renderError}</p>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="w-full h-full relative bg-[#F9F9F0] overflow-hidden" dir="rtl">
            <svg ref={svgRef} className="w-full h-full block touch-action-none" />
        </div>
    );
};

export default OrganicOliveTree;
