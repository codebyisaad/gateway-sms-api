// The app build behind a message, kept on the message for debugging.

type VersionedDevice = {
  appVersionCode?: number
  appVersionName?: string
  appVersionInfo?: {
    versionCode?: number
    versionName?: string
  }
}

export type AppVersionMetadata = {
  appVersionCode?: number
  appVersionName?: string
  client?: string
  appVersionAt?: Date
}

const MAX_CLIENT_LENGTH = 64

/**
 * The version code and name come from the device, which reports them on every
 * heartbeat, so they can lag by one heartbeat after an app update. The client
 * header is exact for this request, and only builds from 2.8.0 send it.
 * appVersionAt dates the values, since a later write to the message can move
 * updatedAt past them.
 */
export function appVersionMetadata(
  device: VersionedDevice | null | undefined,
  sdkClient?: string,
  now: Date = new Date(),
): AppVersionMetadata {
  const metadata: AppVersionMetadata = {}

  const versionCode =
    device?.appVersionInfo?.versionCode ?? device?.appVersionCode
  if (typeof versionCode === 'number') {
    metadata.appVersionCode = versionCode
  }

  const versionName =
    device?.appVersionInfo?.versionName ?? device?.appVersionName
  if (versionName) {
    metadata.appVersionName = versionName
  }

  const client = sdkClient?.trim().slice(0, MAX_CLIENT_LENGTH)
  if (client) {
    metadata.client = client
  }

  // Nothing to date when the device never reported a version and sent no header
  if (Object.keys(metadata).length > 0) {
    metadata.appVersionAt = now
  }

  return metadata
}
