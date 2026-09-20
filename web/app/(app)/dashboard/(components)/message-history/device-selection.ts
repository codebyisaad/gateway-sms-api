// Empty means every device, including ones registered after the filter was set,
// so the collapse back to empty below is about scope, not tidiness.
export function toggleDeviceSelection(
  selected: string[],
  deviceId: string,
  allIds: string[]
): string[] {
  const set = new Set(selected)
  if (set.has(deviceId)) set.delete(deviceId)
  else set.add(deviceId)

  // Device-list order, so the label and the URL never depend on click order.
  // Ids missing from the list (a stale link) drop out here.
  const next = allIds.filter((id) => set.has(id))

  // Picking every device is the same scope as all devices. With a single device
  // that collapse would make the only row's click a no-op, so skip it.
  return allIds.length > 1 && next.length === allIds.length ? [] : next
}
