import { appVersionMetadata } from './app-version-metadata'

describe('appVersionMetadata', () => {
  it('prefers the heartbeat version over the registration version', () => {
    const metadata = appVersionMetadata(
      {
        appVersionCode: 17,
        appVersionName: '2.7.0',
        appVersionInfo: { versionCode: 18, versionName: '2.8.0' },
      },
      'textbee-android/2.8.0',
    )

    expect(metadata).toEqual({
      appVersionCode: 18,
      appVersionName: '2.8.0',
      client: 'textbee-android/2.8.0',
    })
  })

  it('falls back to the registration version and omits an absent client', () => {
    const metadata = appVersionMetadata({
      appVersionCode: 14,
      appVersionName: '2.4.1',
    })

    expect(metadata).toEqual({ appVersionCode: 14, appVersionName: '2.4.1' })
  })

  it('returns nothing for a device that never reported a version', () => {
    expect(appVersionMetadata({}, '   ')).toEqual({})
    expect(appVersionMetadata(null)).toEqual({})
  })

  it('caps the client header at 64 characters', () => {
    const metadata = appVersionMetadata({}, `  ${'x'.repeat(200)}  `)

    expect(metadata.client).toHaveLength(64)
  })
})
