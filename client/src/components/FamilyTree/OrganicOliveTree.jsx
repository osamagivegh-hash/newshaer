/**
 * شجرة الزيتون المباركة - تصميم واقعي
 * Blessed Olive Tree - Realistic Design
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';

const OrganicOliveTree = ({ data, onNodeClick, className = '', style = {}, isFullTreeMode = false }) => {
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const [renderError, setRenderError] = useState(null);

    // ==================== REALISTIC OLIVE LEAF SVG PATH ====================
    // Pointed olive leaf shape - elongated ellipse with pointed ends
    const createLeafPath = (width, height) => {
        const w = width / 2;
        const h = height / 2;
        return `M0,${-h} 
                C${w * 0.6},${-h * 0.8} ${w},${-h * 0.3} ${w},0 
                C${w},${h * 0.3} ${w * 0.6},${h * 0.8} 0,${h} 
                C${-w * 0.6},${h * 0.8} ${-w},${h * 0.3} ${-w},0 
                C${-w},${-h * 0.3} ${-w * 0.6},${-h * 0.8} 0,${-h}Z`;
    };

    // ==================== DATA PROCESSING ====================
    const processedData = useMemo(() => {
        try {
            if (!data || Object.keys(data).length === 0) return null;

            const root = d3.hierarchy(data)
                .sort((a, b) => (b.height - a.height) || (a.data.fullName || "").localeCompare(b.data.fullName || ""));

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

            // ========== CANVAS SIZE ==========
            // MASSIVE canvas for spacing - 8000px for full tree
            let width, height;

            if (isFullTreeMode) {
                width = 8000;
                height = 8000;
            } else {
                const rect = containerRef.current.getBoundingClientRect();
                width = Math.max(rect.width || 1500, 1500);
                height = Math.max(rect.height || 1500, 1500);
            }

            const cx = width / 2;
            const cy = height / 2;

            // Large radius with plenty of margin
            const radius = Math.min(width, height) / 2 * 0.85;

            // Clear SVG
            const svg = d3.select(svgRef.current);
            svg.selectAll('*').remove();

            svg.attr('viewBox', `0 0 ${width} ${height}`)
                .attr('width', width)
                .attr('height', height)
                .attr('xmlns', 'http://www.w3.org/2000/svg');

            // Main group
            const g = svg.append('g').attr('class', 'tree-layer');

            // Zoom controls
            const zoom = d3.zoom()
                .scaleExtent([0.05, 15])
                .on('zoom', (e) => g.attr('transform', e.transform));

            svg.call(zoom);

            // Initial zoom - zoom out more for full tree
            const initialScale = isFullTreeMode ? 0.4 : 0.7;
            svg.call(zoom.transform, d3.zoomIdentity
                .translate(width / 2, height / 2)
                .scale(initialScale)
                .translate(-cx, -cy)
            );

            // ========== LAYOUT ALGORITHM ==========
            const maxDepth = root.height;
            const totalNodes = root.descendants().length;

            // Dynamic spacing based on tree size
            const spacingMultiplier = Math.max(3, Math.sqrt(totalNodes) / 2);

            const tree = d3.tree()
                .size([2 * Math.PI, radius])
                .separation((a, b) => {
                    const sameSibling = a.parent === b.parent;
                    // MASSIVE separation - scales with tree complexity
                    const baseSep = sameSibling ? 15 : 40;
                    const depthFactor = Math.max(1, 2 - a.depth * 0.15);
                    return (baseSep * depthFactor * spacingMultiplier) / (a.depth + 1);
                });

            tree(root);

            // Adjust radial distances - more space between generations
            const generationGap = radius / (maxDepth + 1) * 1.5;

            root.each(node => {
                node.y = node.depth * generationGap + (node.depth > 0 ? 150 : 0);
            });

            // ========== DRAW BACKGROUND GRADIENT ==========
            const defs = svg.append('defs');

            // Radial gradient for subtle background
            const bgGradient = defs.append('radialGradient')
                .attr('id', 'bgGradient')
                .attr('cx', '50%').attr('cy', '50%').attr('r', '50%');
            bgGradient.append('stop').attr('offset', '0%').attr('stop-color', '#FFFEF5');
            bgGradient.append('stop').attr('offset', '100%').attr('stop-color', '#F5F0E1');

            g.append('circle')
                .attr('cx', cx).attr('cy', cy)
                .attr('r', radius * 1.2)
                .attr('fill', 'url(#bgGradient)');

            // ========== DRAW BRANCHES ==========
            const branchGenerator = (d) => {
                const angle = d.x - Math.PI / 2;
                const r = d.y;
                const parentAngle = d.parent.x - Math.PI / 2;
                const parentR = d.parent.y;

                const x0 = parentR * Math.cos(parentAngle);
                const y0 = parentR * Math.sin(parentAngle);
                const x1 = r * Math.cos(angle);
                const y1 = r * Math.sin(angle);

                // Organic bezier curves
                const midR = (parentR + r) / 2;
                const cp1x = midR * Math.cos(parentAngle);
                const cp1y = midR * Math.sin(parentAngle);
                const cp2x = midR * Math.cos(angle);
                const cp2y = midR * Math.sin(angle);

                return `M${cx + x0},${cy + y0} C${cx + cp1x},${cy + cp1y} ${cx + cp2x},${cy + cp2y} ${cx + x1},${cy + y1}`;
            };

            // Branch gradient (wood color)
            const branchGradient = defs.append('linearGradient')
                .attr('id', 'branchGradient')
                .attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '100%');
            branchGradient.append('stop').attr('offset', '0%').attr('stop-color', '#5D4037');
            branchGradient.append('stop').attr('offset', '100%').attr('stop-color', '#3E2723');

            g.selectAll('.link')
                .data(root.descendants().slice(1))
                .enter()
                .append('path')
                .attr('class', 'link')
                .attr('fill', 'none')
                .attr('stroke', 'url(#branchGradient)')
                .attr('stroke-width', d => Math.max(3, 25 - d.depth * 4))
                .attr('stroke-linecap', 'round')
                .attr('d', branchGenerator)
                .style('opacity', 0.9);

            // ========== DRAW TRUNK ==========
            const trunkGroup = g.append('g')
                .attr('transform', `translate(${cx}, ${cy})`);

            // Large artistic trunk
            trunkGroup.append('ellipse')
                .attr('rx', 80)
                .attr('ry', 100)
                .attr('fill', '#4E342E')
                .attr('stroke', '#3E2723')
                .attr('stroke-width', 4);

            // Inner trunk detail
            trunkGroup.append('ellipse')
                .attr('rx', 60)
                .attr('ry', 75)
                .attr('fill', '#5D4037');

            // Founder name on trunk
            trunkGroup.append('text')
                .attr('y', 5)
                .attr('text-anchor', 'middle')
                .attr('fill', '#FFD700')
                .attr('font-family', "'Cairo', sans-serif")
                .attr('font-size', '28px')
                .attr('font-weight', 'bold')
                .style('text-shadow', '2px 2px 4px rgba(0,0,0,0.5)')
                .text(root.data.fullName || "محمد الشاعر");

            // ========== DRAW LEAVES ==========
            // Leaf gradient
            const leafGradient = defs.append('linearGradient')
                .attr('id', 'leafGradient')
                .attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '100%');
            leafGradient.append('stop').attr('offset', '0%').attr('stop-color', '#4CAF50');
            leafGradient.append('stop').attr('offset', '100%').attr('stop-color', '#2E7D32');

            const darkLeafGradient = defs.append('linearGradient')
                .attr('id', 'darkLeafGradient')
                .attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '100%');
            darkLeafGradient.append('stop').attr('offset', '0%').attr('stop-color', '#388E3C');
            darkLeafGradient.append('stop').attr('offset', '100%').attr('stop-color', '#1B5E20');

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
                    if (onNodeClick) {
                        const ancestors = [];
                        let current = d.parent;
                        while (current && current.depth > 0) {
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

            // Draw realistic olive leaves
            const leafWidth = isFullTreeMode ? 80 : 50;
            const leafHeight = isFullTreeMode ? 140 : 90;
            const smallLeafWidth = isFullTreeMode ? 60 : 40;
            const smallLeafHeight = isFullTreeMode ? 100 : 65;

            nodes.append('path')
                .attr('d', d => {
                    const w = d.children ? leafWidth : smallLeafWidth;
                    const h = d.children ? leafHeight : smallLeafHeight;
                    return createLeafPath(w, h);
                })
                .attr('fill', d => d.children ? 'url(#darkLeafGradient)' : 'url(#leafGradient)')
                .attr('stroke', '#1B5E20')
                .attr('stroke-width', 2)
                .attr('transform', d => {
                    const angleDeg = (d.x * 180 / Math.PI) - 90;
                    return `rotate(${angleDeg})`;
                })
                .style('filter', 'drop-shadow(2px 4px 6px rgba(0,0,0,0.25))');

            // Leaf vein (central line)
            nodes.append('line')
                .attr('x1', 0)
                .attr('y1', d => -(d.children ? leafHeight : smallLeafHeight) / 2 + 10)
                .attr('x2', 0)
                .attr('y2', d => (d.children ? leafHeight : smallLeafHeight) / 2 - 10)
                .attr('stroke', '#1B5E20')
                .attr('stroke-width', 1.5)
                .attr('stroke-opacity', 0.5)
                .attr('transform', d => {
                    const angleDeg = (d.x * 180 / Math.PI) - 90;
                    return `rotate(${angleDeg})`;
                });

            // Text Labels - positioned OUTSIDE the leaf
            const fontSize = isFullTreeMode ? 28 : 18;
            const smallFontSize = isFullTreeMode ? 22 : 14;

            nodes.append('text')
                .attr('dy', '0.35em')
                .attr('text-anchor', d => {
                    const angleDeg = (d.x * 180 / Math.PI) % 360;
                    return (angleDeg > 90 && angleDeg < 270) ? "end" : "start";
                })
                .attr('transform', d => {
                    const angleDeg = (d.x * 180 / Math.PI) - 90;
                    const isLeft = (d.x * 180 / Math.PI) % 360 > 90 && (d.x * 180 / Math.PI) % 360 < 270;
                    const rotate = isLeft ? angleDeg + 180 : angleDeg;
                    // Text placed far outside the leaf
                    const offset = d.children ? (isFullTreeMode ? 120 : 80) : (isFullTreeMode ? 90 : 60);
                    return `rotate(${rotate}) translate(${isLeft ? -offset : offset}, 0)`;
                })
                .text(d => d.data.fullName)
                .attr('fill', '#2C1810')
                .attr('font-size', d => d.children ? fontSize + 'px' : smallFontSize + 'px')
                .attr('font-family', "'Cairo', sans-serif")
                .attr('font-weight', 'bold')
                .style('text-shadow', '0 0 8px white, 0 0 8px white, 0 0 8px white');

            nodes.append('title').text(d => d.data.fullName);

        } catch (err) {
            console.error("Error rendering tree:", err);
            setRenderError("حدث خطأ أثناء رسم الشجرة: " + err.message);
        }

    }, [processedData, isFullTreeMode]);

    if (renderError) {
        return <div className="text-red-600 p-4 text-center font-bold">{renderError}</div>;
    }

    return (
        <div ref={containerRef} className={`w-full h-full relative bg-[#FFFEF5] overflow-hidden ${className}`} dir="rtl" style={style}>
            <svg ref={svgRef} className="w-full h-full block" style={{ touchAction: 'none' }} />
        </div>
    );
};

export default OrganicOliveTree;
