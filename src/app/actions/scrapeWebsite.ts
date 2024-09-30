'use server'

import { load, CheerioAPI } from 'cheerio';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function scrapeWebsite(url: string, fields: string[]) {
  console.log('[scrapeWebsite] Starting to scrape the website:', url);
  try {
    const response = await fetch(url);
    console.log('[scrapeWebsite] Fetched response from URL:', url);
    
    const html = await response.text();
    console.log('[scrapeWebsite] Retrieved HTML content from response.');

    const $ = load(html);
    // get only the body part
    const body = $('body').html();
    //remove svg tags
    const bodyWithoutSvg = body?.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '');
    // strip style and script tags
    const bodyWithoutStyles = bodyWithoutSvg?.replace(/<style[^>]*>[\s\S]*?<\/style>|<script[^>]*>[\s\S]*?<\/script>/gi, '');
    console.log('[scrapeWebsite] Loaded HTML into Cheerio.');

    // Get selectors from GPT-4o-mini
    console.log('[scrapeWebsite] Sending request to GPT-4o-mini with body:', bodyWithoutStyles);
    const selectors = await getSelectorsFromGPT(bodyWithoutStyles || '', fields);
    console.log('[scrapeWebsite] Received selectors from GPT:', selectors);

    // Extract data using Cheerio
    const extractedData = extractDataWithCheerio($, selectors);
    console.log('[scrapeWebsite] Extracted data using Cheerio:', extractedData);

    console.log('[scrapeWebsite] Scraping completed successfully.');
    return { success: true, extractedData };
  } catch (error) {
    console.error('[scrapeWebsite] Error scraping website:', error);
    return { success: false, error: 'Failed to scrape website' };
  }
}

async function getSelectorsFromGPT(html: string, fields: string[]) {
  const prompt = `
    Given the following HTML content and list of fields to extract, provide the most appropriate CSS selector or XPath for each field. Return the result as a JSON object where the keys are the field names and the values are the selectors.

    Fields to extract: ${fields.join(', ')}

    HTML content:
    ${html} // Limiting to first 5000 characters to avoid token limits

    Return format example:
    {
      "field1": "selector1",
      "field2": "selector2"
    }
  `;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return JSON.parse(completion.choices[0].message.content || '{}');
}

function extractDataWithCheerio($: CheerioAPI, selectors: Record<string, string>) {
  const extractedData: Record<string, string>[] = [{}];

  for (const [field, selector] of Object.entries(selectors)) {
    const elements = $(selector);
    if (elements.length > 0) {
      elements.each((index: number, element: cheerio.Element) => {
        if (!extractedData[index]) {
          extractedData[index] = {};
        }
        extractedData[index][field] = $(element).text().trim() || 'Not found';
      });
    } else {
      extractedData[0][field] = 'Not found';
    }
  }

  return extractedData;
}