import { supabase } from '../lib/supabase.js'

const profileFields = 'id,username,xp,streak,photo_url'

export async function getFriends(userId) {
  const { data, error } = await supabase
    .from('friends')
    .select('id,user_id,friend_id,status,created_at')
    .eq('status', 'accepted')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getFriends', error)
    return []
  }

  const rows = data || []
  const friendIds = [...new Set(rows.map(row => (row.user_id === userId ? row.friend_id : row.user_id)).filter(Boolean))]
  if (!friendIds.length) return []

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select(profileFields)
    .in('id', friendIds)

  if (profilesError) {
    console.error('getFriends(profiles)', profilesError)
    return []
  }

  const map = Object.fromEntries((profiles || []).map(p => [p.id, p]))
  return rows.map(row => {
    const friendId = row.user_id === userId ? row.friend_id : row.user_id
    const profile = map[friendId]
    return profile ? { ...profile, friendship_id: row.id, relation: row } : null
  }).filter(Boolean)
}

export async function getPendingFriends(userId) {
  const { data, error } = await supabase
    .from('friends')
    .select('id,user_id,friend_id,status,created_at')
    .eq('friend_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getPendingFriends', error)
    return []
  }

  const rows = data || []
  const requesterIds = [...new Set(rows.map(row => row.user_id).filter(Boolean))]
  if (!requesterIds.length) return rows.map(row => ({ ...row, user: null }))

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select(profileFields)
    .in('id', requesterIds)

  if (profilesError) {
    console.error('getPendingFriends(profiles)', profilesError)
    return rows.map(row => ({ ...row, user: null }))
  }

  const map = Object.fromEntries((profiles || []).map(p => [p.id, p]))
  return rows.map(row => ({ ...row, user: map[row.user_id] || null }))
}

export async function sendFriendRequest(userId, friendId) {
  const existing = await getFriendStatus(userId, friendId)
  if (existing) return existing

  const { data, error } = await supabase
    .from('friends')
    .insert({ user_id: userId, friend_id: friendId, status: 'pending' })
    .select('id,user_id,friend_id,status,created_at')
    .single()

  if (error) {
    console.error('sendFriendRequest', error)
    throw error
  }

  return data
}

export async function respondFriendRequest(requestId, accept) {
  if (accept) {
    const { data, error } = await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('id', requestId)
      .select('id,user_id,friend_id,status,created_at')
      .single()

    if (error) {
      console.error('respondFriendRequest', error)
      throw error
    }

    return data
  }

  const { error } = await supabase
    .from('friends')
    .delete()
    .eq('id', requestId)

  if (error) {
    console.error('respondFriendRequest(delete)', error)
    throw error
  }

  return null
}

export async function removeFriend(userId, friendId) {
  const { error } = await supabase
    .from('friends')
    .delete()
    .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)

  if (error) {
    console.error('removeFriend', error)
    throw error
  }

  return true
}

export async function getFriendStatus(userId, otherId) {
  const { data, error } = await supabase
    .from('friends')
    .select('id,user_id,friend_id,status,created_at')
    .or(`and(user_id.eq.${userId},friend_id.eq.${otherId}),and(user_id.eq.${otherId},friend_id.eq.${userId})`)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error('getFriendStatus', error)
    return null
  }

  return data?.[0] || null
}
