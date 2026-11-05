const POLAR_CUSTOMER_PORTAL_REQUEST_BASE =
  'https://polar.sh/gateway-sms-api/portal/request'

export function polarCustomerPortalRequestUrl(
  email?: string | null
): string {
  const trimmed = email?.trim()
  if (!trimmed) return POLAR_CUSTOMER_PORTAL_REQUEST_BASE
  return `${POLAR_CUSTOMER_PORTAL_REQUEST_BASE}?email=${encodeURIComponent(trimmed)}`
}

const SMS_PERMISSION_GUIDE = '#'

export function smsPermissionGuideUrl(source: string): string {
  return `${SMS_PERMISSION_GUIDE}?utm_source=${source}&utm_medium=app&utm_campaign=sms_permission`
}

export const ExternalLinks = {
  github: 'https://github.com/codebyisaad/gateway-sms-api',
  discord: '#',
  polar: '#',
  twitter: '#',
  linkedin: '#',
}
