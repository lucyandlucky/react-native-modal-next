import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { Animated, Platform } from 'react-native';
import Modal from 'react-native-modal';

import { ModalContext } from './context';
import {
  initialModalState,
  modalReducer,
  type ModalRequest,
} from './modal-state';
import { styles } from './styles';

const CONTENT_ANIMATION_MS = 180;

export const QModalProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(modalReducer, initialModalState);
  const progress = useRef(new Animated.Value(0)).current;
  const nativePhaseRef = useRef(state.nativePhase);
  const hiddenWaitersRef = useRef<Set<() => void>>(new Set());
  const active = state.active;
  const activePhase = active?.phase;
  const activeSession = active?.session;

  useLayoutEffect(() => {
    nativePhaseRef.current = state.nativePhase;
  }, [state.nativePhase]);

  const upsert = useCallback((request: ModalRequest) => {
    dispatch({ type: 'upsert', request });
  }, []);
  const remove = useCallback((id: string) => {
    dispatch({ type: 'remove', id });
  }, []);
  const waitUntilHidden = useCallback(() => {
    if (nativePhaseRef.current === 'closed') {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      hiddenWaitersRef.current.add(resolve);
    });
  }, []);
  const context = useMemo(
    () => ({ upsert, remove, waitUntilHidden }),
    [upsert, remove, waitUntilHidden]
  );

  useEffect(() => {
    if (state.nativePhase !== 'closed') {
      return;
    }
    hiddenWaitersRef.current.forEach((resolve) => resolve());
    hiddenWaitersRef.current.clear();
  }, [state.nativePhase]);

  useEffect(() => {
    if (
      activePhase === undefined ||
      activePhase === 'shown' ||
      activeSession === undefined
    ) {
      return;
    }

    const session = activeSession;
    const phase = activePhase;
    const animation = Animated.timing(progress, {
      toValue: phase === 'exiting' ? 0 : 1,
      duration: CONTENT_ANIMATION_MS,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) {
        dispatch({ type: phase === 'exiting' ? 'exited' : 'entered', session });
      }
    });
    return () => animation.stop();
  }, [activePhase, activeSession, progress]);

  const requestClose = useCallback(
    (fromBackdrop: boolean) => {
      if (!active || active.phase !== 'shown') {
        return;
      }
      if (
        fromBackdrop
          ? active.request.dismissOnBackdrop
          : active.request.dismissOnBack
      ) {
        active.request.onRequestClose?.();
      }
    },
    [active]
  );

  const onModalHide = useCallback(() => {
    if (Platform.OS !== 'ios') {
      dispatch({ type: 'nativeClosed' });
    }
  }, []);
  const onDismiss = useCallback(() => {
    if (Platform.OS === 'ios') {
      dispatch({ type: 'nativeClosed' });
    }
  }, []);

  const slide = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [32, 0],
  });

  return (
    <ModalContext.Provider value={context}>
      {children}
      <Modal
        isVisible={state.nativePhase === 'open'}
        animationIn="fadeIn"
        animationOut="fadeOut"
        animationInTiming={CONTENT_ANIMATION_MS}
        animationOutTiming={CONTENT_ANIMATION_MS}
        backdropTransitionInTiming={CONTENT_ANIMATION_MS}
        backdropTransitionOutTiming={CONTENT_ANIMATION_MS}
        backdropOpacity={active?.request.backdropOpacity ?? 0.35}
        useNativeDriver
        useNativeDriverForBackdrop
        hideModalContentWhileAnimating
        statusBarTranslucent
        onBackdropPress={() => requestClose(true)}
        onBackButtonPress={() => requestClose(false)}
        onModalHide={onModalHide}
        onDismiss={onDismiss}
        style={[
          styles.modal,
          active?.request.placement === 'bottom'
            ? styles.bottom
            : styles.center,
        ]}
      >
        <Animated.View
          pointerEvents={active?.phase === 'shown' ? 'auto' : 'none'}
          style={[
            styles.content,
            active?.request.containerStyle,
            {
              opacity: progress,
              transform:
                active?.request.animation === 'slide'
                  ? [{ translateY: slide }]
                  : undefined,
            },
          ]}
        >
          {active?.request.children}
        </Animated.View>
      </Modal>
    </ModalContext.Provider>
  );
};
