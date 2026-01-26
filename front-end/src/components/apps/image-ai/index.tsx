"use client";
import React, { useContext } from "react";
import ImagePrompt from "./ImagePrompt";
import GeneratedImageDisplay from "./GeneratedImageDisplay";
import DefaultImageDisplay from "./DefaultImageDisplay";
import { ImageContext } from "@/app/context/ImageAiContext";
import { Box, Card } from "@mui/material";

function ImageAiApp() {
  const { displayedImages, isGenerating } = useContext(ImageContext);

  const hasGeneratedImages = displayedImages && displayedImages.length > 0;
  return (
    <Card sx={{ p: 0 }}>
      <Box sx={{ display: "flex", gap: 2.5, flexDirection: "column", flex: '1 1 auto', height: "100%", p: 3 }}>
        <ImagePrompt />

        {(isGenerating || hasGeneratedImages) && <GeneratedImageDisplay />}
        <DefaultImageDisplay />
      </Box>
    </Card>
  );
}

export default ImageAiApp;
