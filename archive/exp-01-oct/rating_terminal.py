#!/usr/bin/env python3
"""
Assistant Response Rating Tool (Terminal Version)

This script allows you to rate assistant responses from the evals-run.jsonl file.
Each question was answered by 3 different assistant prompts (run_ids).
Rate each response from 1-5 and export results to CSV.

Usage:
    python rating_terminal.py
"""

import json
import pandas as pd
import numpy as np
import os
import sys
import random
from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
from rich.prompt import Prompt, IntPrompt
from rich.progress import Progress
from rich.table import Table

# Try to import rich, fall back to basic output if not available
try:
    console = Console()
    HAS_RICH = True
except ImportError:
    HAS_RICH = False
    print("Note: Install 'rich' for better formatting: pip install rich")

    class Console:
        """Fallback console if rich is not available"""
        def print(self, *args, **kwargs):
            if args and hasattr(args[0], '__str__'):
                print(str(args[0]))
            else:
                print(*args)

        def clear(self):
            os.system('clear' if os.name != 'nt' else 'cls')

    console = Console()


def clear_screen():
    """Clear the terminal screen"""
    os.system('clear' if os.name != 'nt' else 'cls')


def clean_response(response):
    """Remove annotations from the end of the response"""
    # Check for "Annotations:" marker
    if "Annotations:" in response:
        # Split and keep only the part before annotations
        response = response.split("Annotations:")[0].strip()
    return response


def load_eval_data(file_path):
    """Load the evals-run.jsonl file and organize by question and run_id"""
    data = []
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            data.append(json.loads(line))

    # Group by question (data_source_idx) and run_id
    questions = {}
    run_ids = set()

    for entry in data:
        question = entry['item']['input']
        response = entry['sample']['outputs'][0]['content']
        # Clean the response to remove annotations
        response = clean_response(response)
        run_id = entry['run_id']
        data_idx = entry['data_source_idx']

        run_ids.add(run_id)

        if data_idx not in questions:
            questions[data_idx] = {
                'question': question,
                'responses': {}
            }

        questions[data_idx]['responses'][run_id] = response

    return questions, sorted(run_ids)


def initialize_ratings(questions, run_ids):
    """Initialize the ratings dictionary"""
    ratings = {}
    for q_idx in questions:
        ratings[q_idx] = {}
        for run_id in run_ids:
            ratings[q_idx][run_id] = {'rating': None, 'comment': None}
    return ratings


def get_randomized_order(question_idx, run_ids):
    """Get a randomized order of run_ids for a specific question.
    Uses the question index as seed for consistency."""
    random.seed(question_idx)
    shuffled = run_ids.copy()
    random.shuffle(shuffled)
    return shuffled


def show_rating_progress(questions, run_ids, ratings):
    """Show progress of ratings"""
    total_ratings_needed = len(questions) * len(run_ids)
    completed_ratings = sum(1 for q_idx in questions for run_id in run_ids
                          if ratings[q_idx].get(run_id, {}).get('rating') is not None)

    questions_completed = sum(1 for q_idx in questions
                             if all(ratings[q_idx].get(run_id, {}).get('rating') is not None for run_id in run_ids))

    if HAS_RICH:
        table = Table(title="Rating Progress")
        table.add_column("Metric", style="cyan")
        table.add_column("Progress", style="green")

        table.add_row("Total Ratings", f"{completed_ratings}/{total_ratings_needed}")
        table.add_row("Questions Completed", f"{questions_completed}/{len(questions)}")
        table.add_row("Percentage", f"{(completed_ratings/total_ratings_needed)*100:.1f}%")

        console.print(table)
    else:
        print(f"\n{'='*60}")
        print(f"Rating Progress: {completed_ratings}/{total_ratings_needed} completed")
        print(f"Questions completed: {questions_completed}/{len(questions)}")
        print(f"Percentage: {(completed_ratings/total_ratings_needed)*100:.1f}%")
        print(f"{'='*60}\n")


def display_question_and_responses(question_idx, questions, run_ids, ratings):
    """Display a question and its responses in randomized order"""
    if question_idx not in questions:
        console.print("[red]Question not found[/red]")
        return

    question_data = questions[question_idx]
    question = question_data['question']
    responses = question_data['responses']

    clear_screen()

    # Display question
    if HAS_RICH:
        console.print(Panel(f"[bold cyan]Question {question_idx + 1} of {len(questions)}[/bold cyan]"))
        console.print(Panel(f"[bold yellow]{question}[/bold yellow]", title="Input"))
    else:
        print(f"\n{'='*80}")
        print(f"QUESTION {question_idx + 1} of {len(questions)}")
        print(f"{'='*80}")
        print(f"Input: {question}")
        print(f"{'='*80}\n")

    # Get randomized order for this question
    randomized_run_ids = get_randomized_order(question_idx, run_ids)

    # Display each response in randomized order
    for i, run_id in enumerate(randomized_run_ids):
        if run_id in responses:
            response = responses[run_id]
            rating_data = ratings[question_idx].get(run_id, {})
            current_rating = rating_data.get('rating', "Not rated")
            current_comment = rating_data.get('comment', "")

            if HAS_RICH:
                console.print(f"\n[bold green]ASSISTANT {i+1}[/bold green]")
                console.print("[dim]" + "─" * 80 + "[/dim]")
                console.print(Markdown(response))
                console.print("[dim]" + "─" * 80 + "[/dim]")
                console.print(f"[yellow]Current Rating: {current_rating}[/yellow]")
                if current_comment:
                    console.print(f"[yellow]Comment: {current_comment}[/yellow]\n")
                else:
                    console.print()
            else:
                print(f"\n{'─'*80}")
                print(f"ASSISTANT {i+1}")
                print(f"{'─'*80}")
                print(response)
                print(f"{'─'*80}")
                print(f"Current Rating: {current_rating}")
                if current_comment:
                    print(f"Comment: {current_comment}\n")
                else:
                    print()


def rate_question(question_idx, questions, run_ids, ratings):
    """Rate all assistants for a given question in randomized order"""
    print("\n" + "="*80)
    print("For each assistant, first provide a comment, then a rating (1-5):")
    print("="*80)

    # Get the same randomized order used in display
    randomized_run_ids = get_randomized_order(question_idx, run_ids)

    for i, run_id in enumerate(randomized_run_ids):
        if run_id in questions[question_idx]['responses']:
            # Get comment first
            if HAS_RICH:
                comment = Prompt.ask(
                    f"[cyan]Comment for Assistant {i+1}[/cyan]",
                    default=""
                )
            else:
                comment = input(f"Comment for Assistant {i+1}: ")

            if comment.strip() == "":
                continue  # Skip if no comment provided

            # Then get rating
            while True:
                try:
                    if HAS_RICH:
                        rating_input = Prompt.ask(
                            f"[cyan]Rate Assistant {i+1}[/cyan]",
                            default=""
                        )
                    else:
                        rating_input = input(f"Rate Assistant {i+1}: ")

                    if rating_input.strip() == "":
                        break  # Skip rating

                    rating = int(rating_input)
                    if 1 <= rating <= 5:
                        ratings[question_idx][run_id] = {'rating': rating, 'comment': comment.strip()}
                        if HAS_RICH:
                            console.print(f"[green]✓ Rated Assistant {i+1}: {rating} - {comment.strip()}[/green]")
                        else:
                            print(f"✓ Rated Assistant {i+1}: {rating} - {comment.strip()}")
                        break
                    else:
                        if HAS_RICH:
                            console.print("[red]Please enter a number between 1 and 5[/red]")
                        else:
                            print("Please enter a number between 1 and 5")
                except ValueError:
                    if HAS_RICH:
                        console.print("[red]Please enter a valid number between 1 and 5[/red]")
                    else:
                        print("Please enter a valid number between 1 and 5")


def export_ratings(questions, run_ids, ratings, output_file='assistant_ratings.csv'):
    """Export ratings to CSV format"""
    export_data = []
    mapping_data = []

    for q_idx in sorted(questions.keys()):
        question_data = questions[q_idx]
        question = question_data['question']
        responses = question_data['responses']

        row = {'Question': question}

        # Get the randomized order for this question
        randomized_run_ids = get_randomized_order(q_idx, run_ids)

        # Store mapping for this question
        mapping_row = {'Question_Number': q_idx + 1}

        # Add responses, comments, and ratings for each assistant in randomized order
        for i, run_id in enumerate(randomized_run_ids):
            assistant_num = i + 1
            mapping_row[f'Assistant_{assistant_num}'] = run_id

            if run_id in responses:
                rating_data = ratings[q_idx].get(run_id, {})
                row[f'Assistant_{assistant_num}_Response'] = responses[run_id]
                row[f'Assistant_{assistant_num}_Comment'] = rating_data.get('comment', '')
                row[f'Assistant_{assistant_num}_Rating'] = rating_data.get('rating', '')
            else:
                row[f'Assistant_{assistant_num}_Response'] = ''
                row[f'Assistant_{assistant_num}_Comment'] = ''
                row[f'Assistant_{assistant_num}_Rating'] = ''

        export_data.append(row)
        mapping_data.append(mapping_row)

    df = pd.DataFrame(export_data)
    mapping_df = pd.DataFrame(mapping_data)

    # Save to CSV
    df.to_csv(output_file, index=False, encoding='utf-8')

    # Save mapping file
    mapping_file = output_file.replace('.csv', '_mapping.csv')
    mapping_df.to_csv(mapping_file, index=False, encoding='utf-8')

    if HAS_RICH:
        console.print(f"\n[green]✓ Ratings exported to: {output_file}[/green]")
        console.print(f"[green]✓ Mapping exported to: {mapping_file}[/green]")
        console.print(f"[green]✓ Exported {len(export_data)} questions with ratings[/green]")
    else:
        print(f"\n✓ Ratings exported to: {output_file}")
        print(f"✓ Mapping exported to: {mapping_file}")
        print(f"✓ Exported {len(export_data)} questions with ratings")

    # Show summary stats
    all_ratings = []
    for q_idx in questions:
        for run_id in run_ids:
            rating_data = ratings[q_idx].get(run_id, {})
            rating = rating_data.get('rating')
            if rating is not None:
                all_ratings.append(rating)

    if all_ratings:
        print(f"\nRating Summary:")
        print(f"Total ratings given: {len(all_ratings)}")
        print(f"Average rating: {np.mean(all_ratings):.2f}")
        print(f"\nRating distribution:")
        for rating in range(1, 6):
            count = all_ratings.count(rating)
            bar = "█" * int(count / len(all_ratings) * 50)
            print(f"  {rating}: {count:3d} ({count/len(all_ratings)*100:.1f}%) {bar}")

    return df


def load_existing_ratings(questions, run_ids, ratings, csv_file='assistant_ratings.csv'):
    """Load existing ratings from CSV if available"""
    if not os.path.exists(csv_file):
        return False

    try:
        df = pd.read_csv(csv_file)
        print(f"Existing ratings found in {csv_file}! Loading...")

        # Extract ratings and comments from the CSV
        for idx, row in df.iterrows():
            q_idx = idx  # Assuming questions are in order
            if q_idx in questions:
                for i, run_id in enumerate(run_ids):
                    rating_col = f'Assistant_{i+1}_Rating'
                    comment_col = f'Assistant_{i+1}_Comment'
                    if rating_col in row and pd.notna(row[rating_col]) and row[rating_col] != '':
                        rating = int(row[rating_col])
                        comment = row.get(comment_col, '') if comment_col in row and pd.notna(row.get(comment_col)) else ''
                        ratings[q_idx][run_id] = {'rating': rating, 'comment': comment}

        show_rating_progress(questions, run_ids, ratings)
        return True

    except Exception as e:
        print(f"Error loading existing ratings: {e}")
        return False


def rate_all_questions(questions, run_ids, ratings):
    """Interactive rating workflow"""
    current_question_idx = 0
    question_indices = sorted(questions.keys())

    if HAS_RICH:
        console.print(Panel("[bold cyan]ASSISTANT RESPONSE RATING SESSION[/bold cyan]"))
    else:
        print("\n" + "="*80)
        print("=== ASSISTANT RESPONSE RATING SESSION ===")
        print("="*80)

    print(f"\nYou will rate {len(questions)} questions.")
    print(f"Each question has responses from {len(run_ids)} different assistant variants.")
    print("Rate each response from 1 (poor) to 5 (excellent).\n")
    print("Commands:")
    print("  n - Next question")
    print("  p - Previous question")
    print("  [number] - Jump to question number")
    print("  progress - Show rating progress")
    print("  export - Export current ratings to CSV")
    print("  q - Quit")
    print()

    while True:
        q_idx = question_indices[current_question_idx]

        # Display question and responses
        display_question_and_responses(q_idx, questions, run_ids, ratings)

        # Rate the question
        rate_question(q_idx, questions, run_ids, ratings)

        # Get next command
        print("\n" + "="*80)
        command = input("Command (n=next, p=previous, q=quit, progress, export, or question #): ").strip().lower()

        if command == 'q':
            print("\nQuitting...")
            break
        elif command == 'n' or command == '':
            if current_question_idx < len(question_indices) - 1:
                current_question_idx += 1
            else:
                print("This is the last question!")
                input("Press Enter to continue...")
        elif command == 'p':
            if current_question_idx > 0:
                current_question_idx -= 1
            else:
                print("This is the first question!")
                input("Press Enter to continue...")
        elif command == 'progress':
            show_rating_progress(questions, run_ids, ratings)
            input("\nPress Enter to continue...")
        elif command == 'export':
            export_ratings(questions, run_ids, ratings)
            input("\nPress Enter to continue...")
        elif command.isdigit():
            q_num = int(command) - 1  # Convert to 0-based index
            if 0 <= q_num < len(question_indices):
                current_question_idx = q_num
            else:
                print(f"Please enter a number between 1 and {len(question_indices)}")
                input("Press Enter to continue...")
        else:
            print("Unknown command. Use n/p/q/progress/export or question number.")
            input("Press Enter to continue...")


def main():
    """Main entry point"""
    # Find the JSONL file
    default_file = 'evals-run.jsonl'

    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    elif os.path.exists(default_file):
        file_path = default_file
    else:
        print("Usage: python rating_terminal.py [path/to/evals-run.jsonl]")
        print(f"\nOr place '{default_file}' in the current directory.")
        sys.exit(1)

    if not os.path.exists(file_path):
        print(f"Error: File not found: {file_path}")
        sys.exit(1)

    # Load data
    print(f"Loading data from {file_path}...")
    questions, run_ids = load_eval_data(file_path)

    print(f"✓ Loaded {len(questions)} questions")
    print(f"✓ Found {len(run_ids)} different run_ids (assistant variants)")
    print(f"  Run IDs: {', '.join([rid[-8:] for rid in run_ids])}")

    # Initialize ratings
    ratings = initialize_ratings(questions, run_ids)

    # Try to load existing ratings
    load_existing_ratings(questions, run_ids, ratings)

    input("\nPress Enter to start rating...")

    # Start rating session
    rate_all_questions(questions, run_ids, ratings)

    # Ask to export if not already done
    if input("\nExport ratings before exiting? (y/n): ").lower() == 'y':
        export_ratings(questions, run_ids, ratings)

    print("\nGoodbye!")


if __name__ == "__main__":
    main()
