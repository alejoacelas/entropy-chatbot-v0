#!/usr/bin/env python3
"""
Analyze assistant ratings to compute statistics about performance.
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from matplotlib.colors import LinearSegmentedColormap

def analyze_ratings(csv_file='assistant_ratings.csv'):
    """Analyze the ratings CSV and compute statistics."""

    # Load the CSV
    df = pd.read_csv(csv_file)

    # Determine number of assistants
    rating_cols = [col for col in df.columns if col.endswith('_Rating')]
    num_assistants = len(rating_cols)

    print("="*80)
    print("ASSISTANT RATINGS ANALYSIS")
    print("="*80)
    print(f"\nTotal questions: {len(df)}")
    print(f"Number of assistants: {num_assistants}")

    # Extract ratings into a dataframe
    ratings_data = {}
    for i in range(1, num_assistants + 1):
        ratings_data[f'Assistant_{i}'] = df[f'Assistant_{i}_Rating']

    ratings_df = pd.DataFrame(ratings_data)

    # Statistics for each assistant
    print("\n" + "="*80)
    print("OVERALL STATISTICS")
    print("="*80)

    for i in range(1, num_assistants + 1):
        col = f'Assistant_{i}'
        ratings = ratings_df[col].dropna()
        if len(ratings) > 0:
            print(f"\n{col}:")
            print(f"  Total ratings: {len(ratings)}")
            print(f"  Mean rating: {ratings.mean():.2f}")
            print(f"  Median rating: {ratings.median():.1f}")
            print(f"  Std dev: {ratings.std():.2f}")
            print(f"  Min: {ratings.min():.0f}, Max: {ratings.max():.0f}")

    # Best response analysis
    print("\n" + "="*80)
    print("BEST RESPONSE ANALYSIS")
    print("="*80)

    best_counts = {f'Assistant_{i}': 0 for i in range(1, num_assistants + 1)}
    tied_best_counts = {f'Assistant_{i}': 0 for i in range(1, num_assistants + 1)}
    best_questions = {f'Assistant_{i}': [] for i in range(1, num_assistants + 1)}
    tied_best_questions = {f'Assistant_{i}': [] for i in range(1, num_assistants + 1)}

    for idx, row in ratings_df.iterrows():
        # Get ratings for this question
        ratings = [row[f'Assistant_{i}'] for i in range(1, num_assistants + 1)]
        ratings = [r for r in ratings if pd.notna(r)]  # Remove NaN values

        if not ratings:
            continue

        max_rating = max(ratings)
        question_preview = df.iloc[idx]['Question'][:50] + "..." if len(df.iloc[idx]['Question']) > 50 else df.iloc[idx]['Question']

        # Find which assistants have the max rating
        best_assistants = []
        for i in range(1, num_assistants + 1):
            if pd.notna(row[f'Assistant_{i}']) and row[f'Assistant_{i}'] == max_rating:
                best_assistants.append(f'Assistant_{i}')

        # If only one assistant has max rating, it's the sole best
        if len(best_assistants) == 1:
            assistant = best_assistants[0]
            best_counts[assistant] += 1
            best_questions[assistant].append(question_preview)
        # If multiple assistants tied for max rating
        elif len(best_assistants) > 1:
            for assistant in best_assistants:
                tied_best_counts[assistant] += 1
                tied_best_questions[assistant].append(question_preview)

    print("\nBest Response (sole winner):")
    for i in range(1, num_assistants + 1):
        assistant = f'Assistant_{i}'
        count = best_counts[assistant]
        print(f"\n{assistant}: {count} times")
        if best_questions[assistant]:
            print(f"  Questions:")
            for q in best_questions[assistant][:10]:
                print(f"    - {q}")
            if len(best_questions[assistant]) > 10:
                print(f"    ... (+{len(best_questions[assistant])-10} more)")

    print("\n" + "-"*80)
    print("Tied for Best Response:")
    for i in range(1, num_assistants + 1):
        assistant = f'Assistant_{i}'
        count = tied_best_counts[assistant]
        print(f"\n{assistant}: {count} times")
        if tied_best_questions[assistant]:
            print(f"  Questions:")
            for q in tied_best_questions[assistant][:10]:
                print(f"    - {q}")
            if len(tied_best_questions[assistant]) > 10:
                print(f"    ... (+{len(tied_best_questions[assistant])-10} more)")

    # Worst response analysis
    print("\n" + "="*80)
    print("WORST RESPONSE ANALYSIS")
    print("="*80)

    worst_counts = {f'Assistant_{i}': 0 for i in range(1, num_assistants + 1)}
    worst_questions = {f'Assistant_{i}': [] for i in range(1, num_assistants + 1)}

    for idx, row in ratings_df.iterrows():
        # Get ratings for this question
        ratings = [row[f'Assistant_{i}'] for i in range(1, num_assistants + 1)]
        ratings = [r for r in ratings if pd.notna(r)]  # Remove NaN values

        if not ratings:
            continue

        min_rating = min(ratings)
        question_preview = df.iloc[idx]['Question'][:50] + "..." if len(df.iloc[idx]['Question']) > 50 else df.iloc[idx]['Question']

        # Find which assistants have the min rating
        worst_assistants = []
        for i in range(1, num_assistants + 1):
            if pd.notna(row[f'Assistant_{i}']) and row[f'Assistant_{i}'] == min_rating:
                worst_assistants.append(f'Assistant_{i}')

        # Record worst performance
        for assistant in worst_assistants:
            worst_counts[assistant] += 1
            worst_questions[assistant].append(question_preview)

    print("\nWorst Response (lowest score for the question):")
    for i in range(1, num_assistants + 1):
        assistant = f'Assistant_{i}'
        count = worst_counts[assistant]
        print(f"\n{assistant}: {count} times")
        if worst_questions[assistant]:
            print(f"  Questions:")
            for q in worst_questions[assistant][:10]:
                print(f"    - {q}")
            if len(worst_questions[assistant]) > 10:
                print(f"    ... (+{len(worst_questions[assistant])-10} more)")

    # Summary
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    for i in range(1, num_assistants + 1):
        assistant = f'Assistant_{i}'
        print(f"\n{assistant}:")
        print(f"  Best (sole): {best_counts[assistant]}")
        print(f"  Tied for best: {tied_best_counts[assistant]}")
        print(f"  Total best/tied: {best_counts[assistant] + tied_best_counts[assistant]}")
        print(f"  Worst: {worst_counts[assistant]}")

def create_response_length_rating_plot(csv_file='assistant_ratings.csv'):
    """Create a bar plot showing response lengths (height) and ratings (color) for each assistant."""
    
    # Load the CSV
    df = pd.read_csv(csv_file)
    
    # Determine number of assistants
    rating_cols = [col for col in df.columns if col.endswith('_Rating')]
    num_assistants = len(rating_cols)
    
    # Prepare data for plotting
    plot_data = []
    
    for idx, row in df.iterrows():
        # Create question label with first characters of the question
        question_text = str(row['Question'])
        question_preview = question_text[:30] + "..." if len(question_text) > 30 else question_text
        question_id = f"Q{idx+1}: {question_preview}"
        
        for i in range(1, num_assistants + 1):
            response_col = f'Assistant_{i}_Response'
            rating_col = f'Assistant_{i}_Rating'
            
            if pd.notna(row[response_col]) and pd.notna(row[rating_col]):
                response_length = len(str(row[response_col]))
                rating = row[rating_col]
                
                plot_data.append({
                    'Question': question_id,
                    'Assistant': f'Assistant {i}',
                    'Response_Length': response_length,
                    'Rating': rating
                })
    
    plot_df = pd.DataFrame(plot_data)
    
    # Create the plot
    plt.figure(figsize=(20, 8))
    
    # Create a color map for ratings (assuming ratings are 1-5 or similar scale)
    min_rating = plot_df['Rating'].min()
    max_rating = plot_df['Rating'].max()
    
    # Create a colormap from red (low) to green (high)
    colors = ['#ff4444', '#ffaa44', '#ffff44', '#aaff44', '#44ff44']
    n_colors = len(colors)
    cmap = LinearSegmentedColormap.from_list('rating', colors, N=n_colors)
    
    # Normalize ratings to colormap
    norm = plt.Normalize(vmin=min_rating, vmax=max_rating)
    
    # Create grouped bar plot
    questions = sorted(plot_df['Question'].unique())
    assistants = [f'Assistant {i}' for i in range(1, num_assistants + 1)]
    
    bar_width = 0.25
    x_positions = np.arange(len(questions))
    
    for i, assistant in enumerate(assistants):
        assistant_data = plot_df[plot_df['Assistant'] == assistant]
        
        # Get data for this assistant
        lengths = []
        ratings = []
        for q in questions:
            q_data = assistant_data[assistant_data['Question'] == q]
            if len(q_data) > 0:
                lengths.append(q_data['Response_Length'].iloc[0])
                ratings.append(q_data['Rating'].iloc[0])
            else:
                lengths.append(0)
                ratings.append(min_rating)  # Default color for missing data
        
        # Calculate bar positions
        bar_positions = x_positions + (i - (num_assistants - 1) / 2) * bar_width
        
        # Create bars with colors based on ratings
        bars = plt.bar(bar_positions, lengths, bar_width, 
                      label=assistant, alpha=0.8)
        
        # Color each bar according to its rating
        for bar, rating in zip(bars, ratings):
            if rating > 0:  # Only color if there's actual data
                bar.set_color(cmap(norm(rating)))
            else:
                bar.set_color('lightgray')
    
    # Customize the plot
    plt.xlabel('Questions', fontsize=12)
    plt.ylabel('Response Length (characters)', fontsize=12)
    plt.title('Response Lengths and Ratings by Assistant\n(Bar height = length, Bar color = rating)', 
              fontsize=14, fontweight='bold')
    plt.xticks(x_positions, questions, rotation=45, ha='right')
    plt.legend(title='Assistants', bbox_to_anchor=(1.05, 1), loc='upper left')
    
    # Add colorbar
    sm = plt.cm.ScalarMappable(cmap=cmap, norm=norm)
    sm.set_array([])
    cbar = plt.colorbar(sm, ax=plt.gca())
    cbar.set_label('Rating', fontsize=12)
    
    # Add grid for better readability
    plt.grid(axis='y', alpha=0.3)
    
    # Adjust layout to prevent label cutoff
    plt.tight_layout()
    
    # Save the plot
    plt.savefig('response_length_rating_plot.png', dpi=300, bbox_inches='tight')
    plt.show()
    
    print(f"\nPlot saved as 'response_length_rating_plot.png'")
    print(f"Total questions plotted: {len(questions)}")
    print(f"Rating range: {min_rating:.1f} - {max_rating:.1f}")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--plot-only":
        # Run only the visualization
        print("="*80)
        print("CREATING RESPONSE LENGTH AND RATING PLOT")
        print("="*80)
        create_response_length_rating_plot()
    else:
        # Run full analysis
        analyze_ratings()
        print("\n" + "="*80)
        print("CREATING RESPONSE LENGTH AND RATING PLOT")
        print("="*80)
        create_response_length_rating_plot()
