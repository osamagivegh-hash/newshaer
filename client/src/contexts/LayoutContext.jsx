/**
 * Layout Context
 * ==============
 * Provides layout-related state and functions across the app.
 * Manages mobile navigation state, active section, and layout preferences.
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useDeviceDetection } from '../hooks/useDeviceDetection';

// Section definitions for mobile navigation
export const MOBILE_SECTIONS = [
    { id: 'home', label: 'الرئيسية', icon: 'home', color: '#007A3D' },
    { id: 'family-tree', label: 'الشجرة', icon: 'tree', color: '#CE1126' },
    { id: 'news', label: 'الأخبار', icon: 'news', color: '#1a1a1a' },
    { id: 'articles', label: 'مقالات', icon: 'articles', color: '#007A3D' },
    { id: 'more', label: 'المزيد', icon: 'more', color: '#666666' }
];

// Sub-sections for "More" tab
export const MORE_SUBSECTIONS = [
    { id: 'forum', label: 'المنتدى', icon: 'forum', color: '#10b981' },
    { id: 'conversations', label: 'حوارات', icon: 'chat', color: '#007A3D' },
    { id: 'palestine', label: 'فلسطين', icon: 'flag', color: '#CE1126' },
    { id: 'gallery', label: 'معرض الصور', icon: 'gallery', color: '#1a1a1a' },
    { id: 'contact', label: 'تواصل معنا', icon: 'contact', color: '#007A3D' }
];

const LayoutContext = createContext(null);

export const LayoutProvider = ({ children }) => {
    const deviceInfo = useDeviceDetection();

    // Active section for mobile navigation
    const [activeSection, setActiveSection] = useState('home');

    // More menu expanded state
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

    // Mobile modal/overlay states
    const [mobileOverlay, setMobileOverlay] = useState(null);

    // Swipe gesture state
    const [swipeDirection, setSwipeDirection] = useState(null);

    // Navigate to a section
    const navigateToSection = useCallback((sectionId) => {
        setActiveSection(sectionId);
        setIsMoreMenuOpen(false);
        setMobileOverlay(null);

        // Scroll to top when changing sections
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, []);

    // Toggle more menu
    const toggleMoreMenu = useCallback(() => {
        setIsMoreMenuOpen(prev => !prev);
    }, []);

    // Open mobile overlay (for modals, detail views, etc.)
    const openMobileOverlay = useCallback((overlayId, data = null) => {
        setMobileOverlay({ id: overlayId, data });
    }, []);

    // Close mobile overlay
    const closeMobileOverlay = useCallback(() => {
        setMobileOverlay(null);
    }, []);

    // Get section index for swipe navigation
    const getSectionIndex = useCallback((sectionId) => {
        return MOBILE_SECTIONS.findIndex(s => s.id === sectionId);
    }, []);

    // Navigate to next/previous section (for swipe)
    const navigateBySwipe = useCallback((direction) => {
        const currentIndex = getSectionIndex(activeSection);
        let newIndex;

        if (direction === 'left') {
            // In RTL, swipe left goes to previous (since sections are ordered RTL)
            newIndex = Math.max(0, currentIndex - 1);
        } else {
            // Swipe right goes to next
            newIndex = Math.min(MOBILE_SECTIONS.length - 1, currentIndex + 1);
        }

        if (newIndex !== currentIndex && MOBILE_SECTIONS[newIndex].id !== 'more') {
            setSwipeDirection(direction);
            setActiveSection(MOBILE_SECTIONS[newIndex].id);
            setTimeout(() => setSwipeDirection(null), 300);
        }
    }, [activeSection, getSectionIndex]);

    // Check if currently showing mobile layout
    const showMobileLayout = useMemo(() => {
        return deviceInfo.isMobile;
    }, [deviceInfo.isMobile]);

    // Check if section is in "more" submenu
    const isSubSection = useCallback((sectionId) => {
        return MORE_SUBSECTIONS.some(s => s.id === sectionId);
    }, []);

    const value = useMemo(() => ({
        // Device info
        deviceInfo,
        showMobileLayout,

        // Navigation state
        activeSection,
        setActiveSection,
        navigateToSection,
        navigateBySwipe,
        swipeDirection,

        // More menu
        isMoreMenuOpen,
        toggleMoreMenu,
        setIsMoreMenuOpen,

        // Overlay/Modal
        mobileOverlay,
        openMobileOverlay,
        closeMobileOverlay,

        // Section definitions
        sections: MOBILE_SECTIONS,
        subSections: MORE_SUBSECTIONS,
        isSubSection,
        getSectionIndex
    }), [
        deviceInfo,
        showMobileLayout,
        activeSection,
        navigateToSection,
        navigateBySwipe,
        swipeDirection,
        isMoreMenuOpen,
        toggleMoreMenu,
        mobileOverlay,
        openMobileOverlay,
        closeMobileOverlay,
        isSubSection,
        getSectionIndex
    ]);

    return (
        <LayoutContext.Provider value={value}>
            {children}
        </LayoutContext.Provider>
    );
};

export const useLayout = () => {
    const context = useContext(LayoutContext);
    if (!context) {
        throw new Error('useLayout must be used within a LayoutProvider');
    }
    return context;
};

export default LayoutContext;
