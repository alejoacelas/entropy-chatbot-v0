/**
 * Transform to remove thinking section and show only content after signature.
 * Extracts the actual response by finding the 'Signature:' line and returning
 * everything after it, effectively removing the thinking/planning content.
 * Also processes JSON lines to convert web search tool uses into simple annotations.
 */

/**
 * Remove thinking section and return only content after the signature.
 * Also processes JSON tool use lines to show simplified annotations.
 *
 * @param {string} output - The full model output including thinking section
 * @param {Object} context - Optional context dict with vars and prompt
 * @returns {string} The response content after the signature line, or original output if no signature found
 */
function getTransform(output, context) {
    if (!output || typeof output !== 'string') {
        return output;
    }

    // Find the signature line
    const lines = output.split('\n');

    const processedLines = [];
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('Signature:')) {
            // Process everything from this line onwards
            for (let j = i + 1; j < lines.length; j++) {
                const processedLine = processJsonLine(lines[j]);
                if (processedLine !== null) {  // null means skip the line
                    processedLines.push(processedLine);
                }
            }
            const result = processedLines.join('\n').trim();
            return result;
        }
    }

    // If no signature found, return original output
    return output;
}

/**
 * Process a line that might contain JSON tool use data.
 *
 * @param {string} line - A single line of text
 * @returns {string|null} Processed line, or null if line should be removed
 */
function processJsonLine(line) {
    const stripped = line.trim();

    // Check if line starts with {"type"
    if (!stripped.startsWith('{"type"')) {
        return line;
    }

    try {
        const data = JSON.parse(stripped);

        // Handle server_tool_use with web_search
        if (data.type === "server_tool_use" && data.name === "web_search") {
            const query = data.input?.query || "";
            return `Web search query: ${query}`;
        }

        // Remove web_search_tool_result lines entirely
        if (data.type === "web_search_tool_result") {
            return null;
        }

        // For other JSON types, keep the line as is
        return line;

    } catch (e) {
        // If it's not valid JSON, keep the line as is
        return line;
    }
}

// Export the transform function
export default getTransform;
