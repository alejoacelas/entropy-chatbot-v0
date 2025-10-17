# %% [markdown]
# # Assistant Response Rating Tool (Google Colab Version)
#
# This notebook allows you to rate assistant responses from the evals-run.jsonl file.
# Each question was answered by 3 different assistant prompts (run_ids).
# Rate each response from 1-5 and export results to CSV.
#
# ## Setup Instructions:
# 1. Upload your `evals-run.jsonl` file using the file upload cell below
# 2. Run all cells in order
# 3. Execute `rate_all_questions()` to start rating
# 4. Download the CSV when finished

# %%
# Upload the JSONL file
from google.colab import files
import io

print("Please upload your evals-run.jsonl file:")
uploaded = files.upload()

# Get the filename (should be evals-run.jsonl)
file_path = list(uploaded.keys())[0]
print(f"\nFile uploaded successfully: {file_path}")

# %%
import json
import pandas as pd
import numpy as np
from IPython.display import display, HTML, clear_output

# %%
# Load and parse the data
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

# Load the data
questions, run_ids = load_eval_data(file_path)

print(f"Loaded {len(questions)} questions")
print(f"Found {len(run_ids)} different run_ids (assistant variants)")
print(f"Run IDs: {run_ids}")

# %%
# Rating storage
ratings = {}

def initialize_ratings():
    """Initialize the ratings dictionary"""
    global ratings
    for q_idx in questions:
        ratings[q_idx] = {}
        for run_id in run_ids:
            ratings[q_idx][run_id] = None

initialize_ratings()

# %%
# Rating interface
current_question_idx = 0
question_indices = sorted(questions.keys())

def display_question_and_responses(question_idx):
    """Display a question and its responses with rating interface"""
    if question_idx not in questions:
        print("Question not found")
        return

    question_data = questions[question_idx]
    question = question_data['question']
    responses = question_data['responses']

    print("="*80)
    print(f"QUESTION {question_idx + 1} of {len(questions)}")
    print("="*80)
    print(f"Input: {question}")
    print("="*80)
    print()

    # Display each response with rating interface
    for i, run_id in enumerate(run_ids):
        if run_id in responses:
            response = responses[run_id]

            print(f"\nASSISTANT {i+1} ({run_id[-8:]}):")  # Show last 8 chars of run_id
            print("-" * 80)

            # Display response in markdown format
            display(HTML(f'<div style="border: 1px solid #ddd; padding: 10px; margin: 10px 0; background-color: #f9f9f9;">{pd.io.formats.style.Styler._translate_latex(response) if hasattr(pd.io.formats.style.Styler, "_translate_latex") else response}</div>'))

            # For text-only view, also print the full response
            from IPython.display import Markdown
            display(Markdown(response))

            print("-" * 80)

            # Get current rating
            current_rating = ratings[question_idx].get(run_id, "Not rated")
            print(f"Current Rating: {current_rating}")
            print()

    print("Enter ratings (1-5) for each assistant:")
    for i, run_id in enumerate(run_ids):
        if run_id in responses:
            while True:
                try:
                    rating_input = input(f"Rate Assistant {i+1} ({run_id[-8:]}): ")
                    if rating_input.strip() == "":
                        break  # Skip rating
                    rating = int(rating_input)
                    if 1 <= rating <= 5:
                        ratings[question_idx][run_id] = rating
                        print(f"Rated Assistant {i+1}: {rating}")
                        break
                    else:
                        print("Please enter a number between 1 and 5")
                except ValueError:
                    print("Please enter a valid number between 1 and 5")
    print()

def show_rating_progress():
    """Show progress of ratings"""
    total_ratings_needed = len(questions) * len(run_ids)
    completed_ratings = sum(1 for q_idx in questions for run_id in run_ids
                          if ratings[q_idx].get(run_id) is not None)

    print(f"Rating Progress: {completed_ratings}/{total_ratings_needed} completed")
    print(f"Questions completed: {sum(1 for q_idx in questions if all(ratings[q_idx].get(run_id) is not None for run_id in run_ids))}/{len(questions)}")
    print()

# %%
# Navigation functions
def next_question():
    """Move to next question"""
    global current_question_idx
    if current_question_idx < len(question_indices) - 1:
        current_question_idx += 1
    else:
        print("This is the last question!")

def previous_question():
    """Move to previous question"""
    global current_question_idx
    if current_question_idx > 0:
        current_question_idx -= 1
    else:
        print("This is the first question!")

def go_to_question(idx):
    """Go to specific question by index (0-based)"""
    global current_question_idx
    if 0 <= idx < len(question_indices):
        current_question_idx = idx
    else:
        print(f"Question index must be between 0 and {len(question_indices) - 1}")

def show_current_question():
    """Display current question with responses"""
    q_idx = question_indices[current_question_idx]
    display_question_and_responses(q_idx)

# %%
# Rating workflow
def rate_all_questions():
    """Interactive rating workflow"""
    global current_question_idx

    print("=== ASSISTANT RESPONSE RATING SESSION ===")
    print(f"You will rate {len(questions)} questions.")
    print(f"Each question has responses from {len(run_ids)} different assistant variants.")
    print("Rate each response from 1 (poor) to 5 (excellent).")
    print()
    print("Commands:")
    print("- Press Enter to skip rating a response")
    print("- Type 'n' after ratings to go to next question")
    print("- Type 'p' after ratings to go to previous question")
    print("- Type 'q' to quit")
    print("- Type 'progress' to see rating progress")
    print("- Type 'export' to export current ratings to CSV")
    print()

    while True:
        show_rating_progress()
        q_idx = question_indices[current_question_idx]
        display_question_and_responses(q_idx)

        command = input("Command (n=next, p=previous, q=quit, progress, export): ").strip().lower()

        if command == 'q':
            break
        elif command == 'n':
            next_question()
        elif command == 'p':
            previous_question()
        elif command == 'progress':
            show_rating_progress()
        elif command == 'export':
            export_ratings()
        elif command.isdigit():
            go_to_question(int(command) - 1)  # Convert to 0-based index
        else:
            print("Unknown command. Use n/p/q/progress/export or question number.")

        print("\n" + "="*100 + "\n")

# %%
# Export functionality
def export_ratings():
    """Export ratings to CSV format and download"""
    export_data = []

    for q_idx in sorted(questions.keys()):
        question_data = questions[q_idx]
        question = question_data['question']
        responses = question_data['responses']

        row = {'Question': question}

        # Add responses and ratings for each assistant
        for i, run_id in enumerate(run_ids):
            assistant_num = i + 1
            if run_id in responses:
                row[f'Assistant_{assistant_num}_Response'] = responses[run_id]
                row[f'Assistant_{assistant_num}_Rating'] = ratings[q_idx].get(run_id, '')
            else:
                row[f'Assistant_{assistant_num}_Response'] = ''
                row[f'Assistant_{assistant_num}_Rating'] = ''

        export_data.append(row)

    df = pd.DataFrame(export_data)

    # Save to CSV
    output_file = 'assistant_ratings.csv'
    df.to_csv(output_file, index=False, encoding='utf-8')

    print(f"Ratings exported to: {output_file}")
    print(f"Exported {len(export_data)} questions with ratings")

    # Show summary stats
    all_ratings = []
    for q_idx in questions:
        for run_id in run_ids:
            rating = ratings[q_idx].get(run_id)
            if rating is not None:
                all_ratings.append(rating)

    if all_ratings:
        print(f"\nRating Summary:")
        print(f"Total ratings given: {len(all_ratings)}")
        print(f"Average rating: {np.mean(all_ratings):.2f}")
        print(f"Rating distribution:")
        for rating in range(1, 6):
            count = all_ratings.count(rating)
            print(f"  {rating}: {count} ({count/len(all_ratings)*100:.1f}%)")

    # Download the file in Colab
    print("\nDownloading CSV file...")
    files.download(output_file)

    return df

# %%
# Helper function to load existing ratings (if CSV exists)
def load_existing_ratings():
    """Load existing ratings from CSV if available"""
    try:
        df = pd.read_csv('assistant_ratings.csv')
        print("Existing ratings found! Loading...")

        # Extract ratings from the CSV
        for idx, row in df.iterrows():
            q_idx = idx  # Assuming questions are in order
            if q_idx in questions:
                for i, run_id in enumerate(run_ids):
                    rating_col = f'Assistant_{i+1}_Rating'
                    if rating_col in row and pd.notna(row[rating_col]) and row[rating_col] != '':
                        ratings[q_idx][run_id] = int(row[rating_col])

        show_rating_progress()

    except FileNotFoundError:
        print("No existing ratings file found. Starting fresh.")
    except Exception as e:
        print(f"Error loading existing ratings: {e}")

# %%
# Optional: Upload existing ratings CSV to resume work
def upload_existing_ratings():
    """Upload an existing ratings CSV to continue rating"""
    print("Upload your assistant_ratings.csv file to resume:")
    uploaded = files.upload()
    if 'assistant_ratings.csv' in uploaded:
        load_existing_ratings()
    else:
        print("No ratings file uploaded. Starting fresh.")

# %%
# Main execution
print("\n" + "="*80)
print("Assistant Response Rating Tool")
print("="*80)

# Try to load existing ratings
load_existing_ratings()

print("\nReady to start rating!")
print("Run: rate_all_questions() to begin the interactive rating session")
print("\nOther useful functions:")
print("- show_current_question() to see current question")
print("- next_question() / previous_question() to navigate")
print("- export_ratings() to save ratings to CSV and download")
print("- upload_existing_ratings() to upload a previous ratings CSV and resume")
