import { useState, useEffect, FormEvent, useRef } from 'react';
import { gql, useMutation, useLazyQuery, useQuery, ApolloError } from '@apollo/client';
import { 
  Box, Button, Container, Flex, Heading, 
  Text, Textarea, useToast, Spinner,
  useDisclosure, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalBody, ModalFooter, Input,
  IconButton, ThemeProvider, theme, extendTheme
} from '@chakra-ui/react';
import rehypeRaw from 'rehype-raw';
import { FiSend } from 'react-icons/fi';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import Sidebar from '../components/Sidebar';
import ModelSelector from '../components/ModelSelector';
import ChatArea from '../components/ChatArea';
import UpgradeModal from '../components/UpgradeModal';

// Define dark theme
const darkTheme = extendTheme({
  ...theme,
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false,
  },
  colors: {
    ...theme.colors,
    gray: {
      ...theme.colors.gray,
      900: '#121212', // Main background
      800: '#1e1e1e', // Slightly lighter background
      700: '#2d2d2d', // Borders
      600: '#444444', // Subtle borders
      500: '#666666', // Disabled text
      400: '#888888', // Muted text
      300: '#bbbbbb', // Secondary text
      200: '#d4d4d4', // Primary text
      100: '#eeeeee', // Bright text
    },
    blue: {
      ...theme.colors.blue,
      500: '#3b82f6', // Primary accent
      400: '#60a5fa', // Secondary accent
    }
  },
  styles: {
    global: {
      body: {
        bg: '#121212',
        color: 'gray.200',
      }
    }
  },
  components: {
    Button: {
      variants: {
        solid: {
          bg: 'blue.500',
          color: 'white',
          _hover: {
            bg: 'blue.600',
          },
        },
        outline: {
          color: 'blue.400',
          borderColor: 'blue.400',
          _hover: {
            bg: 'rgba(59, 130, 246, 0.1)',
          },
        },
        ghost: {
          _hover: {
            bg: 'rgba(255, 255, 255, 0.08)',
          },
        },
      },
    },
    Input: {
      baseStyle: {
        field: {
          bg: 'gray.800',
          borderColor: 'gray.700',
        },
      },
    },
    Textarea: {
      baseStyle: {
        bg: 'gray.800',
        borderColor: 'gray.700',
      },
    },
    Modal: {
      baseStyle: {
        dialog: {
          bg: 'gray.800',
        },
        header: {
          color: 'gray.100',
        },
        body: {
          color: 'gray.200',
        },
        footer: {
          color: 'gray.200',
        },
      },
    },
  },
});

// Define GraphQL types
interface AIResponse {
  id: string;
  provider: string;
  prompt: string;
  response: string;
  createdAt: string;
  chatId?: string;
}

interface Chat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AIResponse[];
}

// GraphQL queries and mutations
const GET_AI_RESPONSE = gql`
  query GetAIResponse($provider: String!, $prompt: String!, $chatId: String) {
    getAIResponse(provider: $provider, prompt: $prompt, chatId: $chatId) {
      id
      provider
      prompt
      response
      createdAt
      chatId
    }
  }
`;

const GET_CHATS = gql`
  query GetChats {
    getChats {
      id
      title
      createdAt
      updatedAt
    }
  }
`;

const GET_CHAT_BY_ID = gql`
  query GetChatById($chatId: String!) {
    getChatById(chatId: $chatId) {
      id
      title
      createdAt
      updatedAt
      messages {
        id
        provider
        prompt
        response
        createdAt
      }
    }
  }
`;

const CREATE_CHAT = gql`
  mutation CreateChat($title: String) {
    createChat(title: $title) {
      id
      title
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_CHAT_TITLE = gql`
  mutation UpdateChatTitle($chatId: String!, $title: String!) {
    updateChatTitle(chatId: $chatId, title: $title) {
      id
      title
    }
  }
`;

const DELETE_CHAT = gql`
  mutation DeleteChat($chatId: String!) {
    deleteChat(chatId: $chatId)
  }
`;


export default function Home() {


  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState('openai');
  const [prompt, setPrompt] = useState('');
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const { isOpen: isUpgradeModalOpen, onOpen: onUpgradeModalOpen, onClose: onUpgradeModalClose } = useDisclosure();
  
  const toast = useToast();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  
  // GraphQL queries
  const [getAIResponse, { data: responseData, loading: responseLoading }] = 
    useLazyQuery<{ getAIResponse: AIResponse }>(GET_AI_RESPONSE);
  
  const { data: chatsData, loading: chatsLoading, refetch: refetchChats } = 
    useQuery<{ getChats: Chat[] }>(GET_CHATS, {
      skip: !user
    });
  
  const { data: chatData, loading: chatLoading, refetch: refetchChat } =
    useQuery<{ getChatById: Chat }>(GET_CHAT_BY_ID, {
      variables: { chatId: currentChatId },
      skip: !currentChatId || !user
    });
  
  // GraphQL mutations
  const [createChat] = useMutation(CREATE_CHAT, {
    onCompleted: (data) => {
      setCurrentChatId(data.createChat.id);
      refetchChats();
    }
  });
  
  const [updateChatTitle] = useMutation(UPDATE_CHAT_TITLE, {
    onCompleted: () => {
      refetchChats();
      refetchChat();
    }
  });
  
  const [deleteChat] = useMutation(DELETE_CHAT, {
    onCompleted: () => {
      refetchChats();
      setCurrentChatId(null);
    }
  });
  
  // Focus on textarea when chat changes
  useEffect(() => {
    if (currentChatId && textAreaRef.current) {
      textAreaRef.current.focus();
    }
  }, [currentChatId]);
  
  // Check for user session on load
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setLoading(false);
    };
    
    checkUser();
    
    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);
  
  // Handle login
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
  };
  
  // Handle login with email and password
  const handleEmailLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'password123'
    });
    
    if (error) {
      toast({
        title: 'Login failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // Handle signup with email
  const handleSignup = async () => {
    const { error } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'password123',
    });
    
    if (error) {
      toast({
        title: 'Signup failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } else {
      toast({
        title: 'Signup successful',
        description: 'Check your email for confirmation link',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // Handle logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentChatId(null);
  };
  
  // Handle form submission
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      toast({
        title: 'Empty prompt',
        description: 'Please enter a prompt',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    // Get auth token for GraphQL request
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    
    if (!token) {
      toast({
        title: 'Authentication error',
        description: 'Please log in again',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    try {
      await getAIResponse({
        variables: { 
          provider, 
          prompt,
          chatId: currentChatId
        },
        context: {
          headers: {
            authorization: `Bearer ${token}`
          }
        }
      });
      
      // Clear the prompt input after successful submission
      setPrompt('');
      
      // Refetch chat data
      if (currentChatId) {
        refetchChat();
      } else if (responseData?.getAIResponse?.chatId) {
        setCurrentChatId(responseData.getAIResponse.chatId);
        refetchChats();
      }
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error || error instanceof ApolloError 
        ? error.message 
        : 'Something went wrong';
        
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // Handle Enter key to submit (with Shift+Enter for new line)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.closest('form');
      if (form) {
        form.requestSubmit();
      }
    }
  };
  
  // Handle new chat creation
  const handleNewChat = async () => {
    try {
      await createChat({
        variables: {
          title: "New Chat"
        }
      });
      toast({
        title: 'New chat created',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error creating chat',
        description: error instanceof Error ? error.message : 'Failed to create chat',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  // Handle chat selection
  const handleChatSelect = (chatId: string) => {
    setCurrentChatId(chatId);
  };
  
  // Handle chat deletion
  const handleDeleteChat = async (chatId: string) => {
    try {
      await deleteChat({
        variables: { chatId }
      });
      toast({
        title: 'Chat deleted',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error deleting chat',
        description: error instanceof Error ? error.message : 'Failed to delete chat',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  // Handle update chat title
  const handleUpdateChatTitle = async (chatId: string, newTitle: string) => {
    try {
      await updateChatTitle({
        variables: {
          chatId,
          title: newTitle
        }
      });
      
      toast({
        title: 'Title updated',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      
      refetchChats();
      if (currentChatId === chatId) {
        refetchChat();
      }
    } catch (error) {
      toast({
        title: 'Error updating title',
        description: error instanceof Error ? error.message : 'Failed to update title',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  // Handle upgrade button click
  const handleUpgrade = () => {
    onUpgradeModalOpen();
  };
  // Handle upgrade confirmation
  const handleUpgradeConfirm = () => {
    // Here you would implement the actual payment flow
    toast({
      title: 'Upgrade initiated',
      description: 'Redirecting to payment...',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
    onUpgradeModalClose();
  };
  
  
  if (loading) return (
    <ThemeProvider theme={darkTheme}>
      <Box height="100vh" width="100vw" display="flex" justifyContent="center" alignItems="center" bg="gray.900">
        <Spinner size="xl" color="blue.500" thickness="4px" />
      </Box>
    </ThemeProvider>
  );
  
  // Format chats for sidebar
  const sidebarChats = chatsData?.getChats.map(chat => ({
    id: chat.id,
    title: chat.title,
    timestamp: chat.updatedAt,
    selected: chat.id === currentChatId
  })) || [];
  
  // Current chat data for ChatArea
  const currentChat = chatData?.getChatById || null;
  
  return (
    <ThemeProvider theme={darkTheme}>
      <Box bg="gray.900" minH="100vh">
        {/* Top bar with model selector */}
        {user && (
          <ModelSelector 
            selectedModel={provider}
            onModelChange={setProvider}
            user={user}
            onLogout={handleLogout}
          />
        )}
        
        <Box pt="70px"> {/* Add padding for the fixed top bar */}
          {!user ? (
            <Container maxW="container.md" py={8}>
              <Heading mb={8} color="gray.100">AI Platform</Heading>
              <Box>
                <Text mb={4} color="gray.300">Please login to use the platform</Text>
                <Button onClick={handleLogin} colorScheme="blue" mr={4}>
                  Log In with Google
                </Button>
                
                <Button onClick={handleEmailLogin} variant="outline" mr={4}>
                  Log In with Email
                </Button>
                
                <Button onClick={handleSignup} variant="outline">
                  Sign Up
                </Button>
              </Box>
            </Container>
          ) : (
            <Flex>
              {/* Sidebar with chat management */}
              <Sidebar 
                chats={sidebarChats}
                onChatSelect={handleChatSelect}
                onNewChat={handleNewChat}
                onDeleteChat={handleDeleteChat}
                onUpdateChatTitle={handleUpdateChatTitle}
                onUpgradeClick={handleUpgrade}
              />
              
              {/* Main content */}
              <Box ml="250px" width="calc(100% - 250px)" p={4}>
                {/* Chat Area Component - now without edit/delete functionality */}
                <ChatArea
                  currentChat={currentChat}
                  isLoading={chatLoading}
                  onNewChat={handleNewChat}
                />
                
                {/* Input area */}
                {currentChatId && (
                  <Box 
                    mt={4} 
                    p={4} 
                    borderRadius="md" 
                    bg="gray.800"
                    border="1px"
                    borderColor="gray.700"
                    shadow="sm"
                  >
                    <form onSubmit={handleSubmit}>
                      <Flex gap={2}>
                        <Textarea
                          ref={textAreaRef}
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
                          size="md"
                          rows={1}
                          resize="none"
                          isDisabled={responseLoading}
                          borderRadius="md"
                          pr="40px"
                          minH="50px"
                          maxH="150px"
                          flexGrow={1}
                          bg="gray.800"
                          color="gray.200"
                          borderColor="gray.700"
                          _hover={{ borderColor: "gray.600" }}
                          _focus={{ borderColor: "blue.400", boxShadow: "0 0 0 1px rgba(59, 130, 246, 0.5)" }}
                        />
                        <IconButton
                          type="submit"
                          icon={<FiSend />}
                          aria-label="Send message"
                          isLoading={responseLoading}
                          colorScheme="blue"
                          alignSelf="flex-end"
                          borderRadius="md"
                          size="lg"
                        />
                      </Flex>
                      
                      <Flex justifyContent="flex-end" mt={2} px={1}>
                      </Flex>
                    </form>
                  </Box>
                )}
              </Box>
            </Flex>
          )}
        </Box>
        
        {/* Upgrade modal */}
        <UpgradeModal 
        isOpen={isUpgradeModalOpen} 
        onClose={onUpgradeModalClose} 
        onUpgrade={handleUpgradeConfirm} 
      />
      </Box>
    </ThemeProvider>
  );
}