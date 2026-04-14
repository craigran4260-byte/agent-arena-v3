'use client';

import { Modal } from '@/components/ui';
import { SubmitAgentForm } from '@/components/SubmitAgentForm';

export interface SubmitAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SubmitAgentModal = ({ isOpen, onClose, onSuccess }: SubmitAgentModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Submit New Agent" size="md">
      <SubmitAgentForm onSuccess={onSuccess} onCancel={onClose} />
    </Modal>
  );
};

SubmitAgentModal.displayName = 'SubmitAgentModal';
