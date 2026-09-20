import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DeviceFilter from './device-filter'
import type { Device } from '@/lib/api'

const device = (over: Partial<Device>): Device =>
  ({ _id: 'device_1', brand: 'Google', model: 'Pixel 8', enabled: true, ...over }) as Device

const PIXEL = device({})
const GALAXY = device({ _id: 'device_2', brand: 'Samsung', model: 'Galaxy S23' })
const REDMI = device({ _id: 'device_3', brand: 'Xiaomi', model: 'Redmi Note 12' })

// Radix checks pointer-events before dispatching, which jsdom does not compute.
const user = userEvent.setup({ pointerEventsCheck: 0 })

const openPanel = async () => {
  await user.click(screen.getByRole('button', { name: /^Devices:/ }))
}

describe('DeviceFilter', () => {
  it('reads as all devices and renders every row unselected when empty', async () => {
    render(<DeviceFilter devices={[PIXEL, GALAXY]} value={[]} onChange={vi.fn()} />)

    expect(
      screen.getByRole('button', { name: 'Devices: all devices' })
    ).toHaveTextContent('All devices')

    await openPanel()
    expect(screen.getByRole('option', { name: /Google Pixel 8/ })).toHaveTextContent(
      'not selected'
    )
    expect(screen.getByRole('option', { name: /Samsung Galaxy S23/ })).toHaveTextContent(
      'not selected'
    )
  })

  // The old dropdown opened with everything checked, so this click removed the
  // device instead of narrowing to it.
  it('narrows to the clicked device rather than excluding it', async () => {
    const onChange = vi.fn()
    render(
      <DeviceFilter devices={[PIXEL, GALAXY, REDMI]} value={[]} onChange={onChange} />
    )

    await openPanel()
    await user.click(screen.getByRole('option', { name: /Google Pixel 8/ }))

    expect(onChange).toHaveBeenCalledWith(['device_1'])
  })

  it('stays open across toggles', async () => {
    const onChange = vi.fn()
    render(
      <DeviceFilter devices={[PIXEL, GALAXY, REDMI]} value={[]} onChange={onChange} />
    )

    await openPanel()
    await user.click(screen.getByRole('option', { name: /Google Pixel 8/ }))

    // The old dropdown dismissed here, so the second row was gone.
    expect(screen.getByRole('option', { name: /Samsung Galaxy S23/ })).toBeVisible()
    await user.click(screen.getByRole('option', { name: /Samsung Galaxy S23/ }))
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  // With one device the old toggle collapsed straight back to the all-devices
  // sentinel, so the row never responded.
  it('selects the only device on an account with one device', async () => {
    const onChange = vi.fn()
    render(<DeviceFilter devices={[PIXEL]} value={[]} onChange={onChange} />)

    await openPanel()
    await user.click(screen.getByRole('option', { name: /Google Pixel 8/ }))

    expect(onChange).toHaveBeenCalledWith(['device_1'])
  })

  it('shows the checked state for a selected device', async () => {
    render(
      <DeviceFilter devices={[PIXEL, GALAXY]} value={['device_1']} onChange={vi.fn()} />
    )

    await openPanel()
    const pixel = screen.getByRole('option', { name: /Google Pixel 8/ })
    expect(pixel).toHaveTextContent('selected')
    expect(pixel).not.toHaveTextContent('not selected')
    expect(screen.getByRole('option', { name: /Samsung Galaxy S23/ })).toHaveTextContent(
      'not selected'
    )
  })

  it('names one and two selections, then counts', () => {
    const { rerender } = render(
      <DeviceFilter devices={[PIXEL, GALAXY, REDMI]} value={['device_1']} onChange={vi.fn()} />
    )
    expect(
      screen.getByRole('button', { name: 'Devices: Google Pixel 8' })
    ).toBeInTheDocument()

    rerender(
      <DeviceFilter
        devices={[PIXEL, GALAXY, REDMI]}
        value={['device_1', 'device_2']}
        onChange={vi.fn()}
      />
    )
    expect(
      screen.getByRole('button', {
        name: 'Devices: Google Pixel 8, Samsung Galaxy S23',
      })
    ).toBeInTheDocument()

    rerender(
      <DeviceFilter
        devices={[PIXEL, GALAXY, REDMI]}
        value={['device_1', 'device_2', 'device_3']}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /^Devices:/ })).toHaveTextContent(
      '3 devices'
    )
  })

  // A link can name a device that was since removed. Borrowing another
  // device's name for it is worse than showing a count.
  it('counts an unregistered id instead of naming another device', () => {
    render(<DeviceFilter devices={[PIXEL, GALAXY]} value={['gone']} onChange={vi.fn()} />)

    const trigger = screen.getByRole('button', { name: 'Devices: 1 selected' })
    expect(trigger).not.toHaveTextContent('Google Pixel 8')
    expect(trigger).toHaveTextContent('1 devices')
  })

  it('offers Clear only while a selection is active', async () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <DeviceFilter devices={[PIXEL, GALAXY]} value={[]} onChange={onChange} />
    )

    await openPanel()
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument()

    rerender(
      <DeviceFilter devices={[PIXEL, GALAXY]} value={['device_1']} onChange={onChange} />
    )
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('narrows the rows as the search is typed', async () => {
    render(<DeviceFilter devices={[PIXEL, GALAXY, REDMI]} value={[]} onChange={vi.fn()} />)

    await openPanel()
    await user.type(screen.getByPlaceholderText('Search devices'), 'galaxy')

    expect(screen.getByRole('option', { name: /Samsung Galaxy S23/ })).toBeVisible()
    expect(screen.queryByRole('option', { name: /Google Pixel 8/ })).not.toBeInTheDocument()
  })

  it('labels a disabled device', async () => {
    render(
      <DeviceFilter
        devices={[PIXEL, device({ _id: 'device_4', model: 'Pixel 6', enabled: false })]}
        value={[]}
        onChange={vi.fn()}
      />
    )

    await openPanel()
    expect(screen.getByRole('option', { name: /Pixel 6/ })).toHaveTextContent('disabled')
  })
})
