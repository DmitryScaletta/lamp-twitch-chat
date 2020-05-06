import { nanoid } from '@reduxjs/toolkit';
import * as twitchIrc from 'twitch-simple-irc';
import * as tekko from 'tekko';

import type * as api from 'api';
import type { RootState } from 'app/rootReducer';
import type {
  Message,
  Notice,
  UserNotice,
  OwnMessage,
} from 'features/chat/slice/messages';
import type { ChatState } from 'features/chat/slice';
import {
  blockedUsersSelector,
  globalBadgesSelector,
  channelBadgesSelector,
  emotesSelector,
} from 'features/chat/selectors';
import type { StateEmotes } from 'features/chat/selectors';
import parseMessageEntities from 'features/chat/utils/parseMessageEntities';
import * as htmlEntity from 'features/chat/utils/htmlEntity';
import checkIsMenction from 'features/chat/utils/checkIsMention';
import { writeEmotesUsageStatistic } from 'features/chat/utils/emotesUsageStatistic';

export const normalizeMessage = (
  { message, tags, user, channel, isAction }: twitchIrc.MessageEvent,
  chatState: ChatState,
  isMention: boolean,
): Message | null => {
  const fakeState = { chat: chatState } as RootState;

  // messages from blocked users filtered before

  const globalBadges = globalBadgesSelector(fakeState);
  const channelBadges = channelBadgesSelector(fakeState);
  const emotes = emotesSelector(fakeState);

  return {
    type: 'message',
    id: tags.id,
    message,
    channel,
    entities: parseMessageEntities(message, emotes, tags.emotes),
    user: {
      id: tags.userId,
      login: user,
      displayName: tags.displayName,
      color: tags.color,
      badges: htmlEntity.createBadges(tags.badges, globalBadges, channelBadges),
    },
    timestamp: tags.tmiSentTs,
    isAction,
    isHistory: false,
    isDeleted: false,
    isMention,
  };
};

export const normalizeNotice = (
  { message, channel, tags: { msgId } }: twitchIrc.NoticeEvent,
  id: string,
): Notice => ({
  type: 'notice',
  id,
  message,
  channel,
  noticeType: msgId,
});

export const normalizeUserNotice = ({
  message,
  channel,
  tags: { id, msgId, login, systemMsg },
}: twitchIrc.UserNoticeEvent): UserNotice => ({
  type: 'user-notice',
  id,
  message,
  channel,
  noticeType: msgId,
  systemMessage: systemMsg,
  user: {
    login,
  },
});

export const normalizeOwnMessage = (
  { message, channel, tags, userId, userLogin }: OwnMessage,
  chatState: ChatState,
): Message => {
  const fakeState = { chat: chatState } as RootState;
  const globalBadges = globalBadgesSelector(fakeState);
  const channelBadges = channelBadgesSelector(fakeState);
  const emotes = emotesSelector(fakeState);

  const isAction = message.startsWith('/me ');
  const normalizedMessage = isAction ? message.slice(4) : message;

  const entities = parseMessageEntities(normalizedMessage, emotes, null, true);
  writeEmotesUsageStatistic(entities);

  return {
    type: 'message',
    id: nanoid(),
    message: normalizedMessage,
    channel,
    entities,
    user: {
      id: userId as string,
      login: userLogin as string,
      displayName: tags.displayName,
      color: tags.color,
      badges: htmlEntity.createBadges(tags.badges, globalBadges, channelBadges),
    },
    timestamp: Date.now(),
    isAction,
    isHistory: false,
    isDeleted: false,
    isMention: false,
  };
};

export const normalizeHistoryMessage = (
  { tags, params: [channel, message], prefix }: tekko.Message,
  emotes: StateEmotes,
  globalBadges: Record<string, api.TwitchBadge>,
  channelBadges: Record<string, api.TwitchBadge>,
  userLogin: string | null,
): Message => {
  const isAction = twitchIrc.getIsAction(message);
  const normalizedMessage = isAction
    ? twitchIrc.normalizeActionMessage(message)
    : message;
  const parsedTags = (twitchIrc.parseMessageTags(
    tags,
  ) as unknown) as twitchIrc.MessageTags;

  const messageUser = prefix ? prefix.name : '';
  const isMention = checkIsMenction(userLogin, messageUser, normalizedMessage);

  return {
    type: 'message',
    id: parsedTags.id,
    message: normalizedMessage,
    channel: channel.slice(1),
    entities: parseMessageEntities(
      normalizedMessage,
      emotes,
      parsedTags.emotes,
    ),
    user: {
      id: parsedTags.userId,
      login: messageUser,
      displayName: parsedTags.displayName,
      color: parsedTags.color,
      badges: htmlEntity.createBadges(
        parsedTags.badges,
        globalBadges,
        channelBadges,
      ),
    },
    timestamp: parsedTags.tmiSentTs,
    isAction,
    isHistory: true,
    isDeleted: false,
    isMention,
  };
};

export const normalizeHistoryMessages = (
  rawMessages: string[],
  chatState: ChatState,
  userLogin: string | null,
): Message[] => {
  const fakeState = { chat: chatState } as RootState;
  const globalBadges = globalBadgesSelector(fakeState);
  const channelBadges = channelBadgesSelector(fakeState);
  const emotes = emotesSelector(fakeState);
  const blockedUsers = blockedUsersSelector(fakeState);

  return rawMessages.reduce<Message[]>((acc, rawMessage) => {
    const message = tekko.parse(rawMessage) as tekko.Message;

    const { command, prefix } = message;

    if (
      command === 'PRIVMSG' &&
      prefix &&
      !blockedUsers.includes(prefix.name)
    ) {
      acc.push(
        normalizeHistoryMessage(
          message,
          emotes,
          globalBadges,
          channelBadges,
          userLogin,
        ),
      );
    }

    return acc;
  }, []);
};
