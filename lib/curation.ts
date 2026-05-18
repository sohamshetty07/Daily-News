import * as cheerio from 'cheerio';
import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { logError } from './logger';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SOURCES = {
  'Business & National News': [
    'https://www.business-standard.com/latest-news',
    'https://timesofindia.indiatimes.com/india',
    'https://brandequity.economictimes.indiatimes.com/news',
    'https://economictimes.indiatimes.com/industry/media/entertainment',
    'https://economictimes.indiatimes.com/industry',
    'https://www.livemint.com/companies',
    'https://www.business-standard.com/companies',
    'https://timesofindia.indiatimes.com/business'
  ],
  'International News': [
    'https://www.campaignasia.com/',
    'https://www.bbc.com/news/world',
    'https://timesofindia.indiatimes.com/world',
    'https://www.livemint.com/news/world',
    'https://variety.com/',
    'https://techcrunch.com/'
  ],
  'Account/People Movement': [
    'https://www.exchange4media.com/people-movement-news.html',
    'https://www.afaqs.com/tags/people-movement',
    'https://www.afaqs.com/people-spotting',
    'https://brandequity.economictimes.indiatimes.com/tag/people+movement',
    'https://www.medianews4u.com/category/people/',
    'https://adage.com/agency-news'
  ],
  'Interesting Read': [
    'https://www.campaignindia.in/opinion',
    'https://www.campaignindia.in/the-work'
  ],
  'Economic Update/Sector': [
    'https://www.financialexpress.com/industry/',
    'https://www.moneycontrol.com/news/business/',
    'https://www.cnbctv18.com/business/',
    'https://economictimes.indiatimes.com/industry/cons-products/fmcg',
    'https://economictimes.indiatimes.com/industry/auto'
  ],
  'Home Pages': [
    'https://bestmediainfo.com/',
    'https://indiantelevision.com/',
    'https://www.afaqs.com/',
    'https://www.exchange4media.com/',
    'https://www.medianews4u.com/',
    'https://www.campaignindia.in/',
    'https://www.livemint.com/',
    'https://www.business-standard.com/'
  ]
};

const DB_PATH = path.join(process.cwd(), 'data', 'articles.json');

async function fetchAndExtract(url: string, categoryGoal: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      next: { revalidate: 3600 }
    });
    if (!response.ok) return [];
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const articles: { title: string; url: string; time: string; sourceUrl: string }[] = [];
    
    $('a').each((i, el) => {
      const title = $(el).text().trim().replace(/\\s+/g, ' ');
      let href = $(el).attr('href') || '';
      
      if (!href.startsWith('http')) {
        try {
          const urlObj = new URL(url);
          href = new URL(href, urlObj.origin).href;
        } catch(e) {
          return;
        }
      }
      
      if (title.length > 20 && href.length > 10 && !href.includes('javascript:')) {
        const timeEl = $(el).closest('div, li, article').find('time');
        let timeStr = timeEl.text().trim() || timeEl.attr('datetime') || '';
        
        if (!timeStr) {
          const timeRegex = /\\b(\\d{1,2}\\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\s+\\d{4}|\\d{1,2}\\s+(?:hours?|hrs?|mins?|minutes?)\\s+ago|\\d{4}-\\d{2}-\\d{2})\\b/i;
          const parentText = $(el).closest('div, li, article').text().replace(/\\s+/g, ' ');
          const match = parentText.match(timeRegex);
          if (match) timeStr = match[0];
        }

        articles.push({ title, url: href, time: timeStr, sourceUrl: url });
      }
    });
    
    const seen = new Set();
    const unique = [];
    for (const a of articles) {
      if (!seen.has(a.url)) {
        seen.add(a.url);
        unique.push(a);
      }
    }
    
    return unique.slice(0, 25);
  } catch (error) {
    logError(`fetchAndExtract for URL: ${url}`, error);
    return [];
  }
}

export async function runCurationCycle() {
  try {
    const allArticles: any[] = [];
    
    const promises = [];
    for (const [category, urls] of Object.entries(SOURCES)) {
      for (const url of urls) {
        promises.push(fetchAndExtract(url, category));
      }
    }
    
    const results = await Promise.all(promises);
    for (const res of results) {
       allArticles.push(...res);
    }
    
    const promptText = allArticles.map((a, i) => `[${i}] Title: ${a.title}\nURL: ${a.url}\nTime Info: ${a.time}`).join('\n\n');

    // Get current date boundaries 9am to 9am
    const now = new Date();
    // For prompting, we can just give today's date as context.
    const dateContext = `Current Date/Time Context: ${now.toISOString()}.`;

    const prompt = `
    ${dateContext}
    Here is a scraped list of news articles with their titles, URLs, and time information.
    
    Your task:
    1. Evaluate EVERY article provided in the list. Do NOT just summarize.
    2. Filter out any article that is explicitly older than 24 hours. (Consider 'within the last 24 hours' as valid). If no time info is present, ASSUME IT IS RECENT AND KEEP IT unless clearly outdated.
    3. Deduplicate stories that cover the exact same event. Keep only the best/most descriptive source link. Highly prioritize articles from reputable, authoritative sources or those displaying strong engagement signals (such as detailed, substantive titles and rich URLs).
    4. Categorise the remaining unique, recent news into exactly one of these SIX segments based on its business impact:
       - 'National News': Macro policy, TRAI regulations, infrastructure shifts.
       - 'Business Know How': Clients announcements, brand launches, industry updates, Media trends, advertising shifts, and CTV updates. Focus on sectors of importance.
       - 'International News': Global streaming, ad-tech shifts abroad, try and capture news of relevance to India (global account movements, new tech).
       - 'Account/People Movement': CMO changes, agency account wins, executive hires, resignations. (CRITICAL: Be liberal in assigning any leadership/HR/personnel changes here)
       - 'Interesting Read': Deep consumer insights, long-form essays, Consumer Surveys, analysis of any kind, detailed articles. Strictly no regular news items, informative pieces only.
       - 'Economic Update/Sector': FMCG, Auto, Telecom financial health, rural demand metrics.
    
    IMPORTANT: Discard generic site links (like "Privacy Policy", "Contact Us") or non-news articles. Return the EXHAUSTIVE list of all valid articles. Do not stop at a small number. Include all uniquely valid items.
    
    Return the result as a JSON array of objects, where each object has 'title', 'url', and 'category'.
    
    Articles Data (Truncated if required):
    ${promptText.substring(0, 50000)}
    `;

    let response;
    let attempt = 0;
    const maxRetries = 5;
    let delay = 5000;

    while (attempt < maxRetries) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "The headline of the article" },
                  url: { type: Type.STRING, description: "The URL of the article" },
                  category: { 
                    type: Type.STRING, 
                    description: "The assigned category from the 6 specific segments" 
                  }
                },
                required: ["title", "url", "category"]
              }
            }
          }
        });
        break; // Success, exit loop
      } catch (aiError: any) {
        attempt++;
        logError(`Gemini API call attempt ${attempt} failed`, aiError);
        
        // If it's a 503 or 429 and we haven't maxed out, wait and retry
        if (attempt < maxRetries && (aiError?.status === 503 || aiError?.status === 429 || aiError?.message?.includes('503') || aiError?.message?.includes('429') || aiError?.message?.includes('high demand') || aiError?.message?.includes('Quota exceeded'))) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        } else {
          throw aiError; // Rethrow if max retries reached or different error
        }
      }
    }

      const output = response?.text || "[]";
      const curatedArticles = JSON.parse(output);

      // Save to mock database
      const dbDir = path.dirname(DB_PATH);
      if (!fs.existsSync(dbDir)) {
        try {
           fs.mkdirSync(dbDir, { recursive: true });
        } catch(e) {
           logError("mkdir dbDir", e);
        }
      }
      
      const payload = {
        lastRefreshed: now.toISOString(),
        articles: curatedArticles,
        summary: {
           sourcesScanned: Object.values(SOURCES).flat().length,
           totalArticlesScraped: allArticles.length,
           curatedOutput: curatedArticles.length
        },
        rawArticles: allArticles
      };
      
      try {
        fs.writeFileSync(DB_PATH, JSON.stringify(payload, null, 2), 'utf-8');
      } catch(e) {
        logError("writeFile DB_PATH", e);
      }

      return payload;
    
  } catch (error: any) {
    logError("runCurationCycle fatal error", error);
    throw error;
  }
}

export function getCuratedData() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch(error) {
    logError("getCuratedData read error", error);
  }
  return null;
}
