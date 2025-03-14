import React from 'react';
import {
  Box,
  Select,
  Flex,
  Heading,
  Button,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Text,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import { ChevronDownIcon, SettingsIcon } from '@chakra-ui/icons';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  user: any;
  onLogout: () => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ 
  selectedModel, 
  onModelChange, 
  user, 
  onLogout 
}) => {
  // Dark theme colors - using fixed colors instead of useColorModeValue
  const bgColor = "gray.900";
  const borderColor = "gray.700";
  const selectBg = "gray.800";
  return (
    <Box 
      position="fixed"
      top={0}
      left={0}
      right={0}
      height="70px"
      bg={bgColor}
      borderBottom="1px"
      borderColor={borderColor}
      zIndex={10}
      px={4}
      py={2}
    >
      <Flex justifyContent="space-between" alignItems="center" h="100%">
        <Heading size="md" color="gray.100">Our Universe</Heading>
        
        <Flex alignItems="center" width="40%">
          <Box flexGrow={1} mr={4}>
            <Select 
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              size="md"
              bg={selectBg}
              borderColor={borderColor}
              color="gray.200"
              _hover={{ borderColor: "gray.600" }}
              iconColor="gray.400"
            >
              <option value="openai">ChatGPT</option>
              <option value="gemini">Google Gemini</option>
              <option value="anthropic">Claude</option>
              <option value="mistral">Mistral AI</option>
              {/* Can add these apis later  */}
            </Select>
          </Box>
        </Flex>
        
        <Flex alignItems="center">
          <Menu>
            <MenuButton 
              as={Button}
              rightIcon={<ChevronDownIcon />}
              leftIcon={<Avatar size="xs" name={user?.email} bg="blue.500" />}
              variant="ghost"
              color="gray.300"
              _hover={{ bg: "gray.800" }}
              _active={{ bg: "gray.800" }}
              size="sm"
            >
            </MenuButton>
            <MenuList bg="gray.800" borderColor="gray.700">
              <MenuItem bg="gray.800" _hover={{ bg: "gray.700" }} color="gray.200">
                Profile
              </MenuItem>
              <MenuItem bg="gray.800" _hover={{ bg: "gray.700" }} color="gray.200">
                Settings
              </MenuItem>
              <MenuItem bg="gray.800" _hover={{ bg: "gray.700" }} color="gray.200" onClick={onLogout}>
                Log Out
              </MenuItem>
            </MenuList>
          </Menu>
          
          <Tooltip label="Settings" placement="bottom">
            <IconButton
              aria-label="Settings"
              icon={<SettingsIcon />}
              variant="ghost"
              color="gray.400"
              _hover={{ bg: "gray.800", color: "gray.200" }}
              ml={2}
            />
          </Tooltip>
        </Flex>
      </Flex>
    </Box>
  );
};

export default ModelSelector;