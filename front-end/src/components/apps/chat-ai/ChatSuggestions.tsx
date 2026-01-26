import {
  Typography,
  Box,
  Grid,
  useTheme,
  IconButton,
  Skeleton,
} from "@mui/material";

import { IconMenu2, IconCode, IconMailbox, IconBug } from "@tabler/icons-react";

type ChatSuggestionProps = {
  setShowChatWindow: (show: boolean) => void;
  handleStartChat: (text: string) => void;
  onOpenMenu: () => void;
  isSmallScreen: boolean;
};

const suggestions = [
  {
    icon: <IconCode fontSize={24} />,
    text: "Write clean code snippets",
    iconColor: "info.main",
    iconBg: "info.light",
    subTitle: "💻 efficient and readable code",
  },
  {
    icon: <IconMailbox fontSize={24} />,
    text: "Write a reply to this email",
    iconColor: "warning.main",
    iconBg: "warning.light",
    subTitle: "🖊️ professional response",
  },
  {
    icon: <IconBug fontSize={24} />,
    text: "Help me debug this code",
    iconColor: "error.main",
    iconBg: "error.light",
    subTitle: "⚡ fix bugs quickly",
  },
];

export default function ChatSuggestion({
  handleStartChat,
  onOpenMenu,
  isSmallScreen,
}: ChatSuggestionProps) {
  const theme = useTheme();

  return (
    <>
      <Box>
        {isSmallScreen && (
          <Box display="flex" alignItems="center" mb={2}>
            <IconButton onClick={onOpenMenu}>
              <IconMenu2 />
            </IconButton>
          </Box>
        )}
        <Typography variant="h1" fontWeight="700" sx={{ mb: 2 }}>
          <Box
            component="span"
            sx={{
              background: `linear-gradient(to right, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            Hey there!
          </Box>
        </Typography>
        <Typography variant="h4" sx={{ mb: 4 }}>
          What would you like to explore today?
        </Typography>

        <Grid container spacing={2}>
          {suggestions.map((item, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }} key={index}>
              <Box
                sx={{
                  borderRadius: "12px",
                  border: `1px solid ${theme.palette.divider}`,
                  backgroundColor:
                    theme.palette.mode === "dark" ? "#030E0966" : "white",
                  p: 3,
                  minHeight: "200px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  cursor: "pointer",
                }}
                onClick={() => handleStartChat(item.text)}
              >
                {/* Icon Box */}
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: "12px",
                    backgroundColor: item.iconBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 2,
                  }}
                >
                  <Typography
                    component="span"
                    fontSize="24px"
                    color={item.iconColor}
                  >
                    {item.icon}
                  </Typography>
                </Box>

                {/* Title */}
                <Typography variant="h6" fontWeight={600}>
                  {item.text}
                </Typography>

                {item.subTitle && (
                  <Typography
                    fontSize="13px"
                    fontWeight={500}
                    color="text.secondary"
                  >
                    {item.subTitle}
                  </Typography>
                )}
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>
    </>
  );
}
