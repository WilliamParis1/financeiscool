export const CARD_POSTS_TABLE = 'card_posts'

export const CARD_POSTS_MISSING_MESSAGE =
  'The homepage posts table has not been created in Supabase yet. Run the card_posts migration in the Supabase SQL Editor, then refresh this page.'

export function isMissingCardPostsTable(error) {
  if (!error) return false

  const message = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`.toLowerCase()
  return message.includes('card_posts') && (
    message.includes('schema cache') ||
    message.includes('could not find the table') ||
    message.includes('does not exist')
  )
}
