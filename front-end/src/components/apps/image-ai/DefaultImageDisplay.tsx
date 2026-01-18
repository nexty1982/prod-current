"use client";

import { masonryImages } from "@/app/api/image-ai/dropdowndata";
import { Masonry } from "@mui/lab";
import { Box, Typography } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import BlankCard from "../../shared/BlankCard";

function DefaultImageDisplay() {
  const [allImages, setAllImages] = useState([...masonryImages]);
  const loadMoreRef = useRef(null);
  const loadCount = useRef(0);
  const MAX_LOADS = 2;

  // Observer to detect when bottom of page is reached
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && loadCount.current < MAX_LOADS) {
          // Append same 12 images again
          setAllImages((prev) => [...prev, ...masonryImages]);
          loadCount.current += 1;
        }
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 1.0,
      }
    );
    const current = loadMoreRef.current;
    if (current) observer.observe(current);

    return () => {
      if (current) observer.unobserve(current);
    };
  }, []);

  return (
    <BlankCard sx={{ padding: 3 }}>
      <Box display="flex" flexDirection="column" gap={2}>
        <Typography variant="h4">Recent images</Typography>
        <Masonry columns={{ xs: 2, md: 4 }} spacing={2}>
          {allImages.map((url, index) => (
            <Box key={index} sx={{ breakInside: "avoid" }}>
              <img
                src={url}
                alt={`AI generated image ${index + 1}`}
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  borderRadius: "8px",
                }}
              />
            </Box>
          ))}
        </Masonry>

        {/* This div triggers loading more images when in view */}
        {loadCount.current < MAX_LOADS && (
          <Box ref={loadMoreRef} sx={{ height: 40 }} />
        )}

        {loadCount.current >= MAX_LOADS && (
          <Typography variant="body1" mt={2} textAlign="center">
            You’ve reached the end.
          </Typography>
        )}
      </Box>
    </BlankCard>
  );
}

export default DefaultImageDisplay;
