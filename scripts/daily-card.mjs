import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const TODAY = new Date().toISOString().split('T')[0]
const YESTERDAY = new Date(Date.now() - 86400000).toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
})

// ─── Step 1: Check if today's card already exists ────────────────────────────

async function checkAlreadyGenerated() {
  const { data } = await supabase.from('daily_cards').select('date').eq('date', TODAY).single()
  return !!data
}

// ─── Step 2: Research with Claude Opus + web search ──────────────────────────

async function researchNews() {
  console.log('🔍 Researching yesterday\'s finance news with Claude...')

  const researchPrompt = `Today is ${TODAY}. Yesterday was ${YESTERDAY}.

Find the most important finance news that came out yesterday by cross-researching these websites:
https://www.reuters.com/markets/
https://www.bloomberg.com/markets
https://www.ft.com/markets
https://www.wsj.com/finance
https://www.theinformation.com/finance
https://www.lemonde.fr/en/economie/
https://www.barrons.com/topics/markets
https://www.semafor.com/vertical/business

Once you identify the most important story, produce the following:

1. A short summary written like a professional journalist covering when, what, where, why and how. End with one sentence of historical context.

2. A 3-question MCQ on key information from the summary. Each question has exactly 2 answer choices (one correct, one wrong). Make the questions difficult but fair: one about a number, one about a concept, one unique detail.

3. A card name — maximum 15 characters including spaces.

4. Three card elements (attacks):
   - Element I: Context — answers When? Who? Where? (title max 15 chars, explanation max 35 chars with key figures)
   - Element II: Why? — the reason behind the news (same limits)
   - Element III: Analysis — an interesting insight putting the news in context (same limits)

5. A power score between 80 and 180 (multiples of 10 only, e.g. 90, 130, 160) based on how significant the news is.

Output your entire response as a single JSON object (no markdown, no prose, just raw JSON):
{
  "card_name": "string max 15 chars",
  "news_summary": "string — full journalist summary",
  "mcq": [
    {"question": "...", "answers": ["option A", "option B"], "correct": 0},
    {"question": "...", "answers": ["option A", "option B"], "correct": 1},
    {"question": "...", "answers": ["option A", "option B"], "correct": 0}
  ],
  "attacks": [
    {"title": "string max 15 chars", "info": "string max 35 chars"},
    {"title": "string max 15 chars", "info": "string max 35 chars"},
    {"title": "string max 15 chars", "info": "string max 35 chars"}
  ],
  "power": 120,
  "image_description": "One paragraph describing the scene to paint for the card artwork — vivid, artistic, finance-themed."
}`

  let messages = [{ role: 'user', content: researchPrompt }]
  let finalText = ''

  for (let turn = 0; turn < 8; turn++) {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 8000,
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

async function saveToDatabase(cardData, imageUrl) {
  console.log('💾 Saving card to database...')

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
      tag_names: ['Daily Card'],
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
  console.log(`\n🃏 Finance Trading Cards — Daily Generator — ${TODAY}\n`)

  if (await checkAlreadyGenerated()) {
    console.log('⏭️  Daily card for today already exists. Skipping.')
    return
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
