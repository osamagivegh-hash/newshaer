/**
 * شجرة العائلة - إصدار "غصن الزيتون" - نسخة محسّنة لمنع التداخل
 * Organic Olive Branch - Enhanced Version with Anti-Overlap Algorithm
 * 
 * التحسينات:
 * 1. خوارزمية متقدمة لمنع تداخل الأوراق
 * 2. تمييز الآباء حتى الجيل الخامس بألوان وأحجام مختلفة
 * 3. مسافات ديناميكية تتكيف مع حجم الفرع
 * 4. عرض تدريجي للتفاصيل حسب مستوى التكبير
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';

// ==================== ENHANCED COLOR SCHEME ====================
const COLORS = {
    bg: '#F9F9F0',
    trunk: '#3E2723',
    branch: '#5D4037',
    branchLight: '#8D6E63',

    // Patriarch colors by depth (generations 1-5)
    patriarch: {
        1: { fill: '#B8860B', stroke: '#8B6914', text: '#FFFFFF', glow: 'rgba(184, 134, 11, 0.6)' },  // Dark Gold
        2: { fill: '#8B4513', stroke: '#5D3A1A', text: '#FFD700', glow: 'rgba(139, 69, 19, 0.5)' },   // Saddle Brown
        3: { fill: '#2E7D32', stroke: '#1B5E20', text: '#FFFFFF', glow: 'rgba(46, 125, 50, 0.5)' },   // Forest Green
        4: { fill: '#1565C0', stroke: '#0D47A1', text: '#FFFFFF', glow: 'rgba(21, 101, 192, 0.5)' },  // Blue
        5: { fill: '#6A1B9A', stroke: '#4A148C', text: '#FFFFFF', glow: 'rgba(106, 27, 154, 0.5)' }   // Purple
    },

    // Regular leaves
    leaf: {
        fill: '#4CAF50',
        stroke: '#2E7D32',
        text: '#FFFFFF'
    },

    // Leaf without children (final generation)
    leafFinal: {
        fill: '#81C784',
        stroke: '#4CAF50',
        text: '#1B5E20'
    },

    gold: '#FFD700',
    rootText: '#FFFFFF'
};

// ==================== ENHANCED CONFIGURATION ====================
const CONFIG = {
    // Dynamic separation based on tree size
    getConfig: (totalNodes, leafCount, maxDepth) => {
        const isSmall = totalNodes < 50;
        const isMedium = totalNodes >= 50 && totalNodes < 150;
        const isLarge = totalNodes >= 150 && totalNodes < 300;
        const isVeryLarge = totalNodes >= 300;

        // Base multipliers
        let separationMultiplier = 1;
        let radiusMultiplier = 1;

        if (isVeryLarge) {
            separationMultiplier = 2.5;
            radiusMultiplier = 2.5;
        } else if (isLarge) {
            separationMultiplier = 2.0;
            radiusMultiplier = 1.5;
        } else if (isMedium) {
            separationMultiplier = 1.5;
            radiusMultiplier = 1.2;
        }

        return {
            // Separation between siblings
            SIBLING_SEPARATION: 4 * separationMultiplier,
            COUSIN_SEPARATION: 8 * separationMultiplier,

            // Radial distances
            GENERATION_BASE_DISTANCE: 150 * radiusMultiplier,
            GENERATION_STEP: 120 * radiusMultiplier,
            GENERATION_EXTRA_PADDING: 40 * radiusMultiplier,

            // Extra padding for crowded areas
            MANY_SIBLINGS_THRESHOLD: 4,
            MANY_SIBLINGS_MULTIPLIER: 1.8,
            CROWDED_PARENT_MULTIPLIER: 2.0,

            // Deep generation bonuses
            DEEP_GENERATION_BONUS: 30 * radiusMultiplier,
            FINAL_GENERATION_BONUS: 50 * radiusMultiplier,

            // Scale factors
            separationMultiplier,
            radiusMultiplier
        };
    }
};

const OrganicOliveTree = ({ data, onNodeClick, className = '', style = {} }) => {
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const [selectedNode, setSelectedNode] = useState(null);
    const [renderError, setRenderError] = useState(null);
    const [zoomLevel, setZoomLevel] = useState(1);

    // ==================== DATA PROCESSING ====================
    const processedData = useMemo(() => {
        try {
            if (!data || Object.keys(data).length === 0) return null;

            // Create hierarchy with siblingOrder sorting
            const root = d3.hierarchy(data)
                .sort((a, b) => {
                    const orderA = a.data.siblingOrder || 0;
                    const orderB = b.data.siblingOrder || 0;
                    if (orderA !== orderB) {
                        return orderA - orderB;
                    }
                    return (a.data.fullName || "").localeCompare(b.data.fullName || "");
                });

            // Count leaves for weighting
            root.count();

            // Calculate statistics
            const totalNodes = root.descendants().length;
            const leafCount = root.leaves().length;
            const maxDepth = root.height;

            return { root, totalNodes, leafCount, maxDepth };
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
            const { root, totalNodes, leafCount, maxDepth } = processedData;

            // Get dynamic configuration
            const config = CONFIG.getConfig(totalNodes, leafCount, maxDepth);

            // Setup Dimensions
            const rect = containerRef.current.getBoundingClientRect();
            const baseWidth = Math.max(rect.width || 1400, 1400);
            const baseHeight = Math.max(rect.height || 1400, 1400);

            // Scale canvas based on tree size
            const width = baseWidth * config.radiusMultiplier;
            const height = baseHeight * config.radiusMultiplier;

            const cx = width / 2;
            const cy = height / 2;
            const radius = Math.min(width, height) / 2 * 0.92;

            // Clear SVG
            const svg = d3.select(svgRef.current);
            svg.selectAll('*').remove();

            // Setup SVG attributes
            svg.attr('viewBox', `0 0 ${width} ${height}`)
                .attr('preserveAspectRatio', 'xMidYMid meet');

            // Create defs for gradients and filters
            const defs = svg.append('defs');

            // Glow filters for patriarchs
            Object.entries(COLORS.patriarch).forEach(([depth, colors]) => {
                const filter = defs.append('filter')
                    .attr('id', `glow-depth-${depth}`)
                    .attr('x', '-50%').attr('y', '-50%')
                    .attr('width', '200%').attr('height', '200%');
                filter.append('feGaussianBlur')
                    .attr('stdDeviation', '3')
                    .attr('result', 'blur');
                filter.append('feFlood')
                    .attr('flood-color', colors.glow)
                    .attr('result', 'color');
                filter.append('feComposite')
                    .attr('in', 'color')
                    .attr('in2', 'blur')
                    .attr('operator', 'in')
                    .attr('result', 'shadow');
                const merge = filter.append('feMerge');
                merge.append('feMergeNode').attr('in', 'shadow');
                merge.append('feMergeNode').attr('in', 'SourceGraphic');
            });

            // Setup Zoom Group
            const g = svg.append('g').attr('class', 'tree-layer');
            const zoom = d3.zoom()
                .scaleExtent([0.1, 10])
                .on('zoom', (e) => {
                    g.attr('transform', e.transform);
                    setZoomLevel(e.transform.k);
                });
            svg.call(zoom);

            // =========================================================
            // ENHANCED TREE LAYOUT with Anti-Overlap Algorithm
            // =========================================================

            const tree = d3.tree()
                .size([2 * Math.PI, radius])
                .separation((a, b) => {
                    const sameSibling = a.parent === b.parent;
                    const currentDepth = Math.max(a.depth, b.depth);

                    // Get sibling counts
                    const aSiblingCount = a.parent?.children?.length || 1;
                    const bSiblingCount = b.parent?.children?.length || 1;
                    const maxSiblingCount = Math.max(aSiblingCount, bSiblingCount);

                    // Get descendant counts (for weighted separation)
                    const aDescendants = a.descendants().length;
                    const bDescendants = b.descendants().length;
                    const maxDescendants = Math.max(aDescendants, bDescendants);

                    // Base separation
                    let baseSeparation = sameSibling
                        ? config.SIBLING_SEPARATION
                        : config.COUSIN_SEPARATION;

                    // === ENHANCEMENT 1: Extra space for nodes with many siblings ===
                    if (maxSiblingCount >= config.MANY_SIBLINGS_THRESHOLD) {
                        baseSeparation *= config.MANY_SIBLINGS_MULTIPLIER;
                    }
                    if (maxSiblingCount >= 8) {
                        baseSeparation *= 1.5;
                    }
                    if (maxSiblingCount >= 12) {
                        baseSeparation *= 1.3;
                    }

                    // === ENHANCEMENT 2: Extra space for nodes with many descendants ===
                    if (maxDescendants > 20) {
                        baseSeparation *= 1 + (maxDescendants / 100);
                    }

                    // === ENHANCEMENT 3: Progressive increase for deeper generations ===
                    if (currentDepth >= 3 && currentDepth <= 5) {
                        baseSeparation *= 1.4;
                    } else if (currentDepth >= 6 && currentDepth <= 8) {
                        baseSeparation *= 1.8;
                    } else if (currentDepth > 8) {
                        baseSeparation *= 2.2;
                    }

                    // === ENHANCEMENT 4: Extra space for leaf nodes ===
                    if (!a.children && !b.children) {
                        baseSeparation *= 1.5;
                    }

                    return baseSeparation;
                });

            tree(root);

            // =========================================================
            // POST-PROCESS 1: Proportional Angular Allocation
            // Redistribute angles so each branch gets angular space
            // proportional to its leaf count - prevents overlap in dense branches
            // =========================================================

            const redistributeAngles = (node, startAngle = 0, endAngle = 2 * Math.PI) => {
                if (!node.children || node.children.length === 0) {
                    node.x = (startAngle + endAngle) / 2;
                    return;
                }

                // Weight each child by its leaf count
                const childWeights = node.children.map(child => {
                    const leaves = child.leaves().length;
                    return Math.max(leaves, 1);
                });
                const totalWeight = childWeights.reduce((a, b) => a + b, 0);

                // Gap between sibling groups (proportional to range, capped)
                const rangeAngle = endAngle - startAngle;
                const gapPerChild = node.children.length > 1
                    ? Math.min(0.04, rangeAngle * 0.04 / node.children.length)
                    : 0;
                const totalGap = gapPerChild * Math.max(0, node.children.length - 1);
                const usableAngle = rangeAngle - totalGap;

                let currentAngle = startAngle;
                node.children.forEach((child, i) => {
                    const fraction = childWeights[i] / totalWeight;
                    const childAngle = fraction * usableAngle;
                    const childStart = currentAngle;
                    const childEnd = currentAngle + childAngle;

                    redistributeAngles(child, childStart, childEnd);
                    currentAngle = childEnd + (i < node.children.length - 1 ? gapPerChild : 0);
                });

                // Position parent at the weighted center of its children
                const weightedSum = node.children.reduce((sum, child, i) => {
                    return sum + child.x * childWeights[i];
                }, 0);
                node.x = weightedSum / totalWeight;
            };

            redistributeAngles(root);

            // =========================================================
            // POST-PROCESS 2: Dynamic radial distances
            // =========================================================

            root.each(node => {
                if (node.depth === 0) {
                    node.y = 0;
                } else {
                    // Calculate children count in subtree for spacing
                    const subtreeSize = node.descendants().length;
                    const siblingCount = node.parent?.children?.length || 1;

                    // Base distance
                    let y = config.GENERATION_BASE_DISTANCE
                        + (node.depth * config.GENERATION_STEP)
                        + (node.depth * config.GENERATION_EXTRA_PADDING);

                    // Extra padding for deep generations
                    if (node.depth >= 3) {
                        y += config.DEEP_GENERATION_BONUS * (node.depth - 2);
                    }

                    // Extra padding for generations with many siblings
                    if (siblingCount >= 6) {
                        y += 20 * (siblingCount / 6);
                    }

                    // Extra padding for final generation
                    if (!node.children && node.depth >= maxDepth - 1) {
                        y += config.FINAL_GENERATION_BONUS;
                    }

                    // Scale for large subtrees
                    if (subtreeSize > 30) {
                        y *= 1 + (subtreeSize / 500);
                    }

                    node.y = y;
                }
            });

            // =========================================================
            // POST-PROCESS 3: Per-depth minimum radius
            // Ensure each depth level has enough circumference for its node count
            // =========================================================

            const depthInfo = {};
            const leafScale = totalNodes > 500 ? 0.7 : totalNodes > 200 ? 0.85 : 1;
            root.each(node => {
                if (node.depth === 0) return;
                if (!depthInfo[node.depth]) depthInfo[node.depth] = { count: 0, maxWidth: 0 };
                depthInfo[node.depth].count++;
                const hasKids = node.children && node.children.length > 0;
                const w = hasKids ? (node.depth <= 5 ? Math.max(30, 70 - node.depth * 8) * 1.8 : 50) : 40 * leafScale;
                depthInfo[node.depth].maxWidth = Math.max(depthInfo[node.depth].maxWidth, w);
            });

            root.each(node => {
                if (node.depth === 0) return;
                const info = depthInfo[node.depth];
                if (info && info.count > 1) {
                    const requiredCircum = info.count * (info.maxWidth + 12);
                    const requiredR = requiredCircum / (2 * Math.PI);
                    if (node.y < requiredR) {
                        node.y = requiredR;
                    }
                }
            });

            // =========================================================
            // POST-PROCESS 4: Local angular collision resolution
            // Push overlapping nodes apart by adjusting angles
            // =========================================================

            const allLayoutNodes = root.descendants().filter(n => n.depth > 0);

            const shiftSubtree = (node, delta) => {
                node.x += delta;
                if (node.children) node.children.forEach(c => shiftSubtree(c, delta));
            };

            for (let pass = 0; pass < 5; pass++) {
                // Group nodes by approximate radial distance (40px buckets)
                const buckets = {};
                allLayoutNodes.forEach(n => {
                    const bucket = Math.round(n.y / 40);
                    if (!buckets[bucket]) buckets[bucket] = [];
                    buckets[bucket].push(n);
                });

                for (const bucket of Object.values(buckets)) {
                    if (bucket.length <= 1) continue;
                    bucket.sort((a, b) => a.x - b.x);

                    for (let i = 0; i < bucket.length - 1; i++) {
                        const a = bucket[i], b = bucket[i + 1];
                        const avgR = (a.y + b.y) / 2;
                        if (avgR === 0) continue;

                        // Angular distance → physical distance
                        const angleDiff = b.x - a.x;
                        const arcDist = angleDiff * avgR;

                        // Min distance based on node size
                        const wA = (a.children ? 25 : 14 * leafScale);
                        const wB = (b.children ? 25 : 14 * leafScale);
                        const minDist = wA + wB + 2;

                        if (arcDist < minDist) {
                            const neededAngle = minDist / avgR;
                            const push = (neededAngle - angleDiff) / 2;
                            shiftSubtree(a, -push);
                            shiftSubtree(b, push);
                        }
                    }
                }
            }

            // =========================================================
            // DRAW LINKS (BRANCHES) with gradient thickness
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
                .attr('stroke', d => {
                    // Color branches based on depth
                    if (d.target.depth <= 2) return COLORS.trunk;
                    if (d.target.depth <= 4) return COLORS.branch;
                    return COLORS.branchLight;
                })
                .attr('stroke-width', d => {
                    // Thicker branches for patriarchs
                    const baseWidth = Math.max(1.5, 12 - d.target.depth * 1.5);
                    const descendants = d.target.descendants().length;
                    return baseWidth * Math.min(2, 1 + descendants / 100);
                })
                .attr('stroke-opacity', d => d.target.depth <= 3 ? 0.85 : 0.6)
                .attr('stroke-linecap', 'round')
                .attr('d', linkGenerator)
                .attr('transform', `translate(${cx},${cy})`);

            // =========================================================
            // DRAW ROOT (Center)
            // =========================================================

            const trunkGroup = g.append('g').attr('class', 'trunk-group')
                .attr('transform', `translate(${cx}, ${cy})`);

            // Outer glow ring
            trunkGroup.append('circle')
                .attr('r', 55)
                .attr('fill', 'none')
                .attr('stroke', COLORS.gold)
                .attr('stroke-width', 3)
                .attr('opacity', 0.3);

            // Main root circle
            trunkGroup.append('circle')
                .attr('r', 48)
                .attr('fill', COLORS.trunk)
                .attr('stroke', COLORS.gold)
                .attr('stroke-width', 4)
                .style('filter', 'drop-shadow(0px 0px 15px rgba(93, 64, 55, 0.7))');

            // Crown icon
            trunkGroup.append('text')
                .attr('dy', '-5')
                .attr('text-anchor', 'middle')
                .attr('font-size', '20px')
                .text('👑');

            // Root name
            trunkGroup.append('text')
                .attr('dy', '15')
                .attr('text-anchor', 'middle')
                .attr('font-family', "'Cairo', sans-serif")
                .attr('font-weight', '800')
                .attr('fill', COLORS.gold)
                .attr('font-size', '12px')
                .text(root.data.fullName || "الشاعر");

            // =========================================================
            // HELPER FUNCTIONS for Node Rendering
            // =========================================================

            // Check if node is a patriarch (has children and depth <= 5)
            const isPatriarch = (node) => {
                return node.children && node.children.length > 0 && node.depth <= 5;
            };

            // Get node styling based on depth and type
            const getNodeStyle = (node) => {
                const depth = node.depth;
                const hasChildren = node.children && node.children.length > 0;

                if (depth <= 5 && hasChildren) {
                    // Patriarch styling
                    const colors = COLORS.patriarch[depth] || COLORS.patriarch[5];
                    const baseSize = Math.max(30, 70 - depth * 8);
                    return {
                        width: baseSize * 1.8,
                        height: baseSize,
                        fill: colors.fill,
                        stroke: colors.stroke,
                        textColor: colors.text,
                        fontSize: Math.max(10, 16 - depth),
                        fontWeight: '700',
                        filter: `url(#glow-depth-${depth})`,
                        isPatriarch: true
                    };
                } else if (!hasChildren) {
                    // Leaf node (no children) - scale down for dense trees
                    const leafScale = totalNodes > 500 ? 0.7 : totalNodes > 200 ? 0.85 : 1;
                    return {
                        width: 40 * leafScale,
                        height: 18 * leafScale,
                        fill: COLORS.leafFinal.fill,
                        stroke: COLORS.leafFinal.stroke,
                        textColor: COLORS.leafFinal.text,
                        fontSize: Math.round(8 * leafScale),
                        fontWeight: '500',
                        filter: 'none',
                        isPatriarch: false
                    };
                } else {
                    // Regular parent (depth > 5)
                    return {
                        width: 50,
                        height: 22,
                        fill: COLORS.leaf.fill,
                        stroke: COLORS.leaf.stroke,
                        textColor: COLORS.leaf.text,
                        fontSize: 9,
                        fontWeight: '600',
                        filter: 'none',
                        isPatriarch: false
                    };
                }
            };

            // Format name for display
            const formatName = (node) => {
                if (!node.data.fullName) return '';
                const name = node.data.fullName.trim();
                const words = name.split(' ');
                const style = getNodeStyle(node);

                // Compound Arabic prefixes
                const compoundPrefixes = ['أبو', 'ابو', 'عبد', 'عبدال', 'ابن', 'أم', 'ام', 'بنت'];
                const firstWord = words[0];

                // Patriarchs show more of the name
                if (style.isPatriarch) {
                    if (words.length > 1 && compoundPrefixes.some(p => firstWord === p || firstWord.startsWith(p))) {
                        return words.slice(0, 2).join(' ');
                    }
                    if (name.length <= 15) return name;
                    return words.slice(0, 2).join(' ');
                }

                // Regular nodes show first word only
                if (words.length > 1 && compoundPrefixes.some(p => firstWord === p || firstWord.startsWith(p))) {
                    return words[0] + ' ' + words[1];
                }
                if (name.length <= 8) return name;
                return firstWord;
            };

            // =========================================================
            // DRAW NODES
            // =========================================================

            const nodes = g.selectAll('.node')
                .data(root.descendants().slice(1))
                .enter()
                .append('g')
                .attr('class', d => `node depth-${d.depth} ${isPatriarch(d) ? 'patriarch' : 'regular'}`)
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
                        const ancestors = [];
                        let current = d.parent;
                        while (current) {
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

            // Draw ellipse for each node
            nodes.append('ellipse')
                .attr('rx', d => getNodeStyle(d).width / 2)
                .attr('ry', d => getNodeStyle(d).height / 2)
                .attr('fill', d => getNodeStyle(d).fill)
                .attr('stroke', d => getNodeStyle(d).stroke)
                .attr('stroke-width', d => isPatriarch(d) ? 3 : 1.5)
                .attr('transform', d => {
                    const angleDeg = (d.x * 180 / Math.PI) - 90;
                    return `rotate(${angleDeg})`;
                })
                .style('filter', d => getNodeStyle(d).filter)
                .on('mouseover', function (e, d) {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('stroke', COLORS.gold)
                        .attr('stroke-width', 4);
                })
                .on('mouseout', function (e, d) {
                    const style = getNodeStyle(d);
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('stroke', style.stroke)
                        .attr('stroke-width', isPatriarch(d) ? 3 : 1.5);
                });

            // Add children count indicator for patriarchs
            nodes.filter(d => isPatriarch(d))
                .append('circle')
                .attr('r', 8)
                .attr('fill', COLORS.gold)
                .attr('stroke', '#fff')
                .attr('stroke-width', 1.5)
                .attr('cx', d => {
                    const angleDeg = (d.x * 180 / Math.PI) - 90;
                    const rad = angleDeg * Math.PI / 180;
                    const style = getNodeStyle(d);
                    return Math.cos(rad) * (style.width / 2 + 12);
                })
                .attr('cy', d => {
                    const angleDeg = (d.x * 180 / Math.PI) - 90;
                    const rad = angleDeg * Math.PI / 180;
                    const style = getNodeStyle(d);
                    return Math.sin(rad) * (style.width / 2 + 12);
                });

            // Children count text
            nodes.filter(d => isPatriarch(d))
                .append('text')
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'central')
                .attr('font-size', '7px')
                .attr('font-weight', 'bold')
                .attr('fill', '#000')
                .attr('x', d => {
                    const angleDeg = (d.x * 180 / Math.PI) - 90;
                    const rad = angleDeg * Math.PI / 180;
                    const style = getNodeStyle(d);
                    return Math.cos(rad) * (style.width / 2 + 12);
                })
                .attr('y', d => {
                    const angleDeg = (d.x * 180 / Math.PI) - 90;
                    const rad = angleDeg * Math.PI / 180;
                    const style = getNodeStyle(d);
                    return Math.sin(rad) * (style.width / 2 + 12);
                })
                .text(d => d.children.length);

            // Node labels
            nodes.append('text')
                .attr('dy', '0.35em')
                .attr('text-anchor', 'middle')
                .attr('font-family', "'Cairo', sans-serif")
                .attr('font-size', d => `${getNodeStyle(d).fontSize}px`)
                .attr('font-weight', d => getNodeStyle(d).fontWeight)
                .attr('fill', d => getNodeStyle(d).textColor)
                .text(d => formatName(d))
                .attr('transform', d => {
                    let angleDeg = (d.x * 180 / Math.PI) - 90;
                    let normalizedAngle = angleDeg % 360;
                    if (normalizedAngle < 0) normalizedAngle += 360;
                    if (normalizedAngle > 90 && normalizedAngle < 270) {
                        angleDeg += 180;
                    }
                    return `rotate(${angleDeg})`;
                });

            // Tooltips
            nodes.append('title')
                .text(d => {
                    const childCount = d.children ? d.children.length : 0;
                    const descendantCount = d.descendants().length - 1;
                    let tooltip = d.data.fullName || 'غير معروف';
                    if (childCount > 0) {
                        tooltip += `\n👶 ${childCount} أبناء مباشرين`;
                        tooltip += `\n👥 ${descendantCount} من الذرية`;
                    }
                    tooltip += `\n🌳 الجيل ${d.depth}`;
                    return tooltip;
                });

            // =========================================================
            // INITIAL VIEW - Zoom to fit
            // =========================================================

            const initialScale = 0.6 / config.radiusMultiplier;
            svg.call(zoom.transform, d3.zoomIdentity
                .translate(rect.width / 2, rect.height / 2)
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
            {/* Legend */}
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg z-10 text-sm border border-amber-200">
                <h3 className="font-bold mb-3 text-gray-800 border-b pb-2">🌳 دليل الألوان:</h3>
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="w-5 h-3 rounded-full" style={{ backgroundColor: COLORS.patriarch[1].fill }}></span>
                        <span className="text-xs">الجيل الأول (الأبناء)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-5 h-3 rounded-full" style={{ backgroundColor: COLORS.patriarch[2].fill }}></span>
                        <span className="text-xs">الجيل الثاني (الأحفاد)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-5 h-3 rounded-full" style={{ backgroundColor: COLORS.patriarch[3].fill }}></span>
                        <span className="text-xs">الجيل الثالث</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-5 h-3 rounded-full" style={{ backgroundColor: COLORS.patriarch[4].fill }}></span>
                        <span className="text-xs">الجيل الرابع</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-5 h-3 rounded-full" style={{ backgroundColor: COLORS.patriarch[5].fill }}></span>
                        <span className="text-xs">الجيل الخامس</span>
                    </div>
                    <div className="flex items-center gap-2 border-t pt-2 mt-2">
                        <span className="w-5 h-3 rounded-full" style={{ backgroundColor: COLORS.leaf.fill }}></span>
                        <span className="text-xs">آباء (جيل 6+)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-5 h-3 rounded-full" style={{ backgroundColor: COLORS.leafFinal.fill }}></span>
                        <span className="text-xs">أوراق الشجرة (بدون أبناء)</span>
                    </div>
                </div>
            </div>

            {/* Zoom indicator */}
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-xs z-10">
                🔍 {Math.round(zoomLevel * 100)}%
            </div>

            {/* Statistics */}
            {processedData && (
                <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg z-10 text-sm border border-amber-200">
                    <div className="flex gap-4">
                        <span>👥 {processedData.totalNodes} فرد</span>
                        <span>🌿 {processedData.leafCount} ورقة</span>
                        <span>📊 {processedData.maxDepth} أجيال</span>
                    </div>
                </div>
            )}

            {/* Instructions */}
            <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 text-white text-xs z-10">
                🖱️ اسحب للتنقل • 🔍 قرّب للتكبير • 👆 اضغط للتفاصيل
            </div>

            <svg ref={svgRef} className="w-full h-full block touch-action-none" />
        </div>
    );
};

export default OrganicOliveTree;
