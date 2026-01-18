"use client";
import { Box, Drawer, Theme, useMediaQuery } from "@mui/material";
import { useContext, useState } from "react";
import { ChatAIContext } from "@/app/context/AIChatContext";
import ChatWindow from "./ChatWindow";
import ChatHistory from "./ChatHistory";
import ChatInputBar from "./ChatInputBar";
import ChatSuggestion from "./ChatSuggestions";
import Scrollbar from "../../custom-scroll/Scrollbar";

const drawerWidth = 300;
const secdrawerWidth = 350;

const ChatAI = () => {
  const { sendMessage, setChatList } = useContext(ChatAIContext)!;

  const [isLeftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [showChatWindow, setShowChatWindow] = useState(false);

  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up("lg")); // >=1200px

  const handleStartChat = async (suggestionText: string) => {
    setShowChatWindow(true);
    await sendMessage(suggestionText, true);
  };

  const handleSearchSubmit = async (text: string) => {
    if (!text.trim()) return;
    await handleStartChat(text);
  };

  const handleFileUpload = async (file: File) => {
    const imageUrl = URL.createObjectURL(file);
    setShowChatWindow(true);
    setChatList((prev: any) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: "user",
        text: "",
        imageUrl,
      },
    ]);
    await sendMessage("Here is an image I uploaded.", true);
  };

  return (
    <Box sx={{ height: "calc(100vh - 230px)", width: "100%", display: "flex" }}>
      {/* Left Drawer */}
      <Drawer
        open={isLeftSidebarOpen}
        onClose={() => setLeftSidebarOpen(false)}
        variant={lgUp ? "permanent" : "temporary"}
        sx={{
          width: drawerWidth,
          [`& .MuiDrawer-paper`]: {
            position: "relative",
            zIndex: (theme) => theme.zIndex.drawer + (lgUp ? 0 : 10),
          },
          flexShrink: 0,
          zIndex: (theme) => theme.zIndex.drawer + (lgUp ? 0 : 10),
        }}
      >
        <ChatHistory
          setShowChatWindow={setShowChatWindow}
          setLeftSidebarOpen={setLeftSidebarOpen}
        />
      </Drawer>
      {/* Main content in Drawer or directly based on screen size */}
      {lgUp ? (
        <Drawer
          anchor="right"
          open={isRightSidebarOpen}
          onClose={() => setRightSidebarOpen(false)}
          variant="permanent"
          sx={{
            width: secdrawerWidth,
            zIndex: (theme) => theme.zIndex.drawer + 1,
            flex: "auto",
            [`& .MuiDrawer-paper`]: {
              width: "100%",
              position: "relative",
              height: "100%",
              zIndex: (theme) => theme.zIndex.drawer + 1,
            },
          }}
        >
          <Box display="flex" flexDirection="column" height="100%">
            <Scrollbar sx={{ flexGrow: 1, overflowX: "hidden" }}>
              <Box p={3}>
                {!showChatWindow ? (
                  <ChatSuggestion
                    setShowChatWindow={setShowChatWindow}
                    handleStartChat={handleStartChat}
                    onOpenMenu={() => setLeftSidebarOpen(true)}
                    isSmallScreen={!lgUp}
                  />
                ) : (
                  <ChatWindow
                    onOpenMenu={() => setLeftSidebarOpen(true)}
                    isSmallScreen={!lgUp}
                  />
                )}
              </Box>
            </Scrollbar>

            <Box p={3}>
              <ChatInputBar
                onSearchSubmit={handleSearchSubmit}
                onFileUpload={handleFileUpload}
              />
            </Box>
          </Box>
        </Drawer>
      ) : (
        <Box
          display="flex"
          flexGrow="1"
          width="100%"
          flexDirection="column"
          height="100%"
          justifyContent="space-between"
        >
          <Scrollbar sx={{ flexGrow: 1, overflowX: "hidden" }}>
            <Box p={3}>
              {!showChatWindow ? (
                <ChatSuggestion
                  setShowChatWindow={setShowChatWindow}
                  handleStartChat={handleStartChat}
                  onOpenMenu={() => setLeftSidebarOpen(true)}
                  isSmallScreen={!lgUp}
                />
              ) : (
                <ChatWindow
                  onOpenMenu={() => setLeftSidebarOpen(true)}
                  isSmallScreen={!lgUp}
                />
              )}
            </Box>
          </Scrollbar>

          <Box p={3}>
            <ChatInputBar
              onSearchSubmit={handleSearchSubmit}
              onFileUpload={handleFileUpload}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ChatAI;
