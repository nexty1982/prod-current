
import { createContext, useState, ReactNode, useEffect } from 'react';
import config from './config'
import React from "react";

// Define the shape of the context state
interface CustomizerContextState {
    activeDir: string;
    setActiveDir: (dir: string) => void;
    activeMode: string;
    setActiveMode: (mode: string) => void;
    activeTheme: string;
    setActiveTheme: (theme: string) => void;
    activeLayout: string;
    setActiveLayout: (layout: string) => void;
    isCardShadow: boolean;
    setIsCardShadow: (shadow: boolean) => void;
    isLayout: string;
    setIsLayout: (layout: string) => void;
    isBorderRadius: number;
    setIsBorderRadius: (radius: number) => void;
    isCollapse: string;
    setIsCollapse: (collapse: string) => void;
    isSidebarHover: boolean;
    setIsSidebarHover: (isHover: boolean) => void;
    isMobileSidebar: boolean;  // Add this
    setIsMobileSidebar: (isMobileSidebar: boolean) => void
}

// Create the context with an initial value
export const CustomizerContext = createContext<CustomizerContextState | any>(undefined);

// Define the type for the children prop
interface CustomizerContextProps {
    children: ReactNode;
}

// Helper functions for localStorage
const getStoredValue = (key: string, defaultValue: any): any => {
    if (typeof window === 'undefined') return defaultValue;
    try {
        const stored = localStorage.getItem(`orthodoxmetrics-${key}`);
        return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch (error) {
        console.warn(`Failed to parse stored value for ${key}:`, error);
        return defaultValue;
    }
};

const setStoredValue = (key: string, value: any): void => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(`orthodoxmetrics-${key}`, JSON.stringify(value));
    } catch (error) {
        console.warn(`Failed to store value for ${key}:`, error);
    }
};

// Create the provider component
export const CustomizerContextProvider: React.FC<CustomizerContextProps> = ({ children }) => {

    // Initialize state with localStorage values or config defaults
    const [activeDir, setActiveDirState] = useState<string>(() => 
        getStoredValue('activeDir', config.activeDir)
    );
    const [activeMode, setActiveModeState] = useState<string>(() => 
        getStoredValue('activeMode', config.activeMode)
    );
    const [activeTheme, setActiveThemeState] = useState<string>(() => 
        getStoredValue('activeTheme', config.activeTheme)
    );
    const [activeLayout, setActiveLayoutState] = useState<string>(() => 
        getStoredValue('activeLayout', config.activeLayout)
    );
    const [isCardShadow, setIsCardShadowState] = useState<boolean>(() => 
        getStoredValue('isCardShadow', config.isCardShadow)
    );
    const [isLayout, setIsLayoutState] = useState<string>(() => 
        getStoredValue('isLayout', config.isLayout)
    );
    const [isBorderRadius, setIsBorderRadiusState] = useState<number>(() => 
        getStoredValue('isBorderRadius', config.isBorderRadius)
    );
    const [isCollapse, setIsCollapseState] = useState<string>(() => 
        getStoredValue('isCollapse', config.isCollapse)
    );
    const [isLanguage, setIsLanguage] = useState<string>(config.isLanguage);
    const [isSidebarHover, setIsSidebarHover] = useState<boolean>(false);
    const [isMobileSidebar, setIsMobileSidebar] = useState<boolean>(false);

    // Enhanced setter functions that also save to localStorage
    const setActiveDir = (dir: string) => {
        setActiveDirState(dir);
        setStoredValue('activeDir', dir);
    };

    const setActiveMode = (mode: string) => {
        setActiveModeState(mode);
        setStoredValue('activeMode', mode);
    };

    const setActiveTheme = (theme: string) => {
        setActiveThemeState(theme);
        setStoredValue('activeTheme', theme);
    };

    const setActiveLayout = (layout: string) => {
        setActiveLayoutState(layout);
        setStoredValue('activeLayout', layout);
    };

    const setIsCardShadow = (shadow: boolean) => {
        setIsCardShadowState(shadow);
        setStoredValue('isCardShadow', shadow);
    };

    const setIsLayout = (layout: string) => {
        setIsLayoutState(layout);
        setStoredValue('isLayout', layout);
    };

    const setIsBorderRadius = (radius: number) => {
        setIsBorderRadiusState(radius);
        setStoredValue('isBorderRadius', radius);
    };

    const setIsCollapse = (collapse: string) => {
        setIsCollapseState(collapse);
        setStoredValue('isCollapse', collapse);
    };

    // Set attributes immediately
    useEffect(() => {
        document.documentElement.setAttribute("class", activeMode);
        document.documentElement.setAttribute("dir", activeDir);
        document.documentElement.setAttribute('data-color-theme', activeTheme);
        document.documentElement.setAttribute("data-layout", activeLayout);
        document.documentElement.setAttribute("data-boxed-layout", isLayout);
        document.documentElement.setAttribute("data-sidebar-type", isCollapse);

    }, [activeMode, activeDir, activeTheme, activeLayout, isLayout, isCollapse]);

    return (
        <CustomizerContext.Provider
            value={{

                activeDir,
                setActiveDir,
                activeMode,
                setActiveMode,
                activeTheme,
                setActiveTheme,
                activeLayout,
                setActiveLayout,
                isCardShadow,
                setIsCardShadow,
                isLayout,
                setIsLayout,
                isBorderRadius,
                setIsBorderRadius,
                isCollapse,
                setIsCollapse,
                isLanguage,
                setIsLanguage,
                isSidebarHover,
                setIsSidebarHover,
                isMobileSidebar,
                setIsMobileSidebar
            }}
        >
            {children}
        </CustomizerContext.Provider>
    );
};

