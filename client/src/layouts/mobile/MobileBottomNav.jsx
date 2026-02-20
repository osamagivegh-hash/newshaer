/**
 * Mobile Bottom Navigation
 * ========================
 * App-like bottom navigation bar for mobile layout.
 * Features:
 * - Fixed at bottom of screen (safe area aware)
 * - Large touch targets (minimum 48px)
 * - Active state indicators
 * - Smooth transitions
 * - RTL layout support
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLayout, MOBILE_SECTIONS } from '../../contexts/LayoutContext';

// Icon components for navigation items
const NavIcon = ({ type, isActive }) => {
    const iconColor = isActive ? 'currentColor' : '#666666';
    const iconSize = 24;

    const icons = {
        home: (
            <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
        ),
        tree: (
            <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="5" r="3" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <path d="M7 12h10" />
                <line x1="7" y1="12" x2="7" y2="16" />
                <line x1="17" y1="12" x2="17" y2="16" />
                <circle cx="7" cy="19" r="3" />
                <circle cx="17" cy="19" r="3" />
            </svg>
        ),
        news: (
            <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 22h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2" />
                <path d="M2 10a2 2 0 0 1 2-2h4v12H4a2 2 0 0 1-2-2V10z" />
                <line x1="10" y1="8" x2="18" y2="8" />
                <line x1="10" y1="12" x2="18" y2="12" />
                <line x1="10" y1="16" x2="14" y2="16" />
            </svg>
        ),
        articles: (
            <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <line x1="10" y1="9" x2="8" y2="9" />
            </svg>
        ),
        more: (
            <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="5" cy="12" r="1" />
            </svg>
        ),
        chat: (
            <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
        ),
        flag: (
            <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
        ),
        gallery: (
            <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
            </svg>
        ),
        contact: (
            <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
        ),
        forum: (
            <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
        )
    };

    return icons[type] || icons.more;
};

const MobileBottomNav = () => {
    const navigate = useNavigate();
    const {
        activeSection,
        navigateToSection,
        toggleMoreMenu,
        isMoreMenuOpen,
        subSections
    } = useLayout();

    // Check if current section is in subsections (show "more" as active)
    const isInSubSection = subSections?.some(s => s.id === activeSection);

    return (
        <>
            {/* More Menu Overlay */}
            {isMoreMenuOpen && (
                <div
                    className="mobile-more-overlay"
                    onClick={toggleMoreMenu}
                >
                    <div
                        className="mobile-more-menu"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="more-menu-header">
                            <h3>المزيد من الأقسام</h3>
                            <button
                                className="more-menu-close"
                                onClick={toggleMoreMenu}
                                aria-label="إغلاق"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <div className="more-menu-grid">
                            {subSections?.map((item) => (
                                <button
                                    key={item.id}
                                    className={`more-menu-item ${activeSection === item.id ? 'active' : ''}`}
                                    onClick={() => {
                                        if (item.id === 'forum') {
                                            navigate('/family-tree/forum');
                                            toggleMoreMenu();
                                        } else {
                                            navigateToSection(item.id);
                                        }
                                    }}
                                    style={{ '--item-color': item.color }}
                                >
                                    <div className="more-menu-item-icon">
                                        <NavIcon type={item.icon} isActive={activeSection === item.id} />
                                    </div>
                                    <span className="more-menu-item-label">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Navigation Bar */}
            <nav className="mobile-bottom-nav" role="navigation" aria-label="التنقل الرئيسي">
                <div className="mobile-bottom-nav-inner">
                    {MOBILE_SECTIONS.map((item) => {
                        const isActive = item.id === 'more'
                            ? (isMoreMenuOpen || isInSubSection)
                            : activeSection === item.id;

                        return (
                            <button
                                key={item.id}
                                className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                                onClick={() => {
                                    if (item.id === 'more') {
                                        toggleMoreMenu();
                                    } else {
                                        navigateToSection(item.id);
                                    }
                                }}
                                aria-current={isActive ? 'page' : undefined}
                                aria-label={item.label}
                                style={{ '--active-color': item.color }}
                            >
                                <div className="mobile-nav-item-icon">
                                    <NavIcon type={item.icon} isActive={isActive} />
                                </div>
                                <span className="mobile-nav-item-label">{item.label}</span>
                                {isActive && <div className="mobile-nav-item-indicator" />}
                            </button>
                        );
                    })}
                </div>
            </nav>
        </>
    );
};

export default MobileBottomNav;
