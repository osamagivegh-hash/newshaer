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
            const height = Math.max(rect.height || 1200, 1200); // Improved height for full circle

            const cx = width / 2;
            const cy = height / 2; // Center exactly
            // Use a generous radius but keep padding for leaf labels
            const radius = Math.min(width, height) / 2 * 0.85;

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
            // ALGORITHM: Weighted Radial Tree (360 Degrees) - Anti-Overlap
            // =========================================================

            // Calculate the maximum depth and total leaves for better spacing
            const maxDepth = root.height;
            const totalLeaves = root.leaves().length;

            // Calculate dynamic spacing based on tree complexity
            // More leaves = need more angle separation
            const baseAnglePadding = Math.max(0.02, 0.1 / Math.sqrt(totalLeaves));

            // Use d3.tree() instead of d3.cluster() for better distribution
            // tree() spaces nodes based on their subtree size
            const tree = d3.tree()
                .size([2 * Math.PI, radius]) // 360 degrees
                .separation((a, b) => {
                    // Dynamic separation based on:
                    // 1. Sibling vs non-sibling
                    // 2. Depth level
                    // 3. Number of descendants (weight)
                    const sameSibling = a.parent === b.parent;
                    const aWeight = (a.value || 1) + (a.children?.length || 0);
                    const bWeight = (b.value || 1) + (b.children?.length || 0);
                    const avgWeight = (aWeight + bWeight) / 2;

                    // Base separation - SIGNIFICANTLY INCREASED
                    let sep = sameSibling ? 4 : 10;

                    // Add weight-based padding for nodes with many children - DOUBLED
                    sep += Math.log2(avgWeight + 1) * 1.2;

                    // Keep good spacing even at deeper levels
                    const depthFactor = Math.max(0.9, 1.6 - (a.depth * 0.08));
                    sep *= depthFactor;

                    return sep;
                });

            tree(root);

            // =========================================================
            // POST-PROCESS: Adjust radial distances for better spacing
            // =========================================================

            // Add MORE padding between generations for clearer separation
            const depthPadding = radius / (maxDepth + 1) * 0.5;
            root.each(node => {
                // Increase radius for each depth level with extra padding
                node.y = (node.depth / maxDepth) * radius + (node.depth * depthPadding);
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

            // Dynamic Leaf Graphics - ENHANCED for patriarch visibility
            const baseLeafW = 55;
            const baseLeafH = 24;
            const minLeafW = 35;
            const minLeafH = 16;

            // Patriarch (depth 1-2 with children) sizes
            const patriarchLeafW = 75;
            const patriarchLeafH = 35;

            nodes.append('ellipse')
                .attr('rx', d => {
                    // Patriots are larger
                    if (isMainPatriarch(d)) {
                        return d.depth === 1 ? patriarchLeafW / 2 : (patriarchLeafW / 2) * 0.85;
                    }
                    // Regular nodes
                    const siblings = getSiblingCount(d);
                    const scaleFactor = Math.max(0.6, 1 - (siblings - 1) * 0.05);
                    return Math.max(minLeafW / 2, (baseLeafW / 2) * scaleFactor);
                })
                .attr('ry', d => {
                    if (isMainPatriarch(d)) {
                        return d.depth === 1 ? patriarchLeafH / 2 : (patriarchLeafH / 2) * 0.85;
                    }
                    const siblings = getSiblingCount(d);
                    const scaleFactor = Math.max(0.6, 1 - (siblings - 1) * 0.05);
                    return Math.max(minLeafH / 2, (baseLeafH / 2) * scaleFactor);
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
                    return Math.cos(rad) * (patriarchLeafW / 2 + 8);
                })
                .attr('cy', d => {
                    const angleDeg = (d.x * 180 / Math.PI) - 90;
                    const rad = angleDeg * Math.PI / 180;
                    return Math.sin(rad) * (patriarchLeafW / 2 + 8);
                })
                .style('filter', 'drop-shadow(0px 0px 3px rgba(255,215,0,0.8))');

            // Leaf Labels - Dynamic font size with emphasis on patriarchs
            nodes.append('text')
                .attr('dy', '0.35em')
                .attr('text-anchor', 'middle')
                .attr('font-family', "'Cairo', sans-serif")
                .attr('font-size', d => {
                    if (isMainPatriarch(d)) {
                        return d.depth === 1 ? '13px' : '11px';
                    }
                    const siblings = getSiblingCount(d);
                    const baseSize = 10;
                    const minSize = 7;
                    const scaleFactor = Math.max(0.7, 1 - (siblings - 1) * 0.03);
                    return `${Math.max(minSize, baseSize * scaleFactor)}px`;
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
