import words from './words'
import * as icepick from 'icepick'

export interface Tile {
  readonly word: string
  readonly assignment: 'red' | 'blue' | 'assassin' | 'neutral'
  readonly guess: 'red' | 'blue' | null
}

export interface GameState {
  readonly currentTeam: 'red' | 'blue'
  readonly remainingWords: string[]
  readonly tiles: Tile[][]
}

export function newGameState(previousGameState?: GameState): GameState {
  const firstTeam = Math.random() > 0.5 ? 'red' : 'blue'

  const [chosenWords, remainingWords] = splitWordsRandomly(
    previousGameState ? previousGameState.remainingWords : words,
    25,
  )

  const [redWords, blueAndOtherWords] = splitWordsRandomly(
    chosenWords,
    firstTeam === 'red' ? 9 : 8,
  )
  const [blueWords, otherWords] = splitWordsRandomly(
    blueAndOtherWords,
    firstTeam === 'blue' ? 9 : 8,
  )
  const neutralWords = splitWordsRandomly(otherWords, 1)[1]

  const tiles: GameState['tiles'] = [
    chosenWords.slice(0, 5),
    chosenWords.slice(5, 10),
    chosenWords.slice(10, 15),
    chosenWords.slice(15, 20),
    chosenWords.slice(20),
  ].map(rows =>
    rows.map(word => {
      const assignment = redWords.includes(word)
        ? 'red'
        : blueWords.includes(word)
          ? 'blue'
          : neutralWords.includes(word) ? 'neutral' : 'assassin'
      return {
        word,
        assignment,
        guess: null,
      } as Tile
    }),
  )

  return {
    currentTeam: firstTeam,
    remainingWords,
    tiles,
  }
}

function splitWordsRandomly(
  allWords: string[],
  n: number,
): [string[], string[]] {
  if (n > allWords.length) {
    throw new Error('bad news')
  }
  const chosen = []
  const remaining = allWords.slice(0)

  for (let i = 0; i < n; i++) {
    const randomIndex = Math.floor(Math.random() * remaining.length)
    chosen.push(remaining.splice(randomIndex, 1)[0])
  }

  return [chosen, remaining]
}

export function tileSelected(
  gameState: GameState,
  row: number,
  column: number,
): GameState {
  const tile = icepick.getIn(gameState, ['tiles', row, column])

  const result = icepick.setIn(
    gameState,
    ['tiles', row, column, 'guess'],
    gameState.currentTeam,
  )

  if (tile.assignment !== gameState.currentTeam) {
    return turnEnded(result)
  } else {
    return result
  }
}

export function turnEnded(gameState: GameState) {
  return icepick.set(
    gameState,
    'currentTeam',
    gameState.currentTeam === 'red' ? 'blue' : 'red',
  )
}
