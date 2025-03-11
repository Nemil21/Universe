import React, { useState } from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  Divider,
  List,
  ListItem,
  Flex,
  IconButton,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Input,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from '@chakra-ui/react';
import { ChatIcon, AddIcon, StarIcon, SettingsIcon, DeleteIcon, EditIcon } from '@chakra-ui/icons';
import { BsThreeDotsVertical } from 'react-icons/bs';

interface ChatItem {
  id: string;
  title: string;
  timestamp: string;
  selected: boolean;
}

interface SidebarProps {
  chats: ChatItem[];
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  onUpdateChatTitle: (chatId: string, title: string) => void;
  onUpgradeClick: () => void;
  currentTime: string;
  currentUser: string;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  chats, 
  onChatSelect, 
  onNewChat, 
  onDeleteChat,
  onUpdateChatTitle,
  onUpgradeClick,
  currentTime,
  currentUser 
}) => {
  // Dark theme colors
  const bgColor = "gray.900";
  const borderColor = "gray.700";
  const hoverBg = "gray.800";
  const selectedBg = "gray.800";
  const textColor = "gray.300";
  const mutedTextColor = "gray.500";
  const buttonBg = "gray.800";
  
  // State for editing
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const { isOpen: isEditModalOpen, onOpen: openEditModal, onClose: closeEditModal } = useDisclosure();

  // Handle edit chat title
  const handleEditClick = (chatId: string, currentTitle: string) => {
    setEditingChatId(chatId);
    setEditingTitle(currentTitle);
    openEditModal();
  };
  
  // Save edited title
  const handleSaveTitle = () => {
    if (editingChatId && editingTitle.trim()) {
      onUpdateChatTitle(editingChatId, editingTitle);
      closeEditModal();
      setEditingChatId(null);
    }
  };

  return (
    <Box
      width="250px"
      height="calc(100vh - 70px)" 
      borderRight="1px"
      borderColor={borderColor}
      bg={bgColor}
      overflowY="auto"
      position="fixed"
      left={0}
      top="70px"
      display="flex"
      flexDirection="column"
    >
      <VStack spacing={4} align="stretch" p={4} flex="1">
        <Flex justifyContent="space-between" alignItems="center">
          <Heading size="md" color="gray.100">Chats</Heading>
          <IconButton
            aria-label="New Chat"
            icon={<AddIcon />}
            size="sm"
            onClick={onNewChat}
            colorScheme="blue"
            variant="ghost"
            _hover={{ bg: "gray.800" }}
          />
        </Flex>
        <Divider borderColor={borderColor} />
        
        {chats.length === 0 ? (
          <Text fontSize="sm" color={mutedTextColor} py={4} textAlign="center">
            No chats yet. Start a new conversation!
          </Text>
        ) : (
          <List spacing={1}>
            {chats.map(chat => (
              <ListItem 
                key={chat.id}
                p={2}
                borderRadius="md"
                bg={chat.selected ? selectedBg : 'transparent'}
                _hover={{ bg: chat.selected ? selectedBg : hoverBg }}
                cursor="pointer"
                onClick={() => onChatSelect(chat.id)}
              >
                <Flex justifyContent="space-between" alignItems="center">
                  <Flex alignItems="center" maxW="80%">
                    <ChatIcon mr={2} color={chat.selected ? "blue.400" : mutedTextColor} />
                    <Text 
                      noOfLines={1} 
                      fontSize="sm" 
                      fontWeight={chat.selected ? "medium" : "normal"}
                      color={chat.selected ? "gray.100" : textColor}
                    >
                      {chat.title}
                    </Text>
                  </Flex>
                  <Menu>
                    <MenuButton
                      as={IconButton}
                      icon={<BsThreeDotsVertical />}
                      variant="ghost"
                      size="xs"
                      color={mutedTextColor}
                      onClick={(e) => e.stopPropagation()}
                      _hover={{ color: "gray.300", bg: "gray.700" }}
                    >
                      Actions
                    </MenuButton>
                    <MenuList bg="gray.800" borderColor="gray.700" minW="150px">
                      <MenuItem 
                        icon={<EditIcon />} 
                        bg="gray.800" 
                        _hover={{ bg: "gray.700" }} 
                        color="gray.200"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(chat.id, chat.title);
                        }}
                      >
                        Rename
                      </MenuItem>
                      <MenuItem 
                        icon={<DeleteIcon />} 
                        bg="gray.800" 
                        _hover={{ bg: "gray.700" }} 
                        color="red.300"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteChat(chat.id);
                        }}
                      >
                        Delete
                      </MenuItem>
                    </MenuList>
                  </Menu>
                </Flex>
                <Text fontSize="xs" color={mutedTextColor} mt={1}>
                  {new Date(chat.timestamp).toLocaleDateString()}
                </Text>
              </ListItem>
            ))}
          </List>
        )}
      </VStack>
      
      {/* Upgrade button */}
      <Box p={4} borderTop="1px" borderColor={borderColor} mt="auto">
        <Button 
          colorScheme="purple" 
          size="md" 
          width="100%" 
          leftIcon={<StarIcon />}
          onClick={onUpgradeClick}
          variant="outline"
          _hover={{
            bg: "rgba(128, 90, 213, 0.2)",
          }}
          bg="transparent"
          transition="all 0.2s"
        >
          Upgrade to Pro
        </Button>
      </Box>
      
      {/* Edit chat title modal */}
      <Modal isOpen={isEditModalOpen} onClose={closeEditModal}>
        <ModalOverlay />
        <ModalContent bg="gray.800" color="gray.100">
          <ModalHeader>Edit Chat Name</ModalHeader>
          <ModalBody>
            <Input 
              value={editingTitle} 
              onChange={(e) => setEditingTitle(e.target.value)}
              placeholder="Enter new title"
              autoFocus
              bg="gray.800"
              borderColor="gray.700"
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={closeEditModal} color="gray.300">
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleSaveTitle}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Sidebar;