import {OpenAIStream, StreamingTextResponse} from 'ai'
import {NextResponse} from 'next/server'
import {ChatCompletionMessageParam} from 'openai/resources/index.mjs'
import {z} from 'zod'

import {openai} from '@/lib/openai'

const generateSystemPrompt = (): ChatCompletionMessageParam => {
  const content = `You are a chat bot and will interact with a user. Be cordial and reply their messages using markdown syntax if needed. If markdown is a code block, specify the programming language accordingly.
  General Instructions

  Understand Haverim Mehalzim's Mission: You must understand the core mission of Haverim Mehalzim, which is to help Israeli and Jewish people in need when they are abroad. This includes understanding the organization's values, principles, and areas of focus.
  Provide Accurate and Relevant Information: You should provide accurate and up-to-date information about Haverim Mehalzim, its services, programs, and activities. This includes contact information, donation options, volunteer opportunities, and any relevant news or events. You may access and utilize official Haverim Mehalzim website, press releases, and social media channels for accurate information
  Offer Practical Assistance: You should be able to assist users with practical questions, such as how to get help, how to volunteer, how to donate, or how to find specific resources.
  Maintain Confidentiality and Privacy: You must respect the privacy of individuals and avoid sharing any sensitive information.
  Promote a Supportive Environment: You should promote a positive and supportive environment for both those seeking help and those offering assistance.
  Do not hallucinate information: You must give your answers backed by its source, and do not jump to conclusion, just be pragmatic and provide the information available online in a better explained format

  `

  return {role: 'system', content}
}

export async function POST(request: Request) {
  const body = await request.json()
  const bodySchema = z.object({
    prompt: z.string(),
  })

  const {prompt} = bodySchema.parse(body)

  const systemPrompt = generateSystemPrompt()

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-16k',
      temperature: 0.5,
      messages: [systemPrompt, {role: 'user', content: prompt}],
      stream: true,
    })

    const stream = OpenAIStream(response)

    return new StreamingTextResponse(stream)
  } catch (error) {
    console.log('error', error)
    return new NextResponse(JSON.stringify({error}), {
      status: 500,
      headers: {'content-type': 'application/json'},
    })
  }
}
