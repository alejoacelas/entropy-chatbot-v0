import { parse } from 'csv-parse/sync';
import { CsvImportRow } from '../types.js';

interface CsvRow {
  [key: string]: string;
}

/**
 * Get value from row by checking multiple possible column name variations (case-insensitive)
 */
function getColumnValue(row: CsvRow, ...possibleNames: string[]): string | undefined {
  for (const name of possibleNames) {
    for (const [key, value] of Object.entries(row)) {
      if (key.toLowerCase().trim() === name.toLowerCase()) {
        return value?.trim();
      }
    }
  }
  return undefined;
}

/**
 * Parse CSV content and extract structured rows with question, prompt_name, prompt (optional), and answer columns.
 * The prompt column is optional - missing prompt content can be resolved later from registered prompts.
 * @param csvContent - Raw CSV file content as string
 * @returns Array of CsvImportRow objects (promptContent may be empty string if not in CSV)
 */
export function parseCsvImport(csvContent: string): CsvImportRow[] {
  try {
    const records: CsvRow[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (records.length === 0) {
      throw new Error('CSV file is empty or has no data rows.');
    }

    const importRows: CsvImportRow[] = [];
    const promptMap = new Map<string, string>(); // name -> content for consistency validation within CSV
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2; // +2 because CSV is 1-indexed and row 1 is headers

      const question = getColumnValue(row, 'question');
      const promptName = getColumnValue(row, 'prompt_name', 'promptname');
      const promptContent = getColumnValue(row, 'prompt') || '';
      const answer = getColumnValue(row, 'answer');

      // Validate required fields (prompt is optional)
      if (!question) {
        errors.push(`Row ${rowNum}: Missing 'question' value`);
        continue;
      }
      if (!promptName) {
        errors.push(`Row ${rowNum}: Missing 'prompt_name' value`);
        continue;
      }
      if (!answer) {
        errors.push(`Row ${rowNum}: Missing 'answer' value`);
        continue;
      }

      // Check for prompt consistency within CSV (same name must have same content)
      // Skip empty prompt cells - only compare non-empty ones
      if (promptContent) {
        if (promptMap.has(promptName)) {
          const existingContent = promptMap.get(promptName)!;
          if (existingContent !== promptContent) {
            errors.push(
              `Row ${rowNum}: Prompt '${promptName}' has inconsistent content. ` +
              `Previous content differs from row content.`
            );
            continue;
          }
        } else {
          promptMap.set(promptName, promptContent);
        }
      }

      // Use prompt content from CSV map if current cell is empty (but still in CSV)
      const resolvedPromptContent = promptContent || promptMap.get(promptName) || '';

      importRows.push({
        question,
        promptName,
        promptContent: resolvedPromptContent,
        answer,
      });
    }

    if (errors.length > 0) {
      throw new Error(`CSV validation errors:\n${errors.join('\n')}`);
    }

    if (importRows.length === 0) {
      throw new Error('No valid rows found in CSV.');
    }

    return importRows;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse CSV: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Resolve missing prompt content in import rows using a lookup map (e.g., from registered prompts)
 * @param importRows - Array of CsvImportRow objects
 * @param promptLookup - Map of prompt name to content
 * @returns Object with resolved rows and any errors
 */
export function resolvePromptContent(
  importRows: CsvImportRow[],
  promptLookup: Map<string, string>
): { rows: CsvImportRow[]; errors: string[] } {
  const resolvedRows: CsvImportRow[] = [];
  const errors: string[] = [];

  for (const row of importRows) {
    let content = row.promptContent;

    // If content is empty, try to resolve from lookup
    if (!content) {
      const lookedUp = promptLookup.get(row.promptName);
      if (lookedUp) {
        content = lookedUp;
      } else {
        errors.push(`No prompt content found for '${row.promptName}' (not in CSV and not registered)`);
        continue;
      }
    }

    resolvedRows.push({
      ...row,
      promptContent: content,
    });
  }

  return { rows: resolvedRows, errors };
}

/**
 * Extract unique prompts from import rows
 * @param importRows - Array of CsvImportRow objects
 * @returns Array of unique prompts with name and content
 */
export function extractUniquePrompts(
  importRows: CsvImportRow[]
): Array<{ name: string; content: string }> {
  const promptMap = new Map<string, string>();

  for (const row of importRows) {
    if (!promptMap.has(row.promptName)) {
      promptMap.set(row.promptName, row.promptContent);
    }
  }

  return Array.from(promptMap.entries()).map(([name, content]) => ({
    name,
    content,
  }));
}

/**
 * Extract unique questions from import rows
 * @param importRows - Array of CsvImportRow objects
 * @returns Array of unique question strings
 */
export function extractUniqueQuestions(importRows: CsvImportRow[]): string[] {
  return [...new Set(importRows.map(row => row.question))];
}
