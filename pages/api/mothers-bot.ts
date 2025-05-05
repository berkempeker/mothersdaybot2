import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Define the structure of the incoming request
interface BotInput {
    favoriteColor: string;
    favActivity: string;
    funOrSent: string;
    name: string;
    url: string;
}

// Allowed Origins
const ALLOWED_ORIGINS = [
    'https://www.storyly.io'
];

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
});

// Validate input data
function validateInput(data: unknown): data is BotInput {
    if (!data || typeof data !== 'object') return false;

    const input = data as Record<string, unknown>;

    return (
        typeof input.favoriteColor === 'string' &&
        typeof input.favActivity === 'string' &&
        typeof input.funOrSent === 'string' &&
        typeof input.name === 'string' &&
        typeof input.url === 'string'
    );
}

// Function to check for profanity
function containsProfanity(text: string): boolean {
    const profanityList = ['fuck', 'dick'];
    return profanityList.some(word => text.toLowerCase().includes(word.toLowerCase()));
}

// Function to generate gift idea using OpenAI
async function generateGiftIdea(data: BotInput): Promise<string> {
    try {
        // Check for profanity in inputs
        const inputText = Object.values(data).join(' ');
        if (containsProfanity(inputText)) {
            return "I apologize, but I cannot process requests containing inappropriate language.";
        }

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are a thoughtful gift recommender helping people find the perfect Mother's Day gift based on someone's unique personality and preferences. Your goal is to suggest one meaningful or delightful gift idea, based on the inputs, that feels tailor-made.`
                },
                {
                    role: 'user',
                    content: `Preferences:
                    Color: ${data.favoriteColor}
                    Favorite Activity: ${data.favActivity}
                    Fun or Sentimental : ${data.funOrSent}
                    Name: ${data.name}
                    URL: ${data.url}

                    Rules:
                    1. Start with: "For Mother's Day, ${data.name} deserves something truly special. Here's what I suggest:"
                    2. Give one specific gift idea.
                    3. Keep it short—maximum 3 sentences.
                    4. If a product is available at ${data.url}, use it. If not, suggest a relevant gift category. You may include a product URL.
                    5. Stay focused on the gift idea—avoid general gifting tips or advice.
                    6. If ${data.funOrSent} is "Fun", suggest a lighthearted or playful gift. If not, suggest a heartfelt or sentimental one.
                    7. Avoid overly generic gifts unless they are presented with a unique twist or heartfelt personalization.
                    8. End the suggestion with a gentle and warm sentence that makes the giver feel confident and inspired.`
                }
            ],
            temperature: 0.7,
        });

        const giftIdea = response.choices[0].message.content;
        if (!giftIdea) throw new Error("Oh no! We couldn't find the perfect gift this time—but your love already says so much. Want to give it another shot?");

        return giftIdea;
    } catch (error) {
        console.error('Gift idea generation error:', error);
        throw new Error("Oops! Looks like our gift-sprinkling magic took a little nap. Mind trying again?");
    }
}

// CORS headers helper function
function getCorsHeaders(origin: string) {
    // Check if the origin is in our allowed list
    const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);
    
    // Use the actual origin if it's allowed, otherwise use the first allowed origin as fallback
    const allowOrigin = isAllowedOrigin ? origin : '';
    
    return {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400', // 24 hours cache for preflight requests
    };
}

// CORS Handling for Preflight Requests
export async function OPTIONS(req: Request) {
    const origin = req.headers.get('origin') || '';
    
    // If origin isn't in allowed list, return 204 with restricted CORS headers
    if (!ALLOWED_ORIGINS.includes(origin)) {
        return new NextResponse(null, {
            status: 204,
            headers: getCorsHeaders(origin),
        });
    }
    
    // For allowed origins, return 200 with proper CORS headers
    return new NextResponse(null, {
        status: 200,
        headers: getCorsHeaders(origin),
    });
}

// Main API route handler
export async function POST(req: Request) {
    const origin = req.headers.get('origin') || '';
    
    // If origin isn't allowed, return 403
    if (!ALLOWED_ORIGINS.includes(origin)) {
        return NextResponse.json(
            { error: 'Origin not allowed' },
            {
                status: 403,
                headers: getCorsHeaders(origin),
            }
        );
    }

    try {
        const data = await req.json();

        if (!validateInput(data)) {
            return NextResponse.json(
                { error: 'Invalid input data' },
                {
                    status: 400,
                    headers: getCorsHeaders(origin),
                }
            );
        }

        const giftIdea = await generateGiftIdea(data);

        return NextResponse.json(
            { giftIdea },
            {
                status: 200,
                headers: getCorsHeaders(origin),
            }
        );

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            {
                error: 'Request processing failed',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            {
                status: 500,
                headers: getCorsHeaders(origin),
            }
        );
    }
}