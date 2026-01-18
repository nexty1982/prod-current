"use client";
import React, { useContext, useRef, useState } from "react";

import {
  AspectRatio,
  cameraOptions,
  lightingOptions,
  styleOptions,
  toneOptions,
} from "@/app/api/image-ai/dropdowndata";

import { ImageContext } from "@/app/context/ImageAiContext";
import {
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  CircularProgress,
  Snackbar,
  SnackbarCloseReason,
} from "@mui/material";

import BlankCard from "../../shared/BlankCard";
import IconSelect from "./IconSelect";
import { IconPhoto, IconX } from "@tabler/icons-react";

function ImagePrompt() {
  const {
    prompt,
    setPrompt,
    generateImages,
    setIsUsingMock,
    isGenerating,
    setIsGenerating,
  } = useContext(ImageContext);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState(AspectRatio[0]);
  const [selectedStyle, setSelectedStyle] = useState(styleOptions[0]);
  const [showToast, setShowToast] = useState(false);

  const [selectedTone, setSelectedTone] = useState(toneOptions[0]);
  const [selectedLighting, setSelectedLighting] = useState(lightingOptions[0]);
  const [selectedCamera, setSelectedCamera] = useState(cameraOptions[0]);

  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSelectAspect = (option: typeof selected) => {
    setSelected(option);
  };

  const handleSelectStyle = (option: typeof selected) => {
    setSelectedStyle(option);
  };

  const handleSelectTone = (option: typeof selected) => {
    setSelectedTone(option);
  };

  const handleSelectLighting = (option: typeof selected) => {
    setSelectedLighting(option);
  };

  const handleSelectCamera = (option: typeof selected) => {
    setSelectedCamera(option);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setSelectedImageUrl(imageUrl); // set preview
      console.log("Selected file:", file);
    }
  };

  const generateImage = async () => {
    if (!prompt.trim()) {
      setShowToast(true);
      return;
    }

    setIsGenerating(true); // Start loading
    setIsUsingMock(true);

    setTimeout(async () => {
      try {
        await generateImages(prompt);
      } catch (err) {
        console.error("Generation error:", err);
      } finally {
        setIsGenerating(false); // Done loading
      }
    }, 3000);
  };

  const handleClear = () => {
    setPrompt("");
    setSelected(AspectRatio[0]);
    setSelectedStyle(styleOptions[0]);
    setSelectedTone(toneOptions[0]);
    setSelectedLighting(lightingOptions[0]);
    setSelectedCamera(cameraOptions[0]);
    setSelectedImageUrl(null); // clear preview

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = (
    event: React.SyntheticEvent | Event,
    reason?: SnackbarCloseReason
  ) => {
    if (reason === "clickaway") {
      return;
    }
    setShowToast(false);
  };

  return (
    <Stack spacing={2} direction="column">
      <Box>
        <Typography variant="h3" mb={1}>
          {" "}
          AI image generator
        </Typography>

        <Typography variant="body1">
          Create an image with Generative AI by describing what you'd like to
          see. Please note, all images are shared publicly by default.
        </Typography>
      </Box>

      <BlankCard
        sx={{ padding: 2, display: "flex", gap: 1, flexDirection: "column" }}
      >
        <Box>
          {selectedImageUrl && (
            <Box mb={2}>
              <img
                src={selectedImageUrl}
                alt="Selected preview"
                style={{
                  maxWidth: "200px",
                  objectFit: "contain",
                }}
              />
            </Box>
          )}
          <Typography variant="h6">Prompt</Typography>

          <TextField
            multiline
            minRows={2}
            placeholder="Describe the image you want to generate"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            variant="standard"
            fullWidth
            slotProps={{
              input: {
                disableUnderline: true,
                sx: {
                  backgroundColor: "transparent",
                  padding: "4px",
                  resize: "none",
                },
              },
            }}
          />
        </Box>

        <Box
          display="inline-flex"
          flexWrap="wrap"
          gap={1}
          alignItems="center"
          height="auto"
        >
          <Tooltip title="Add Image" placement="top">
            <IconButton
              onClick={handleClick}
              sx={{
                width: 40,
                height: 40,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                padding: 0,
                color: "text.primary",
              }}
            >
              <IconPhoto size={20} />
            </IconButton>
          </Tooltip>
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          {/* aspect */}

          <IconSelect
            value={selected.id}
            options={AspectRatio}
            onChange={handleSelectAspect}
            iconInCircle={false}
          />

          {/* style */}

          <IconSelect
            value={selectedStyle.id}
            options={styleOptions}
            onChange={handleSelectStyle}
          />
          {/* tone */}

          <IconSelect
            value={selectedTone.id}
            options={toneOptions}
            onChange={handleSelectTone}
          />

          {/* lighting */}

          <IconSelect
            value={selectedLighting.id}
            options={lightingOptions}
            onChange={handleSelectLighting}
          />
          {/* camera */}

          <IconSelect
            value={selectedCamera.id}
            options={cameraOptions}
            onChange={handleSelectCamera}
          />
        </Box>
        {/* Button */}
        <Box display="flex" alignItems="center" gap={1} marginTop={2.5}>
          <Button
            onClick={generateImage}
            disabled={isGenerating}
            startIcon={
              isGenerating ? (
                <CircularProgress size={16} color="inherit" />
              ) : null
            }
            variant="contained"
          >
            {" "}
            Generate
          </Button>
          <Button onClick={handleClear} variant="outlined">
            Clear
          </Button>
        </Box>
      </BlankCard>

      {showToast && (
        <Snackbar
          open={showToast}
          onClose={() => setShowToast(false)}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          message="Please enter a prompt before generating."
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              onClick={handleClose}
            >
              <IconX />
            </IconButton>
          }
        />
      )}
    </Stack>
  );
}

export default ImagePrompt;
