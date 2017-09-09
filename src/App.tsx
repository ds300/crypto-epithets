import * as React from 'react'
import './App.css'
import 'bootstrap/dist/css/bootstrap.css'
import { observable, autorun, computed } from 'mobx'
import { observer } from 'mobx-react'
import { GameState, Tile } from './model'
import { Action } from './server'
import styled from 'glamorous'

const getFillColorForAssignment = (assignment: Tile['assignment']) =>
  assignment === 'red'
    ? '#DF3A28'
    : assignment === 'blue'
      ? '#289AD3'
      : assignment === 'assassin' ? '#333' : '#999'

const TileWrapper = styled.div<{
  available: boolean
  assignment: Tile['assignment']
  revealed: boolean
}>(
  {
    border: '0.3vw solid #EEE',
    borderRadius: 15,
    display: 'inline-block',
    width: '16vw',
    height: '11vh',
    margin: '1vw',
    boxSizing: 'border-box',
    textTransform: 'uppercase',
    letterSpacing: 1.3,
    fontSize: '1.6vw',
  },
  ({ available, assignment, revealed }) => ({
    ...available
      ? {
          ':hover': {
            borderColor: '#999',
            cursor: 'pointer',
          },
        }
      : {},
    backgroundColor: revealed ? getFillColorForAssignment(assignment) : 'white',
    color: revealed ? 'white' : '#444',
    borderColor: revealed ? getFillColorForAssignment(assignment) : '#444',
  }),
)

const WordWrapper = styled.div({
  height: '100%',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
})
const Row = styled.div({
  display: 'flex',
  flexDirection: 'row',
  alignContent: 'center',
})
const PageContainer = styled.div({
  width: '100%',
  display: 'flex',
  paddingTop: '4vw',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
})

type ViewerRole = 'codemaster' | 'guesser'

function statsForTeam(gameState: GameState, team: 'red' | 'blue') {
  let total = 0
  let won = 0
  gameState.tiles.forEach(row =>
    row.forEach(({ assignment, guess }) => {
      if (assignment === team) {
        total++
        if (guess) {
          won++
        }
      }
    }),
  )
  return { total, won }
}

function assassinWasFound(gameState: GameState): boolean {
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const { assignment, guess } = gameState.tiles[row][col]
      if (assignment === 'assassin' && guess) {
        return true
      }
    }
  }
  return false
}

function Tile(props: Tile & { viewerRole: ViewerRole; onPress(): void }) {
  const available = props.guess === null && props.viewerRole === 'guesser'
  return (
    <TileWrapper
      onClick={available ? props.onPress : () => {}}
      available={available}
      assignment={props.assignment}
      revealed={!available || props.viewerRole === 'codemaster'}
    >
      <WordWrapper>{props.word}</WordWrapper>
    </TileWrapper>
  )
}

@observer
class App extends React.Component {
  @observable gameState: GameState | null = null
  @observable server = 'localhost:1337'
  @observable role: ViewerRole = 'guesser'
  @computed
  get redStats() {
    return this.gameState
      ? statsForTeam(this.gameState, 'red')
      : { total: 0, won: 0 }
  }
  @computed
  get blueStats() {
    return this.gameState
      ? statsForTeam(this.gameState, 'blue')
      : { total: 0, won: 0 }
  }
  @computed
  get isGameOver() {
    return (
      this.redStats.total === this.redStats.won ||
      this.blueStats.total === this.blueStats.won ||
      (this.gameState && assassinWasFound(this.gameState))
    )
  }
  socket: WebSocket
  unsubscribe = () => {}
  componentDidMount() {
    let presses = 0
    window.onkeypress = () => {
      if (++presses > 10) {
        this.role = 'codemaster'
      }
    }
    autorun(() => {
      this.unsubscribe()
      this.socket = new WebSocket(`ws://${this.server}`)
      this.unsubscribe = () => {
        this.socket.close()
      }
      this.socket.onmessage = msg => {
        const data = JSON.parse(msg.data)

        console.log('msg', data)
        switch (data.type) {
          case 'GAME_STATE': {
            this.gameState = data.payload
            break
          }
          default:
        }
      }
    })
  }
  nextTurn = () => {
    if (this.socket) {
      this.socket.send(
        JSON.stringify({
          type: 'TURN_ENDED',
        } as Action),
      )
    }
  }
  nextGame = () => {
    if (this.socket) {
      this.socket.send(
        JSON.stringify({
          type: 'NEW_GAME_REQUESTED',
        } as Action),
      )
    }
  }
  resetCards = () => {
    if (this.socket) {
      this.socket.send(
        JSON.stringify({
          type: 'NEW_CARDS_REQUESTED',
        } as Action),
      )
    }
  }
  renderHeader() {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 40 }}>
            Blue: {this.blueStats.won}/{this.blueStats.total} — Red:
            {this.redStats.won}/{this.redStats.total}
          </span>
        </div>
        <button
          className="btn btn-primary"
          type="button"
          onClick={this.nextTurn}
        >
          Next Turn
        </button>
        &nbsp;
        <button
          className="btn btn-warning"
          type="button"
          onClick={this.nextGame}
        >
          Next Game
        </button>
        &nbsp;
        <button
          className="btn btn-danger"
          type="button"
          onClick={this.resetCards}
        >
          Reset Cards
        </button>
      </div>
    )
  }
  selectTile = (row: number, column: number) => {
    if (this.socket) {
      this.socket.send(
        JSON.stringify({
          type: 'TILE_SELECTED',
          payload: {
            row,
            column,
          },
        } as Action),
      )
    }
  }
  render() {
    return (
      <div
        style={{
          borderLeftWidth: '4vw',
          borderRightWidth: '4vw',
          borderTopWidth: 0,
          borderBottomWidth: 0,
          borderStyle: 'solid',
          height: '100vh',
          borderColor: this.isGameOver
            ? '#333'
            : this.gameState
              ? getFillColorForAssignment(this.gameState.currentTeam)
              : 'white',
        }}
      >
        {this.renderHeader()}
        <PageContainer>
          {this.gameState &&
            this.gameState.tiles.map((row, i) => {
              return (
                <Row key={i}>
                  {row.map((tile, j) => (
                    <Tile
                      onPress={() => this.selectTile(i, j)}
                      {...tile}
                      key={j}
                      viewerRole={this.role}
                    />
                  ))}
                </Row>
              )
            })}
        </PageContainer>
      </div>
    )
  }
}

export default App
