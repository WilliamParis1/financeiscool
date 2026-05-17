import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { realtime: { transport: ws } }
)

const TODAY = new Date().toISOString().split('T')[0]
const YESTERDAY = new Date(Date.now() - 86400000).toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
})

// ─── Step 1: Check / clear today's card ──────────────────────────────────────

async function checkAlreadyGenerated() {
  const { data } = await supabase.from('daily_cards').select('date').eq('date', TODAY).single()
  return !!data
}

async function deleteTodayCard() {
  const { data: daily } = await supabase.from('daily_cards').select('card_id').eq('date', TODAY).single()
  if (!daily) return
  await supabase.from('daily_cards').delete().eq('date', TODAY)
  await supabase.from('cards').delete().eq('id', daily.card_id)
  console.log('🗑️  Deleted existing card for today.')
}

// ─── Step 2: Research with Claude Sonnet + web search ────────────────────────

async function researchNews() {
  console.log('🔍 Researching yesterday\'s finance news with Claude...')

  const researchPrompt = `Yesterday was ${YESTERDAY}. Search Reuters, Bloomberg, FT, or WSJ for ONE discrete, memorable event from yesterday — something specific that happened on that day (e.g. election won, minister appointed, law passed, sanctions imposed, rate decision made, company acquired, war escalation, discovery announced). Reject vague trends, market moves, or anything that "has been happening" rather than "happened yesterday". Output ONLY this JSON (no markdown):
{"card_name":"≤15 chars","news_summary":"3-4 sentence journalist summary with historical context","mcq":[{"question":"...","answers":["A","B"],"correct":0},{"question":"...","answers":["A","B"],"correct":1},{"question":"...","answers":["A","B"],"correct":0}],"attacks":[{"title":"≤15 chars","info":"≤35 chars"},{"title":"≤15 chars","info":"≤35 chars"},{"title":"≤15 chars","info":"≤35 chars"}],"power":120,"image_description":"vivid one-paragraph card artwork scene"}

MCQ rules: 3 questions, 2 choices each, one about a number, one conceptual, one specific detail. Power: 80-180 in multiples of 10.`

  let messages = [{ role: 'user', content: researchPrompt }]
  let finalText = ''

  for (let turn = 0; turn < 5; turn++) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages,
    })

    const textBlocks = response.content.filter(b => b.type === 'text')
    if (textBlocks.length > 0) finalText = textBlocks.map(b => b.text).join('\n')

    if (response.stop_reason === 'end_turn') break

    if (response.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: response.content })
      const toolResults = response.content
        .filter(b => b.type === 'tool_use')
        .map(b => ({ type: 'tool_result', tool_use_id: b.id, content: '' }))
      messages.push({ role: 'user', content: toolResults })
    }
  }

  // Extract JSON
  const jsonMatch = finalText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Claude did not return valid JSON')
  return JSON.parse(jsonMatch[0])
}

// ─── Step 3: Generate card image with GPT-4o ─────────────────────────────────

async function generateCardImage(cardData) {
  console.log('🎨 Generating card image with GPT-4o...')

  const templateBase64 = fs.readFileSync(path.join(__dirname, '..', 'public', 'cardtemplate.png')).toString('base64')
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const imagePrompt = `Using the provided card template image as a layout guide, generate a complete Finance Trading Card.

Follow the numbered sections exactly as shown in the template:
1. Top-left circle — a small thematic symbol or icon representing the news
2. Name bar (top center) — write exactly: "${cardData.card_name}"
3. Top-right circle — write the number: ${cardData.power}
4. Artwork area (large middle section) — ${cardData.image_description}. Style: choose between realistic, contemporary, or fantastic — whichever fits the story best. The artwork should be dramatic and spill visually beyond the artwork zone into the card border.
5. Information box (bottom) — three attacks with Greek numerals on separate lines:
   Ⅰ ${cardData.attacks[0].title}: ${cardData.attacks[0].info}
   Ⅱ ${cardData.attacks[1].title}: ${cardData.attacks[1].info}
   Ⅲ ${cardData.attacks[2].title}: ${cardData.attacks[2].info}

At the very bottom of the card add the date "${dateStr}" and signature "WL" seamlessly integrated.

Color scheme: choose a color palette that fits the news theme and mood.
Card dimensions ratio: 11:17 (portrait, like a playing card).
The card should look premium, collectible, and artistic.`

  const response = await openai.responses.create({
    model: 'gpt-4o',
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_image',
            image_url: `data:image/png;base64,${templateBase64}`,
          },
          {
            type: 'input_text',
            text: imagePrompt,
          },
        ],
      },
    ],
    tools: [{ type: 'image_generation', quality: 'high', size: '1024x1536' }],
  })

  const imageBlock = response.output.find(o => o.type === 'image_generation_call')
  if (!imageBlock) throw new Error('GPT-4o did not generate an image')

  return Buffer.from(imageBlock.result, 'base64')
}

// ─── Step 4: Upload image to Supabase Storage ─────────────────────────────────

async function uploadImage(imageBuffer) {
  console.log('📤 Uploading image to Supabase...')

  const fileName = `daily-${TODAY}.png`
  const { error } = await supabase.storage
    .from('card-images')
    .upload(fileName, imageBuffer, { contentType: 'image/png', upsert: true })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage.from('card-images').getPublicUrl(fileName)
  return publicUrl
}

// ─── Step 5: Save card + daily_card to Supabase ───────────────────────────────

function monthTag() {
  const d = new Date()
  const month = d.toLocaleString('en-US', { month: 'long' })
  return `News ${month} ${d.getFullYear()}`
}

async function ensureTag(name) {
  await supabase.from('card_tags').upsert({ name, color: '#3b82f6' }, { onConflict: 'name', ignoreDuplicates: true })
}

async function saveToDatabase(cardData, imageUrl) {
  console.log('💾 Saving card to database...')

  const tag = monthTag()
  await ensureTag(tag)

  const power = cardData.power
  const rarity = power >= 150 ? 'legendary' : power >= 110 ? 'rare' : 'common'

  const { data: card, error: cardError } = await supabase
    .from('cards')
    .insert({
      name: cardData.card_name,
      description: cardData.news_summary,
      image_url: imageUrl,
      rarity,
      rarity_weight: 0,
      tag_names: [tag],
      card_dates: [TODAY],
    })
    .select()
    .single()

  if (cardError) throw cardError

  const { error: dailyError } = await supabase.from('daily_cards').insert({
    date: TODAY,
    card_id: card.id,
    news_summary: cardData.news_summary,
    mcq: cardData.mcq,
  })

  if (dailyError) throw dailyError

  console.log(`✅ Daily card created: "${cardData.card_name}" (${rarity}, power ${power})`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const force = process.env.FORCE === 'true'
  console.log(`\n🃏 Finance Trading Cards — Daily Generator — ${TODAY}${force ? ' [FORCE]' : ''}\n`)

  if (await checkAlreadyGenerated()) {
    if (!force) {
      console.log('⏭️  Daily card for today already exists. Skipping.')
      return
    }
    await deleteTodayCard()
  }

  const cardData = await researchNews()
  console.log(`📰 Card: "${cardData.card_name}" (power ${cardData.power})`)

  const imageBuffer = await generateCardImage(cardData)
  const imageUrl = await uploadImage(imageBuffer)
  await saveToDatabase(cardData, imageUrl)

  console.log('\n🎉 Done! Today\'s daily card is live.\n')
}

main().catch(err => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
