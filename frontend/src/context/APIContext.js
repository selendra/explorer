import { ApiPromise, WsProvider } from "@polkadot/api";
import { createContext, useContext, useReducer } from "react";
import { selendraNode } from "../constants/selendra";

const initialState = {
  // These are the states
  socket: selendraNode.mainnet,
  keyring: null,
  keyringState: null,
  api: null,
  apiError: null,
  apiState: null,
}

// Reducer function for `useReducer`
const reducer = (state, action) => {
  switch (action.type) {
    case 'CONNECT_INIT':
      return { ...state, apiState: 'CONNECT_INIT' }
    case 'CONNECT':
      return { ...state, api: action.payload, apiState: 'CONNECTING' }
    case 'CONNECT_SUCCESS':
      return { ...state, apiState: 'READY' }
    case 'CONNECT_ERROR':
      return { ...state, apiState: 'ERROR', apiError: action.payload }
    case 'LOAD_KEYRING':
      return { ...state, keyringState: 'LOADING' }
    case 'SET_KEYRING':
      return { ...state, keyring: action.payload, keyringState: 'READY' }
    case 'KEYRING_ERROR':
      return { ...state, keyring: null, keyringState: 'ERROR' }
    default:
      throw new Error(`Unknown type: ${action.type}`)
  }
}

// Connecting to the Substrate node
const connect = (state, dispatch) => {
  const { apiState, socket } = state;
  // We only want this function to be performed once
  if (apiState) return;

  dispatch({ type: 'CONNECT_INIT' });

  console.log(`Connected socket: ${socket}`);
  const provider = new WsProvider(socket);
  const _api = new ApiPromise({ provider });

  // Set listeners for disconnection and reconnection event.
  _api.on('connected', () => {
    dispatch({ type: 'CONNECT', payload: _api });
    // `ready` event is not emitted upon reconnection and is checked explicitly here.
    _api.isReady.then(_api => dispatch({ type: 'CONNECT_SUCCESS' }));
  })
  _api.on('ready', () => dispatch({ type: 'CONNECT_SUCCESS' }));
  _api.on('error', err => dispatch({ type: 'CONNECT_ERROR', payload: err }));
}

const APIContext = createContext();

const APIContextProvider = props => {
  const [state, dispatch] = useReducer(reducer, initialState);
  connect(state, dispatch);

  return (
    <APIContext.Provider value={{ state }}>
      {props.children}
    </APIContext.Provider>
  )
}

const useAPI = () => useContext(APIContext);
const useAPIState = () => useContext(APIContext).state;

export { APIContextProvider, useAPI, useAPIState };