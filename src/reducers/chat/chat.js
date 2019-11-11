import { createActions, handleActions, combineActions } from 'redux-actions';
import { mergeDeepRight, pipe, prop, path, map, omit } from 'ramda';

import { fetchBlockedUsers as apiFetchBlockedUsers } from 'utils/api';
import { STORE_FLAGS } from 'utils/constants';

const defaultState = {
  currentChannel: null,
  isConnected: false,
  globalState: {},
  channels: {
    // [channel]: {
    //   userState: {},
    //   roomState: {},
    // }
  },
  blockedUsers: {
    ...STORE_FLAGS.DEFAULT,
    items: [],
  },
};

export const {
  setCurrentChannel,
  setIsConnected,
  updateGlobalUserState,
  updateUserState,
  updateRoomState,
  removeChannel,
} = createActions(
  'SET_CURRENT_CHANNEL',
  'SET_IS_CONNECTED',
  'UPDATE_GLOBAL_USER_STATE',
  'UPDATE_USER_STATE',
  'UPDATE_ROOM_STATE',
  'REMOVE_CHANNEL',
);

const {
  fetchBlockedUsersRequest,
  fetchBlockedUsersSuccess,
  fetchBlockedUsersFailure,
} = createActions(
  'FETCH_BLOCKED_USERS_REQUEST',
  'FETCH_BLOCKED_USERS_SUCCESS',
  'FETCH_BLOCKED_USERS_FAILURE',
);

const parseBlockedUsers = pipe(prop('blocks'), map(path(['user', 'name'])));

export const fetchBlockedUsers = (userId) => async (dispatch) => {
  dispatch(fetchBlockedUsersRequest());
  try {
    const response = await apiFetchBlockedUsers(userId);

    dispatch(fetchBlockedUsersSuccess({ items: parseBlockedUsers(response) }));
  } catch (error) {
    dispatch(fetchBlockedUsersFailure({ error }));
  }
};

const handleSetCurrentChannel = (state, { payload }) => ({
  ...state,
  currentChannel: payload,
});
const handleSetIsConnected = (state, { payload }) => ({
  ...state,
  isConnected: payload,
});
const handleUpdateGlobalUserState = (state, { payload: { tags } }) => ({
  ...state,
  globalState: { ...state.globalState, ...tags },
});
const handleUpdateUserState = (state, { payload: { channel, tags } }) => ({
  ...state,
  channels: {
    ...state.channels,
    [channel]: { ...state.channels[channel], userState: tags },
  },
});
const handleUpdateRoomState = (state, { payload: { channel, tags } }) => ({
  ...state,
  channels: {
    ...state.channels,
    [channel]: { ...state.channels[channel], roomState: tags },
  },
});
const handleRemoveChannel = (state, { payload: channel }) => ({
  ...state,
  channels: omit([channel], state.channels),
});
const handleFetchBlockUsers = (state, { type, payload }) => {
  if (type === fetchBlockedUsersRequest.toString()) {
    return mergeDeepRight(state, {
      blockedUsers: { ...STORE_FLAGS.REQUEST },
    });
  }

  if (type === fetchBlockedUsersSuccess.toString()) {
    return mergeDeepRight(state, {
      blockedUsers: { ...STORE_FLAGS.SUCCESS, items: payload.items },
    });
  }

  if (type === fetchBlockedUsersFailure.toString()) {
    return mergeDeepRight(state, {
      blockedUsers: { ...STORE_FLAGS.FAILURE, error: payload.error },
    });
  }

  return state;
};

const reducer = handleActions(
  {
    [setCurrentChannel]: handleSetCurrentChannel,
    [setIsConnected]: handleSetIsConnected,
    [updateGlobalUserState]: handleUpdateGlobalUserState,
    [updateUserState]: handleUpdateUserState,
    [updateRoomState]: handleUpdateRoomState,
    [removeChannel]: handleRemoveChannel,
    [combineActions(
      fetchBlockedUsersRequest,
      fetchBlockedUsersSuccess,
      fetchBlockedUsersFailure,
    )]: handleFetchBlockUsers,
  },
  defaultState,
);

export default reducer;
