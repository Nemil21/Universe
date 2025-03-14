import React, { useRef, useEffect } from 'react';
import {
  Box, 
  Text, 
  Flex, 
  Heading, 
  Spinner,
  Link,
  Image
} from '@chakra-ui/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { FaRegLightbulb } from 'react-icons/fa';

// Interface for message objects
interface Message {
  id: string;
  provider: string;
  prompt: string;
  response: string;
  createdAt: string;
}

// Interface for chat object
interface Chat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

interface ChatAreaProps {
  currentChat: Chat | null;
  isLoading: boolean;
  onNewChat: () => void;

}

const ChatArea: React.FC<ChatAreaProps> = ({
  currentChat,
  isLoading,
  onNewChat,

}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Dark theme colors
  const chatBgColor = "gray.900";
  const userPromptBg = "gray.700"; // Lighter background for user messages
  const borderColor = "gray.700";
  const codeBg = "gray.800";
  const inlineCodeBg = "gray.800";
  const dateTextColor = "gray.500";

  // Scroll to bottom when messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentChat?.messages]);


  // Markdown components with improved styling for headings and HTML support
  const MarkdownComponents = {
    h1: ({node, ...props}: any) => (
      <Heading 
        as="h1" 
        size="xl" 
        mt={10} 
        mb={6} 
        color="blue.300" 
        pb={2}
        borderBottom="1px"
        borderColor="gray.700"
        fontSize="2rem"
        {...props} 
      />
    ),
    h2: ({node, ...props}: any) => (
      <Heading 
        as="h2" 
        size="lg" 
        mt={8} 
        mb={4} 
        color="teal.300" 
        pb={1}
        borderBottom="1px"
        borderColor="gray.700"
        fontSize="1.75rem"
        {...props} 
      />
    ),
    h3: ({node, ...props}: any) => (
      <Heading 
        as="h3" 
        size="md" 
        mt={6} 
        mb={3} 
        color="purple.300" 
        fontSize="1.5rem"
        fontWeight="semibold"
        {...props} 
      />
    ),
    h4: ({node, ...props}: any) => (
      <Heading 
        as="h4" 
        size="sm" 
        mt={5} 
        mb={2} 
        color="orange.300" 
        fontSize="1.25rem"
        fontWeight="semibold"
        {...props} 
      />
    ),
    h5: ({node, ...props}: any) => (
      <Heading 
        as="h5" 
        size="xs" 
        mt={4} 
        mb={2} 
        color="pink.300" 
        fontSize="1.1rem"
        fontWeight="medium"
        {...props} 
      />
    ),
    h6: ({node, ...props}: any) => (
      <Heading 
        as="h6" 
        size="xs" 
        mt={3} 
        mb={1} 
        color="red.300" 
        fontSize="1rem"
        fontStyle="italic"
        fontWeight="medium"
        {...props} 
      />
    ),
    p: ({node, children, ...props}: any) => (
      <Text mb={4} lineHeight="tall" color="gray.300" {...props}>
        {children}
      </Text>
    ),
    sup: ({node, ...props}: any) => (
      <Box 
        as="sup" 
        fontSize="smaller" 
        position="relative" 
        top="-0.5em" 
        {...props}
      />
    ),
    sub: ({node, ...props}: any) => (
      <Box 
        as="sub" 
        fontSize="smaller" 
        position="relative" 
        bottom="-0.25em" 
        {...props}
      />
    ),
    ul: ({node, ...props}: any) => <Box as="ul" pl={5} mb={4} color="gray.300" {...props} />,
    ol: ({node, ...props}: any) => <Box as="ol" pl={5} mb={4} color="gray.300" {...props} />,
    li: ({node, ...props}: any) => <Box as="li" mb={1} {...props} />,
    blockquote: ({node, ...props}: any) => (
      <Box
        as="blockquote"
        borderLeftWidth="3px"
        borderLeftColor="blue.400"
        pl={4}
        py={2}
        my={4}
        color="gray.400"
        bg="rgba(45, 55, 72, 0.3)"
        borderRadius="md"
        {...props}
      />
    ),
    table: ({node, ...props}: any) => (
      <Box overflowX="auto" mb={4}>
        <Box as="table" width="full" {...props} sx={{ borderCollapse: 'collapse' }} />
      </Box>
    ),
    thead: ({node, ...props}: any) => <Box as="thead" bg={codeBg} {...props} />,
    tbody: ({node, ...props}: any) => <Box as="tbody" {...props} />,
    tr: ({node, ...props}: any) => <Box as="tr" {...props} />,
    td: ({node, ...props}: any) => (
      <Box 
        as="td" 
        borderWidth="1px" 
        borderColor={borderColor} 
        p={2} 
        {...props} 
      />
    ),
    th: ({node, ...props}: any) => (
      <Box 
        as="th" 
        borderWidth="1px" 
        borderColor={borderColor} 
        p={2} 
        fontWeight="semibold" 
        bg="gray.800"
        {...props} 
      />
    ),
    a: ({node, ...props}: any) => (
      <Link 
        color="blue.400" 
        isExternal 
        textDecoration="underline" 
        _hover={{ color: "blue.300", textDecoration: "underline" }} 
        {...props} 
      />
    ),
    code({node, inline, className, children, ...props}: any) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <Box my={4} borderRadius="md" overflow="hidden">
          <SyntaxHighlighter
            style={atomDark}
            language={match[1]}
            PreTag="div"
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        </Box>
      ) : (
        <Box
          as="code"
          bg={inlineCodeBg}
          p={1}
          borderRadius="sm"
          fontSize="0.875em"
          fontFamily="monospace"
          color="blue.300"
          {...props}
        >
          {children}
        </Box>
      );
    },
    pre: ({node, ...props}: any) => (
      <Box
        as="pre"
        my={4}
        {...props}
      />
    ),
    hr: ({node, ...props}: any) => (
      <Box 
        as="hr" 
        borderColor="gray.600" 
        my={6} 
        {...props} 
      />
    ),
    img: ({node, ...props}: any) => (
      <Box as="img" maxWidth="100%" borderRadius="md" my={4} {...props} />
    ),
  };

  // If there's no current chat, show welcome screen
  if (!currentChat) {
    return (
      <Box
        height="calc(100vh - 240px)"
        overflowY="auto"
        p={8}
        bg={chatBgColor}
        borderRadius="md"
        boxShadow="sm"
        border="1px"
        borderColor={borderColor}
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        textAlign="center"
      >
        <Box maxW="450px">
          <Heading size="lg" mb={4} color="gray.100">Welcome to AI Platform</Heading>
          <Text mb={8} fontSize="lg" color="gray.400">
            Select a chat from the sidebar or create a new one to start a conversation with advanced AI models.
          </Text>
          <Flex justify="center">
            <Box 
              as="button"
              onClick={onNewChat}
              px={6}
              py={3}
              bg="transparent"
              color="blue.400"
              border="1px"
              borderColor="blue.400"
              borderRadius="md"
              _hover={{ bg: "rgba(59, 130, 246, 0.1)" }}
              fontSize="lg"
            >
              Start a New Chat
            </Box>
          </Flex>
        </Box>
      </Box>
    );
  }

  // If loading, show spinner
  if (isLoading) {
    return (
      <Box
        height="calc(100vh - 240px)"
        display="flex"
        justifyContent="center"
        alignItems="center"
        bg={chatBgColor}
        borderRadius="md"
        boxShadow="sm"
        border="1px"
        borderColor={borderColor}
      >
        <Spinner size="xl" thickness="4px" color="blue.500" />
      </Box>
    );
  }

  // Show chat with messages
  return (
    <Box
      height="calc(100vh - 240px)"
      overflowY="auto"
      bg={chatBgColor}
      borderRadius="md"
      boxShadow="sm"
      border="1px"
      borderColor={borderColor}
      display="flex"
      flexDirection="column"
      className="chat-container"
      px={4}
      py={4}
    >
      {/* Chat messages */}
      <Box flex="1" display="flex" flexDirection="column" gap={6}>
        {currentChat.messages.length === 0 ? (
          <Flex 
            height="100%" 
            justifyContent="center" 
            alignItems="center" 
            flexDirection="column"
          >
            <Text color="gray.400" fontSize="lg" mb={2}>
              No messages yet
            </Text>
            <Text color="gray.500" fontSize="md">
              Start the conversation by typing a message below
            </Text>
          </Flex>
        ) : (
          currentChat.messages.map((message, index) => (
            <Box key={message.id}>
              {/* User message - right aligned */}
              <Flex justifyContent="flex-end" mb={6}>
                <Box 
                  maxWidth="70%"
                  bg={userPromptBg}
                  py={3}
                  px={4}
                  borderRadius="lg"
                  borderBottomRightRadius="sm"
                >
                  <Text whiteSpace="pre-wrap" color="gray.200" fontSize="sm">{message.prompt}</Text>
                </Box>
              </Flex>
              
              {/* The universe is answering logo/message */}
              <Flex alignItems="center" mb={2} ml={2}>
                <Box 
                  borderRadius="full" 
                  bg="purple.900" 
                  p={2}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  mr={2}
                >
                  <FaRegLightbulb color="#d6bcfa" size="1.2em" />
                </Box>
                <Text fontSize="xs" fontStyle="italic" color="purple.200">
                  The universe is answering!
                </Text>
              </Flex>
              
              {/* AI response - left aligned */}
              <Flex justifyContent="flex-start" mb={2}>
                <Box 
                  maxWidth="80%"
                  borderRadius="lg"
                  borderBottomLeftRadius="sm"
                  bg="gray.800"
                  py={4}
                  px={5}
                >
                  <Box>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      components={MarkdownComponents}
                    >
                      {message.response}
                    </ReactMarkdown>
                  </Box>
                </Box>
              </Flex>
            </Box>
          ))
        )}
        <div ref={messagesEndRef} />
      </Box>

    </Box>
  );
};

export default ChatArea;