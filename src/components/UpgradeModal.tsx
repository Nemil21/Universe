import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Text,
  Box,
  Heading
} from '@chakra-ui/react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, onUpgrade }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent bg="gray.800" color="gray.100">
        <ModalHeader>Upgrade to Pro</ModalHeader>
        <ModalBody>
          <Text mb={4} color="gray.300">Upgrade to AI Platform Pro for exclusive benefits:</Text>
          <Box p={4} bg="gray.700" borderRadius="md" mb={4}>
            <Text color="gray.200">✓ Access to all advanced AI models</Text>
            <Text color="gray.200">✓ Higher message limits</Text>
            <Text color="gray.200">✓ Priority support</Text>
            <Text color="gray.200">✓ Early access to new features</Text>
          </Box>
          <Heading size="md" mb={1} color="gray.100">₹1000/month</Heading>
          <Text fontSize="sm" color="gray.400">Cancel anytime</Text>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose} color="gray.300">
            Maybe Later
          </Button>
          <Button colorScheme="purple" onClick={onUpgrade}>
            Upgrade Now
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default UpgradeModal;