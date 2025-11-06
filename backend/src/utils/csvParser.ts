import { parse } from 'csv-parse/sync';

interface CsvRow {
  [key: string]: string;
}

/**
 * Parse CSV content and extract prompts from the "prompt" column
 * @param csvContent - Raw CSV file content as string
 * @returns Array of prompt strings
 */
export function parsePromptsFromCsv(csvContent: string): string[] {
  try {
    const records: CsvRow[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    // Extract prompts from the "prompt" column
    const prompts = records
      .map(row => row.prompt || row.Prompt) // Support both lowercase and capitalized
      .filter(prompt => prompt && prompt.trim().length > 0);

    if (prompts.length === 0) {
      throw new Error('No prompts found in CSV. Ensure there is a "prompt" column with data.');
    }

    return prompts;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse CSV: ${error.message}`);
    }
    throw error;
  }
}
