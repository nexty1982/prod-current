"use client";

import React from "react";
import { Box } from "@mui/material";
import { styled, keyframes } from "@mui/system";

const bounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
`;

const Dot = styled("span")(({ theme }) => ({
  width: 6,
  height: 6,
  margin: "0 2px",
  backgroundColor: "currentColor",
  borderRadius: "50%",
  display: "inline-block",
  animation: `${bounce} 1.2s infinite ease-in-out`,
}));

const Dot1 = styled(Dot)({ animationDelay: "0s" });
const Dot2 = styled(Dot)({ animationDelay: "0.2s" });
const Dot3 = styled(Dot)({ animationDelay: "0.4s" });

const DotsWrapper = styled("span")({
  display: "inline-flex",
  marginLeft: 6,
});

function TypingDots() {
  return (
    <Box
      sx={{
        p: 1,
        bgcolor: "blackColor.black5",
        color: "blackColor.black60",
        fontSize: 16,
      }}
    >
      <DotsWrapper>
        <Dot1 />
        <Dot2 />
        <Dot3 />
      </DotsWrapper>
    </Box>
  );
}

export default TypingDots;
