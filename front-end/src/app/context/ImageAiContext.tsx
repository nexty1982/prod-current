"use client";
import React, { createContext, useState, ReactNode, Dispatch, SetStateAction } from "react";

// Define the context interface
export interface ImageAiContextType {
  prompt: string;
  setPrompt: Dispatch<SetStateAction<string>>;
  displayedImages: string[];
  setDisplayedImages: Dispatch<SetStateAction<string[]>>;
  isGenerating: boolean;
  setIsGenerating: Dispatch<SetStateAction<boolean>>;
  isUsingMock: boolean;
  setIsUsingMock: Dispatch<SetStateAction<boolean>>;
  generateImages: (prompt: string) => Promise<void>;
}

// Create the context with default values
export const ImageContext = createContext<ImageAiContextType>({
  prompt: "",
  setPrompt: () => {},
  displayedImages: [],
  setDisplayedImages: () => {},
  isGenerating: false,
  setIsGenerating: () => {},
  isUsingMock: false,
  setIsUsingMock: () => {},
  generateImages: async () => {},
});

// Provider component
export const ImageAiProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [prompt, setPrompt] = useState<string>("");
  const [displayedImages, setDisplayedImages] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isUsingMock, setIsUsingMock] = useState<boolean>(false);

  // Mock image generation function - replace with actual API call
  const generateImages = async (promptText: string): Promise<void> => {
    // This is a mock implementation - replace with actual API call
    // For now, it generates mock image URLs
    const mockImages = [
      "https://picsum.photos/400/400?random=1",
      "https://picsum.photos/400/400?random=2",
      "https://picsum.photos/400/400?random=3",
      "https://picsum.photos/400/400?random=4",
    ];
    
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    setDisplayedImages(mockImages);
  };

  const value: ImageAiContextType = {
    prompt,
    setPrompt,
    displayedImages,
    setDisplayedImages,
    isGenerating,
    setIsGenerating,
    isUsingMock,
    setIsUsingMock,
    generateImages,
  };

  return <ImageContext.Provider value={value}>{children}</ImageContext.Provider>;
};

