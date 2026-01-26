"use client";

import {
  Box,
  IconButton,
  Typography,
  Avatar,
  Stack,
  Snackbar,
  Tooltip,
  useTheme,
} from "@mui/material";
import { useContext, useState, useRef, useEffect } from "react";
import { ChatAIContext } from "@/app/context/AIChatContext/index";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import {
  Check,
  ContentCopy,
  ThumbDownOffAlt,
  ThumbUpOffAlt,
} from "@mui/icons-material";
import TypingDots from "./TypingDots";
import { IconMenu2 } from "@tabler/icons-react";
import SyntaxHighlighter from "react-syntax-highlighter";
import {
  docco,
  atomOneDark,
} from "react-syntax-highlighter/dist/esm/styles/hljs";
import { marked } from "marked";
import DOMPurify from "dompurify";

export default function ChatWindow({
  onOpenMenu,
  isSmallScreen,
}: {
  onOpenMenu: () => void;
  isSmallScreen: boolean;
}) {
  const { chatList, typing } = useContext(ChatAIContext)!;

  const [copiedMsgId, setCopiedMsgId] = useState<string | number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [userVote, setUserVote] = useState<"upvote" | "downvote" | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const theme = useTheme();

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatList]);

  const handleCopy = (text: string, msgId: string | number) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(String(msgId));
    setFeedback("Copied to clipboard!");
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleVote = (type: "upvote" | "downvote") => {
    setUserVote(type);
    setFeedback(type === "upvote" ? "Upvoted response" : "Downvoted response");
    setTimeout(() => setFeedback(null), 2000);
  };

  //markdown
  const renderMarkdownToHtml = (markdown: string): string => {
    const rawHtml = marked.parse(markdown) as string | any;
    const cleanHtml = DOMPurify.sanitize(rawHtml);
    return cleanHtml;
  };

  return (
    <>
      <Box width="100%">
        {isSmallScreen && (
          <Box display="flex" alignItems="center" mb={1}>
            <IconButton onClick={onOpenMenu}>
              <IconMenu2 />
            </IconButton>
          </Box>
        )}

        {chatList.map((msg, index) => {
          const isUser = msg.sender === "user";

          return (
            <Stack
              direction="row"
              justifyContent={isUser ? "flex-end" : "flex-start"}
              alignItems="flex-start"
              spacing={1}
              mb={2}
              key={msg.id ?? index}
            >
              {!isUser && (
                <Avatar
                  sx={{
                    bgcolor: theme.palette.primary.main,
                    color: "white",
                  }}
                >
                  <AutoAwesomeIcon fontSize="small" />
                </Avatar>
              )}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isUser ? "flex-end" : "flex-start",
                  flexGrow: isUser ? 0 : 1,
                  width: isUser ? "auto" : "100%",
                  minWidth: 0,
                }}
              >
                <Box
                  sx={{
                    color: "blackColor.black100",

                    textAlign: isUser ? "right" : "left",
                    ...(isUser && {
                      width: "fit-content",
                      display: "inline-block",
                    }),
                    ...(!isUser && {
                      width: "100%",
                    }),
                  }}
                >
                  {msg.text.split(/```/g).map((block: any, idx: any) => {
                    const isCode = idx % 2 === 1;

                    const [langLine, ...codeLines] = block.split("\n");
                    const language =
                      isCode && langLine.match(/^[a-zA-Z]+$/)
                        ? langLine
                        : "plaintext";
                    const code =
                      language !== "plaintext" ? codeLines.join("\n") : block;

                    const shouldApplyBg = isUser || (!isUser && isCode);

                    const bgColor = shouldApplyBg
                      ? "blackColor.black5"
                      : "transparent";

                    if (isCode) {
                      return (
                        <Box
                          key={idx}
                          sx={{
                            bgcolor: bgColor,
                            p: 1,
                          }}
                        >
                          <SyntaxHighlighter
                            language={language}
                            style={
                              theme.palette.mode === "dark"
                                ? atomOneDark
                                : docco
                            }
                            customStyle={{
                              background: "transparent",
                              margin: 0,
                              padding: 0,
                            }}
                          >
                            {code}
                          </SyntaxHighlighter>
                        </Box>
                      );
                    } else {
                      return (
                        <Box
                          key={idx}
                          padding={isUser ? "8px" : "0px"}
                          sx={{
                            color: "blackColor.black100",
                            bgcolor: bgColor,
                          }}
                        >
                          <Typography
                            variant="body1"
                            component="div"
                            sx={{
                              color: "blackColor.black100",
                              fontSize: 14,
                              "& *": isUser ? { margin: 0, padding: 0 } : {},
                            }}
                            dangerouslySetInnerHTML={{
                              __html: renderMarkdownToHtml(block.trim()),
                            }}
                          />
                          {msg.imageUrl && (
                            <img
                              src={msg.imageUrl}
                              alt="uploaded"
                              style={{ maxWidth: "200px" }}
                            />
                          )}
                        </Box>
                      );
                    }
                  })}
                </Box>

                {!isUser && (
                  <Stack direction="row" mt={0.5}>
                    <Tooltip title="Copy">
                      <IconButton
                        size="small"
                        onClick={() => handleCopy(msg.text, msg.id)}
                      >
                        {copiedMsgId === String(msg.id) ? (
                          <Check fontSize="small" color="primary" />
                        ) : (
                          <ContentCopy fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Good response">
                      <IconButton
                        size="small"
                        onClick={() => handleVote("upvote")}
                      >
                        <ThumbUpOffAlt
                          fontSize="small"
                          color={userVote === "upvote" ? "primary" : "inherit"}
                        />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Bad response">
                      <IconButton
                        size="small"
                        onClick={() => handleVote("downvote")}
                      >
                        <ThumbDownOffAlt
                          fontSize="small"
                          color={userVote === "downvote" ? "error" : "inherit"}
                        />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                )}
              </Box>
              {isUser && <Avatar src="/images/profile/user-1.jpg" />}
            </Stack>
          );
        })}

        <>
          {typing && (
            <Stack
              direction="row"
              justifyContent="flex-start"
              alignItems="center"
              spacing={1}
              mb={2}
            >
              <Avatar
                sx={{
                  bgcolor: theme.palette.primary.main,
                  color: "white",
                }}
              >
                <AutoAwesomeIcon fontSize="small" />
              </Avatar>
              <TypingDots />
            </Stack>
          )}
        </>
        <div ref={scrollRef} />
      </Box>
      <Snackbar
        open={!!feedback}
        message={feedback}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      />
    </>
  );
}
