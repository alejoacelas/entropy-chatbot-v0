"""
Transform to remove thinking section and show only content after signature.
Extracts the actual response by finding the 'Signature:' line and returning
everything after it, effectively removing the thinking/planning content.
"""

def get_transform(output, context=None):
    """
    Remove thinking section and return only content after the signature.

    Args:
        output: The full model output including thinking section
        context: Optional context dict with vars and prompt

    Returns:
        The response content after the signature line, or original output if no signature found
    """
    if not output or not isinstance(output, str):
        return output

    # Find the signature line
    lines = output.split('\n')

    for i, line in enumerate(lines):
        if line.strip().startswith('Signature:'):
            # Return everything from this line onwards
            result = '\n'.join(lines[i+1:]).strip()
            return result

    # If no signature found, return original output
    return output
