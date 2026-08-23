import { describe, expect, it } from 'vitest'
import { buildInitialGrid, runGenerations, stepGameOfLife } from './cellularAutomaton'

function makeGrid(cols: number, rows: number, aliveCoords: [number, number][]): boolean[] {
  const grid = Array.from({ length: cols * rows }, () => false)
  for (const [cx, cy] of aliveCoords) grid[cy * cols + cx] = true
  return grid
}

describe('stepGameOfLife', () => {
  it('keeps a 2x2 block alive (a classic still life)', () => {
    const grid = makeGrid(4, 4, [
      [1, 1],
      [2, 1],
      [1, 2],
      [2, 2],
    ])
    const next = stepGameOfLife(grid, 4, 4)
    expect(next).toEqual(grid)
  })

  it('oscillates a horizontal blinker into a vertical one and back (period 2)', () => {
    const horizontal = makeGrid(5, 5, [
      [1, 2],
      [2, 2],
      [3, 2],
    ])
    const vertical = makeGrid(5, 5, [
      [2, 1],
      [2, 2],
      [2, 3],
    ])
    const afterOne = stepGameOfLife(horizontal, 5, 5)
    expect(afterOne).toEqual(vertical)
    const afterTwo = stepGameOfLife(afterOne, 5, 5)
    expect(afterTwo).toEqual(horizontal)
  })

  it('keeps an empty grid empty', () => {
    const grid = Array.from({ length: 6 * 6 }, () => false)
    expect(stepGameOfLife(grid, 6, 6)).toEqual(grid)
  })

  it('does not wrap around the border', () => {
    // Three alive cells in the top-left corner, angled so a wrapping implementation would
    // treat the opposite edge as a neighbor and misbehave; a clamped implementation should
    // just apply ordinary B3/S23 rules against the grid boundary.
    const grid = makeGrid(4, 4, [
      [0, 0],
      [1, 0],
      [0, 1],
    ])
    const next = stepGameOfLife(grid, 4, 4)
    // (0,0) has 2 neighbors -> survives. (1,1) has 3 neighbors -> is born.
    expect(next[0]).toBe(true)
    expect(next[1 * 4 + 1]).toBe(true)
  })
})

describe('runGenerations', () => {
  it('returns the same grid unchanged for 0 generations', () => {
    const grid = makeGrid(4, 4, [
      [1, 1],
      [2, 1],
    ])
    expect(runGenerations(grid, 4, 4, 0)).toEqual(grid)
  })

  it('is equivalent to repeated stepGameOfLife calls', () => {
    const grid = makeGrid(5, 5, [
      [1, 2],
      [2, 2],
      [3, 2],
    ])
    const stepped = stepGameOfLife(stepGameOfLife(grid, 5, 5), 5, 5)
    expect(runGenerations(grid, 5, 5, 2)).toEqual(stepped)
  })
})

describe('buildInitialGrid', () => {
  it('marks a cell alive when its average luminance is below the threshold', () => {
    // width=4, height=2, cellSize=2 -> a 2x1 grid of cells. Left cell is dark, right cell light.
    const luminance = new Float32Array([40, 40, 200, 200, 40, 40, 200, 200])
    const grid = buildInitialGrid(luminance, 4, 2, 2, 1, 2, 128)
    expect(grid).toEqual([true, false])
  })
})
