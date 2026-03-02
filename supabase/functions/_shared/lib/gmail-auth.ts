import { createSystemNotification } from '../notifications.ts'
import { getGoogleOAuthConfig } from './config.ts'

export type OAuthTokenRow = {
  id: string
  user_id: string
  gmail_email: string | null
  access_token: string | null
  refresh_token: string | null
  expires_at: string | null
  is_active?: boolean
}

export class GmailReconnectRequiredError extends Error {
  code = 'GMAIL_RECONNECT_REQUIRED' as const
}

export async function deactivateTokenAndNotify(
  supabase: any,
  tokenData: OAuthTokenRow,
  reason: string,
  stage: string,
) {
  await supabase
    .from('user_oauth_tokens')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tokenData.id)
    .eq('user_id', tokenData.user_id)

  await createSystemNotification({
    typeKey: 'gmail_reconnect_required',
    userId: tokenData.user_id,
    actionPath: '/settings',
    iconKey: 'mail',
    i18nParams: { email: tokenData.gmail_email || 'Gmail' },
    metadata: {
      gmailEmail: tokenData.gmail_email,
      reason,
      stage,
      tokenId: tokenData.id,
    },
    dedupeKey: `gmail-reconnect-required-${tokenData.user_id}-${tokenData.gmail_email || tokenData.id}`,
    dedupeWindowMinutes: 360,
    importance: 'high',
  })
}

export async function refreshAccessToken(
  supabase: any,
  tokenData: OAuthTokenRow,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!tokenData.refresh_token) {
    return { ok: false, reason: 'missing_refresh_token' }
  }

  const oauthConfig = getGoogleOAuthConfig()
  if (!oauthConfig.clientId || !oauthConfig.clientSecret) {
    return { ok: false, reason: 'missing_google_oauth_config' }
  }

  const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: oauthConfig.clientId,
      client_secret: oauthConfig.clientSecret,
      refresh_token: tokenData.refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  if (!refreshResponse.ok) {
    const reason = await refreshResponse.text()
    return { ok: false, reason: `refresh_failed:${reason}` }
  }

  const refreshData = await refreshResponse.json()
  const newExpiresAt = refreshData.expires_in
    ? new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
    : null

  await supabase
    .from('user_oauth_tokens')
    .update({
      access_token: refreshData.access_token,
      expires_at: newExpiresAt,
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tokenData.id)

  tokenData.access_token = refreshData.access_token
  tokenData.expires_at = newExpiresAt
  tokenData.is_active = true
  return { ok: true }
}

export async function ensureFreshAccessToken(
  supabase: any,
  tokenData: OAuthTokenRow,
  stage: string,
) {
  const now = new Date()
  const expiresAt = tokenData.expires_at ? new Date(tokenData.expires_at) : null

  if (!tokenData.access_token || (expiresAt && now >= expiresAt)) {
    const refreshed = await refreshAccessToken(supabase, tokenData)
    if (!refreshed.ok) {
      await deactivateTokenAndNotify(supabase, tokenData, refreshed.reason, stage)
      throw new GmailReconnectRequiredError('Gmail authentication expired. Reconnect your account.')
    }
  }
}

export async function fetchGmailWithRecovery(
  supabase: any,
  tokenData: OAuthTokenRow,
  input: string,
  init: RequestInit,
  stage: string,
) {
  await ensureFreshAccessToken(supabase, tokenData, `${stage}_preflight`)

  const headers = new Headers(init.headers || {})
  headers.set('Authorization', `Bearer ${tokenData.access_token}`)

  let response = await fetch(input, { ...init, headers })
  if (response.status !== 401) return response

  const refreshed = await refreshAccessToken(supabase, tokenData)
  if (!refreshed.ok) {
    await deactivateTokenAndNotify(supabase, tokenData, refreshed.reason, stage)
    throw new GmailReconnectRequiredError('Gmail authentication expired. Reconnect your account.')
  }

  headers.set('Authorization', `Bearer ${tokenData.access_token}`)
  response = await fetch(input, { ...init, headers })
  if (response.status === 401) {
    await deactivateTokenAndNotify(supabase, tokenData, 'unauthorized_after_refresh', stage)
    throw new GmailReconnectRequiredError('Gmail authentication expired. Reconnect your account.')
  }

  return response
}
