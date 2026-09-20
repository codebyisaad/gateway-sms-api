import { describe, expect, it } from 'vitest'
import { toggleDeviceSelection } from './device-selection'

const THREE = ['a', 'b', 'c']
const TWO = ['a', 'b']
const ONE = ['a']

describe('toggleDeviceSelection', () => {
  // The old dropdown treated the all-devices scope as "everything checked", so
  // the first click on a device removed it instead of narrowing to it.
  it('narrows to the clicked device from the all-devices scope', () => {
    expect(toggleDeviceSelection([], 'a', THREE)).toEqual(['a'])
  })

  it('clears the last selected device back to all devices', () => {
    expect(toggleDeviceSelection(['a'], 'a', THREE)).toEqual([])
  })

  it('collapses a full selection back to all devices', () => {
    expect(toggleDeviceSelection(['a'], 'b', TWO)).toEqual([])
  })

  it('adds to an existing selection', () => {
    expect(toggleDeviceSelection(['a'], 'b', THREE)).toEqual(['a', 'b'])
  })

  // The collapse used to fire here too, so the only device's row never changed.
  it('selects the only device instead of collapsing', () => {
    expect(toggleDeviceSelection([], 'a', ONE)).toEqual(['a'])
  })

  it('deselects the only device', () => {
    expect(toggleDeviceSelection(['a'], 'a', ONE)).toEqual([])
  })

  it('orders by the device list, not by click order', () => {
    expect(toggleDeviceSelection(['c'], 'a', THREE)).toEqual(['a', 'c'])
  })

  it('drops ids that are no longer registered', () => {
    expect(toggleDeviceSelection(['gone'], 'a', TWO)).toEqual(['a'])
  })

  it('does not mutate the selection it was given', () => {
    const selected = ['a']
    toggleDeviceSelection(selected, 'b', THREE)
    expect(selected).toEqual(['a'])
  })
})
