'use server'

import { load } from 'cheerio';
import { convert } from 'html-to-text';
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
    console.log('[scrapeWebsite] Loaded HTML into Cheerio.');

    const text = convert(html, { wordwrap: 130 });
    console.log('[scrapeWebsite] Converted HTML to text.');

    // Extract fields using GPT-4o-mini
    const extractedData = await extractFieldsWithGPT(text, fields);
    console.log('[scrapeWebsite] Extracted fields using GPT-4o-mini:', extractedData);

    console.log('[scrapeWebsite] Scraping completed successfully.');
    return { success: true, text, extractedData };
  } catch (error) {
    console.error('[scrapeWebsite] Error scraping website:', error);
    return { success: false, error: 'Failed to scrape website' };
  }
}
async function extractFieldsWithGPT(content: string, fields: string[]) {
  console.log('[extractFieldsWithGPT] Starting field extraction process.');

  const schema = {
    type: "object",
    properties: {
      records: {
        type: "array",
        items: {
          type: "object",
          properties: Object.fromEntries(fields.map(field => [field, { type: "string" }])),
          required: fields
        }
      }
    },
    required: ["records"]
  };

  console.log('[extractFieldsWithGPT] Constructed JSON schema:', JSON.stringify(schema, null, 2));

  const prompt = `
    Extract multiple records with the following fields from the given content:
    ${fields.join(', ')}

    Content:
    ${content}

    Please return the results according to the following JSON schema:
    ${JSON.stringify(schema, null, 2)}

    Ensure all fields are present in each record, using "Not found" if a field couldn't be extracted.
    Return an array of records, even if only one record is found.
  `;

  console.log('[extractFieldsWithGPT] Generated prompt for OpenAI:', prompt);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  });

  console.log('[extractFieldsWithGPT] Received completion from OpenAI:', completion);

  const result = completion.choices[0].message.content;
  console.log('[extractFieldsWithGPT] Parsed result:', result);

  const records = JSON.parse(result || '{"records": []}').records;
  console.log('[extractFieldsWithGPT] Extracted records:', records);

  return records;
}