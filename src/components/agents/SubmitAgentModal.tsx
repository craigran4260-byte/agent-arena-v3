'use client';

import { Modal } from '@/components/ui';
import { SimpleAgentForm } from './SimpleAgentForm';

export interface SubmitAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SubmitAgentModal = ({ isOpen, onClose, onSuccess }: SubmitAgentModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Agent" size="lg">
      <SimpleAgentForm onSuccess={onSuccess} onCancel={onClose} />
    </Modal>
  );
};

SubmitAgentModal.displayName = 'SubmitAgentModal';
