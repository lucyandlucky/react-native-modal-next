import React, { useContext, useId, useLayoutEffect } from 'react';

import { ModalContext } from './context';
import type {
  ModalRequest,
  QModalAnimation,
  QModalPlacement,
} from './modal-state';

export interface QModalProps {
  visible: boolean;
  children: React.ReactNode;
  priority?: number;
  interruptible?: boolean;
  placement?: QModalPlacement;
  animation?: QModalAnimation;
  backdropOpacity?: number;
  dismissOnBackdrop?: boolean;
  dismissOnBack?: boolean;
  containerStyle?: ModalRequest['containerStyle'];
  onRequestClose?: () => void;
}

export const QModal: React.FC<QModalProps> = ({
  visible,
  children,
  priority = 0,
  interruptible = true,
  placement = 'center',
  animation = 'fade',
  backdropOpacity = 0.35,
  dismissOnBackdrop = false,
  dismissOnBack = true,
  containerStyle,
  onRequestClose,
}) => {
  const context = useContext(ModalContext);
  const id = useId();

  if (!context) {
    throw new Error('QModal must be rendered inside QModalProvider');
  }

  useLayoutEffect(() => {
    context.upsert({
      id,
      visible,
      children,
      priority,
      interruptible,
      placement,
      animation,
      backdropOpacity,
      dismissOnBackdrop,
      dismissOnBack,
      containerStyle,
      onRequestClose,
    });
  }, [
    animation,
    backdropOpacity,
    children,
    containerStyle,
    context,
    dismissOnBack,
    dismissOnBackdrop,
    id,
    interruptible,
    onRequestClose,
    placement,
    priority,
    visible,
  ]);

  useLayoutEffect(() => () => context.remove(id), [context, id]);

  return null;
};
