import { supabase } from '../lib/supabase.js'

export async function getCustomWords(userId, lang) {
  const { data, error } = await supabase
    .from('custom_words')
    .select('*')
    .eq('level', lang)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getCustomWords', error)
    return []
  }

  return data || []
}

export async function addCustomWord(userId, lang, word, translation, phonetic = '', example = '') {
  const payload = {
    word,
    translation,
    phonetic: phonetic || null,
    example: example || null,
    level: lang,
    image_url: null,
    is_active: true,
  }

  const { data, error } = await supabase
    .from('custom_words')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    console.error('addCustomWord', error)
    throw error
  }

  return data
}

export async function deleteCustomWord(id) {
  const { error } = await supabase
    .from('custom_words')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('deleteCustomWord', error)
    throw error
  }

  return true
}
