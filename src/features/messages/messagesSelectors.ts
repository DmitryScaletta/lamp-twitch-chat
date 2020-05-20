import type { RootState } from 'app/rootReducer';
import type { ChatMessage } from 'features/messages/messagesSlice';
import { currentChannelSelector } from 'features/chat/chatSelectors';

export const messagesSelector = (state: RootState): ChatMessage[] =>
  state.messages[currentChannelSelector(state)]?.items || [];

export const usersSelector = (state: RootState): string[] =>
  state.messages[currentChannelSelector(state)]?.users || [];

export const isHistoryLoadedSelector = (state: RootState) => {
  const currentChannel = currentChannelSelector(state);

  return (
    state.messages[currentChannel]?.history.status === 'success' ||
    state.messages[currentChannel]?.history.status === 'error' ||
    false
  );
};

export const isHistoryAddedSelector = (state: RootState) =>
  state.messages[currentChannelSelector(state)]?.history.isAdded || false;

export const isEvenSelector = (state: RootState) =>
  state.messages[currentChannelSelector(state)]?.isEven || false;
