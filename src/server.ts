import { server as WebSocketServer } from 'websocket'
import * as http from 'http'

import { createStore } from 'redux'
import { GameState, newGameState, tileSelected, turnEnded } from './model'

export type Action =
  | { type: 'TILE_SELECTED'; payload: { row: number; column: number } }
  | { type: 'NEW_GAME_REQUESTED' }
  | { type: 'NEW_CARDS_REQUESTED' }
  | { type: 'TURN_ENDED' }

const store = createStore((gameState: GameState, action: Action) => {
  switch (action.type) {
    case 'TILE_SELECTED':
      // blah
      return tileSelected(gameState, action.payload.row, action.payload.column)
    case 'NEW_GAME_REQUESTED':
      return newGameState(gameState)
    case 'NEW_CARDS_REQUESTED':
      return newGameState()
    case 'TURN_ENDED':
      return turnEnded(gameState)
    default:
      return gameState
  }
}, newGameState())

const server = http.createServer((request, response) => {
  // process HTTP request. Since we're writing just WebSockets
  // server we don't have to implement anything.
})
server.listen(1337, function() {
  console.log('ready and waiting holmes')
})

// create the server
const wsServer = new WebSocketServer({
  httpServer: server,
})

// WebSocket server
wsServer.on('request', request => {
  console.log('connected')
  var connection = request.accept(void 0, request.origin)

  function updateClient() {
    connection.send(
      JSON.stringify({
        type: 'GAME_STATE',
        payload: store.getState(),
      }),
    )
  }

  updateClient()

  // This is the most important callback for us, we'll handle
  // all messages from users here.
  connection.on('message', message => {
    if (message.type === 'utf8') {
      store.dispatch(JSON.parse(message.utf8Data as string))
      updateClient()
    }
  })
})
