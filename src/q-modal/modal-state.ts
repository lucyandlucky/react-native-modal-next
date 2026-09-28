import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export type QModalPlacement = 'center' | 'bottom';
export type QModalAnimation = 'fade' | 'slide';

export interface ModalRequest {
  id: string;
  visible: boolean;
  children: ReactNode;
  priority: number;
  interruptible: boolean;
  placement: QModalPlacement;
  animation: QModalAnimation;
  backdropOpacity: number;
  dismissOnBackdrop: boolean;
  dismissOnBack: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  onRequestClose?: () => void;
}

interface QueuedRequest extends ModalRequest {
  sequence: number;
}

export interface ActiveModal {
  request: QueuedRequest;
  session: number;
  phase: 'entering' | 'shown' | 'exiting';
}

export interface ModalState {
  requests: QueuedRequest[];
  active: ActiveModal | null;
  nativePhase: 'closed' | 'open' | 'closing';
  nextSequence: number;
  nextSession: number;
}

export type ModalAction =
  | { type: 'upsert'; request: ModalRequest }
  | { type: 'remove'; id: string }
  | { type: 'entered'; session: number }
  | { type: 'exited'; session: number }
  | { type: 'nativeClosed' };

export const initialModalState: ModalState = {
  requests: [],
  active: null,
  nativePhase: 'closed',
  nextSequence: 0,
  nextSession: 0,
};

const chooseNext = (state: ModalState): ModalState => {
  if (state.active || state.nativePhase === 'closing') {
    return state;
  }

  const next = state.requests
    .filter((request) => request.visible)
    .sort((a, b) => b.priority - a.priority || a.sequence - b.sequence)[0];

  if (!next) {
    return state.nativePhase === 'open'
      ? { ...state, nativePhase: 'closing' }
      : state;
  }

  return {
    ...state,
    active: {
      request: next,
      session: state.nextSession,
      phase: 'entering',
    },
    nativePhase: 'open',
    nextSession: state.nextSession + 1,
  };
};

const reconcileActive = (state: ModalState): ModalState => {
  const active = state.active;
  if (!active || active.phase === 'exiting') {
    return chooseNext(state);
  }

  const current = state.requests.find(
    (request) => request.id === active.request.id
  );
  if (!current?.visible) {
    return {
      ...state,
      active: { ...active, phase: 'exiting' },
    };
  }

  const higherPriorityWaiting = state.requests.some(
    (request) => request.visible && request.priority > current.priority
  );
  if (higherPriorityWaiting && current.interruptible) {
    return {
      ...state,
      active: { ...active, request: current, phase: 'exiting' },
    };
  }

  return {
    ...state,
    active: { ...active, request: current },
  };
};

export const modalReducer = (
  state: ModalState,
  action: ModalAction
): ModalState => {
  switch (action.type) {
    case 'upsert': {
      const existing = state.requests.find(
        (request) => request.id === action.request.id
      );
      const newAppearance = action.request.visible && !existing?.visible;
      const request: QueuedRequest = {
        ...action.request,
        sequence: newAppearance
          ? state.nextSequence
          : (existing?.sequence ?? state.nextSequence),
      };
      const requests = existing
        ? state.requests.map((item) =>
            item.id === request.id ? request : item
          )
        : [...state.requests, request];

      return reconcileActive({
        ...state,
        requests,
        nextSequence: state.nextSequence + (newAppearance ? 1 : 0),
      });
    }
    case 'remove':
      return reconcileActive({
        ...state,
        requests: state.requests.filter((request) => request.id !== action.id),
      });
    case 'entered':
      return state.active?.session === action.session &&
        state.active.phase === 'entering'
        ? { ...state, active: { ...state.active, phase: 'shown' } }
        : state;
    case 'exited':
      return state.active?.session === action.session &&
        state.active.phase === 'exiting'
        ? chooseNext({ ...state, active: null })
        : state;
    case 'nativeClosed':
      return state.nativePhase === 'closing'
        ? chooseNext({ ...state, nativePhase: 'closed' })
        : state;
  }
};
