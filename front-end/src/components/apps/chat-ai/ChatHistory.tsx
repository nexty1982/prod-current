"use client";

import {
  Box,
  Typography,
  List,
  ListItemText,
  Button,
  InputAdornment,
  Divider,
  Menu,
  MenuItem,
  IconButton,
  ListItemIcon,
  ListItemButton,
  useMediaQuery,
  Theme,
} from "@mui/material";
import { useContext, useEffect, useState } from "react";
import CustomTextField from "../../forms/theme-elements/CustomTextField";
import { ChatAIContext } from "@/app/context/AIChatContext";
import { ChatHistoryItem } from "@/app/(DashboardLayout)/types/apps/ai-chat";
import { IconSearch, IconDots, IconTrash } from "@tabler/icons-react";
import Scrollbar from "@/app/components/custom-scroll/Scrollbar";
import Logo from "@/app/(DashboardLayout)/layout/shared/logo/Logo";

type ChatSidebarProps = {
  setShowChatWindow: React.Dispatch<React.SetStateAction<boolean>>;
  setLeftSidebarOpen?: (value: boolean) => void;
};

export default function ChatHistory({
  setShowChatWindow,
  setLeftSidebarOpen,
}: ChatSidebarProps) {
  const { sendMessage, setChatList, chatSessions, setChatSessions } =
    useContext(ChatAIContext)!;

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuIndex, setMenuIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sidebarData, setSidebarData] = useState<ChatHistoryItem[]>([]);
  const [deletedQuestions, setDeletedQuestions] = useState<Set<string>>(
    new Set()
  );

  const isLargeScreen = useMediaQuery((theme: Theme) =>
    theme.breakpoints.up("lg")
  );

  useEffect(() => {
    async function fetchSidebar() {
      try {
        const res = await fetch("/api/chat-ai/chat-history");
        const json = await res.json();
        if (res.ok) {
          setSidebarData(json.data);
        } else {
          console.log("Failed to load sidebar questions");
        }
      } catch {
        console.log("Failed to load sidebar questions");
      }
    }
    fetchSidebar();
  }, []);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const filteredChats = sidebarData
    .filter((chat) => chat.status !== "deleted")
    .filter((chat) =>
      chat.que.toLowerCase().includes(searchTerm.toLowerCase())
    );

  // 2. Get unique sessions
  const uniqueSessions = Array.from(
    new Map(
      chatSessions.map((session) => [session.messages[0]?.text ?? "", session])
    ).values()
  );

  // 3. Remove duplicates from history that are already in saved
  const savedQuestions = new Set(filteredChats.map((chat) => chat.que));

  const filteredHistory = uniqueSessions.filter((session) => {
    const question = session.messages[0]?.text ?? "";
    return !savedQuestions.has(question) && !deletedQuestions.has(question);
  });

  // 4. Merge both
  const unifiedChats = [
    ...filteredChats.map((chat, index) => ({
      ...chat,
      source: "saved",
      index,
    })),
    ...filteredHistory.map((session, index) => ({
      id: session.id,
      que: session.messages[0]?.text || "",
      preview: session.messages[1]?.text || "",
      status: session.status || "active",
      source: "session",
      index,
    })),
  ];

  const handleClick = (event: React.MouseEvent<HTMLElement>, index: number) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setMenuIndex(index);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuIndex(null);
  };

  const handleNewChat = () => {
    setChatList([]);
    setShowChatWindow(false);
    if (!isLargeScreen && setLeftSidebarOpen) {
      setLeftSidebarOpen(false);
    }
  };

  const handleDelete = (index: number | null) => {
    if (index !== null) {
      const selected = unifiedChats[index];
      setDeletedQuestions((prev) => new Set(prev).add(selected.que));

      if (selected.source === "saved") {
        const updated = [...sidebarData];
        updated[selected.index].status = "deleted";
        setSidebarData(updated);
      } else if (selected.source === "session") {
        const updated = [...chatSessions];
        updated[selected.index].status = "deleted";
        setChatSessions(updated);
      }
    }
    handleMenuClose();
  };

  return (
    <Box height="100%" display="flex" flexDirection="column">
      {/* Logo */}
      <Box display="flex" justifyContent="center">
        <Logo />
      </Box>
      <Divider />
      <Scrollbar
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          // Hide native scrollbar (Webkit browsers)
          "&::-webkit-scrollbar": { width: 0, height: 0 },
        }}
      >
        <Box p={3} sx={{ flexGrow: 1 }}>
          <Box mb={1}>
            <CustomTextField
              id="outlined-basic"
              fullWidth
              size="small"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search chat"
              variant="outlined"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconSearch size={"16"} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                "& input": {
                  paddingLeft: 0,
                },
              }}
            />
          </Box>

          {unifiedChats.length === 0 ? (
            <Typography
              variant="subtitle1"
              color="text.secondary"
              textAlign="center"
            >
              No chats history found.
            </Typography>
          ) : (
            unifiedChats.map((chat, i) => (
              <List sx={{ padding: "0px" }} key={chat.id ?? i}>
                <ListItemButton
                  sx={{
                    padding: "8px",
                    borderRadius: 1,
                    "&:hover": {
                      backgroundColor: "blackColor.black5",
                    },
                  }}
                  key={i}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setChatList([]);
                    sendMessage(chat.que, true);
                    setShowChatWindow(true);
                  }}
                >
                  <ListItemText>
                    <Typography variant="h6" fontWeight={600} noWrap>
                      {chat?.que}
                    </Typography>

                    <Typography
                      fontSize="13px"
                      fontWeight={500}
                      color="text.secondary"
                      noWrap
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {chat?.preview}
                    </Typography>
                  </ListItemText>
                  {(hoveredIndex === i || menuIndex === i) && (
                    <IconButton
                      aria-label="more"
                      aria-controls="long-menu"
                      aria-haspopup="true"
                      onClick={(e) => {
                        e.stopPropagation(), handleClick(e, i);
                      }}
                    >
                      <IconDots size={"20"} />
                    </IconButton>
                  )}
                </ListItemButton>
              </List>
            ))
          )}

          <Menu
            id="long-menu"
            anchorEl={anchorEl}
            keepMounted
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={() => handleDelete(menuIndex)}>
              <ListItemIcon>
                <IconTrash color="red" fontSize={20} />
              </ListItemIcon>
              <ListItemText> Deleted</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      </Scrollbar>
      <Box p={2}>
        <Button
          onClick={handleNewChat}
          color="primary"
          variant="contained"
          fullWidth
          sx={{ color: "white", fontWeight: "500" }}
        >
          New Chat
        </Button>
      </Box>
    </Box>
  );
}
