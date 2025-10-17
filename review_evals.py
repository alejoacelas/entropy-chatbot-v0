#!/usr/bin/env python3
"""
Streamlit interface for reviewing promptfoo evaluation results.
Allows filtering by prompt/model, adding ratings (1-5) and notes, and exporting results.
Annotations are stored separately and persist across evaluation runs.
"""

import streamlit as st
import json
from pathlib import Path
import pandas as pd
from datetime import datetime

# Set page configuration
st.set_page_config(
    page_title="Evaluation Reviewer",
    page_icon="📝",
    layout="wide",
    initial_sidebar_state="expanded"
)

def load_promptfoo_results():
    """Load evaluation results from promptfoo JSON file."""
    results_file = Path("data/evals/results.json")
    if not results_file.exists():
        return None

    with open(results_file, 'r', encoding='utf-8') as f:
        return json.load(f)

def load_annotations():
    """Load annotations from JSON file."""
    annotations_file = Path("review_annotations.json")
    if not annotations_file.exists():
        return {}

    with open(annotations_file, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_annotations(annotations):
    """Save annotations to JSON file."""
    annotations_file = Path("review_annotations.json")
    with open(annotations_file, 'w', encoding='utf-8') as f:
        json.dump(annotations, f, indent=2, ensure_ascii=False)

def get_annotation(annotations, eval_id, test_idx, prompt_label, provider_label):
    """Get annotation for a specific result."""
    return annotations.get(eval_id, {}).get(str(test_idx), {}).get(prompt_label, {}).get(provider_label, {})

def set_annotation(annotations, eval_id, test_idx, prompt_label, provider_label, rating, notes):
    """Set annotation for a specific result."""
    if eval_id not in annotations:
        annotations[eval_id] = {}
    if str(test_idx) not in annotations[eval_id]:
        annotations[eval_id][str(test_idx)] = {}
    if prompt_label not in annotations[eval_id][str(test_idx)]:
        annotations[eval_id][str(test_idx)][prompt_label] = {}

    annotations[eval_id][str(test_idx)][prompt_label][provider_label] = {
        "rating": rating,
        "notes": notes
    }


def export_to_csv(promptfoo_data, annotations, original_csv):
    """
    Export results to CSV format with one row per test case.

    For each (prompt, model) combination, adds columns:
    - {promptLabel}_{modelLabel}_response
    - {promptLabel}_{modelLabel}_rating
    - {promptLabel}_{modelLabel}_notes
    """
    # Load original CSV to get test case info
    original_df = pd.read_csv(original_csv)
    export_df = original_df.copy()

    eval_id = promptfoo_data.get("evalId", "")
    results = promptfoo_data.get("results", {}).get("results", [])

    # Build a map of (testIdx, promptLabel, providerLabel) -> result
    result_map = {}
    for result in results:
        test_idx = result.get("testIdx")
        prompt_label = result.get("prompt", {}).get("label", "unknown")
        provider_label = result.get("provider", {}).get("label", "unknown")
        result_map[(test_idx, prompt_label, provider_label)] = result

    # Collect all unique (prompt, model) combinations
    combinations = set()
    for test_idx, prompt_label, provider_label in result_map.keys():
        combinations.add((prompt_label, provider_label))

    combinations = sorted(list(combinations))

    # Add columns for each combination
    for prompt_label, provider_label in combinations:
        response_col = f"{prompt_label}_{provider_label}_response"
        rating_col = f"{prompt_label}_{provider_label}_rating"
        notes_col = f"{prompt_label}_{provider_label}_notes"

        responses = []
        ratings = []
        notes = []

        for test_idx in range(len(export_df)):
            key = (test_idx, prompt_label, provider_label)
            if key in result_map:
                result = result_map[key]
                responses.append(result.get("response", {}).get("output", ""))

                # Get annotation
                annotation = get_annotation(annotations, eval_id, test_idx, prompt_label, provider_label)
                ratings.append(annotation.get("rating", 0))
                notes.append(annotation.get("notes", ""))
            else:
                responses.append("")
                ratings.append(0)
                notes.append("")

        export_df[response_col] = responses
        export_df[rating_col] = ratings
        export_df[notes_col] = notes

    return export_df

def parse_results_data(promptfoo_data):
    """Parse promptfoo results into a usable structure."""
    results = promptfoo_data.get("results", {}).get("results", [])

    # Extract unique prompts and providers
    unique_prompts = {}
    unique_providers = {}

    for result in results:
        prompt_label = result.get("prompt", {}).get("label", "unknown")
        provider_label = result.get("provider", {}).get("label", "unknown")

        if prompt_label not in unique_prompts:
            unique_prompts[prompt_label] = result.get("prompt", {})
        if provider_label not in unique_providers:
            unique_providers[provider_label] = result.get("provider", {})

    return results, list(unique_prompts.keys()), list(unique_providers.keys())

def main():
    # Load promptfoo results and annotations
    promptfoo_data = load_promptfoo_results()
    if promptfoo_data is None:
        st.error("❌ No evaluation results found. Run promptfoo first, then open this app.")
        return

    annotations = load_annotations()
    eval_id = promptfoo_data.get("evalId", "unknown")

    # Parse results data
    results, prompt_labels, provider_labels = parse_results_data(promptfoo_data)

    # Initialize session state
    if 'eval_id' not in st.session_state:
        st.session_state.eval_id = eval_id
    if 'current_test_idx' not in st.session_state:
        st.session_state.current_test_idx = 0
    if 'selected_prompt' not in st.session_state:
        st.session_state.selected_prompt = prompt_labels[0] if prompt_labels else None
    if 'selected_provider' not in st.session_state:
        st.session_state.selected_provider = provider_labels[0] if provider_labels else None

    # Sidebar: Filters and controls
    with st.sidebar:
        st.header("🎯 Filters")

        # Prompt selector
        selected_prompt = st.selectbox(
            "Prompt:",
            options=prompt_labels,
            index=prompt_labels.index(st.session_state.selected_prompt) if st.session_state.selected_prompt in prompt_labels else 0
        )
        st.session_state.selected_prompt = selected_prompt

        # Provider selector
        selected_provider = st.selectbox(
            "Model:",
            options=provider_labels,
            index=provider_labels.index(st.session_state.selected_provider) if st.session_state.selected_provider in provider_labels else 0
        )
        st.session_state.selected_provider = selected_provider

        # Filter results by selected prompt and provider
        filtered_results = [
            r for r in results
            if r.get("prompt", {}).get("label") == selected_prompt
            and r.get("provider", {}).get("label") == selected_provider
        ]

        # Navigation
        st.divider()
        st.header("📍 Navigation")

        total_filtered = len(filtered_results)
        if total_filtered == 0:
            st.error("No results for this combination")
            return

        # Progress stats
        rated_count = sum(
            1 for r in filtered_results
            if get_annotation(annotations, eval_id, r.get("testIdx"), selected_prompt, selected_provider).get("rating", 0) > 0
        )
        st.metric("Progress", f"{rated_count}/{total_filtered} rated")

        # Navigation buttons
        col1, col2 = st.columns(2)
        with col1:
            if st.button("← Previous", use_container_width=True):
                if st.session_state.current_test_idx > 0:
                    st.session_state.current_test_idx -= 1
                    st.rerun()

        with col2:
            if st.button("Next →", use_container_width=True):
                if st.session_state.current_test_idx < total_filtered - 1:
                    st.session_state.current_test_idx += 1
                    st.rerun()

        # Jump to specific item
        st.divider()
        if total_filtered > 0:
            jump_to = st.selectbox(
                "Jump to item:",
                options=range(total_filtered),
                index=min(st.session_state.current_test_idx, total_filtered - 1),
                format_func=lambda x: f"#{x + 1} - {filtered_results[x].get('testCase', {}).get('vars', {}).get('prompt', 'Q')[:40]}..."
            )
            st.session_state.current_test_idx = jump_to

        # Export section
        st.divider()
        st.header("📥 Export")
        if st.button("Export to CSV", use_container_width=True):
            try:
                export_df = export_to_csv(promptfoo_data, annotations, "data/questions/30-real-questions.csv")
                csv_buffer = export_df.to_csv(index=False)
                st.download_button(
                    label="Download CSV",
                    data=csv_buffer,
                    file_name=f"eval_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                    mime="text/csv",
                    use_container_width=True
                )
            except Exception as e:
                st.error(f"Export error: {e}")

    # Main content
    if st.session_state.current_test_idx >= len(filtered_results):
        st.session_state.current_test_idx = len(filtered_results) - 1

    current_result = filtered_results[st.session_state.current_test_idx]
    test_idx = current_result.get("testIdx")
    test_vars = current_result.get("testCase", {}).get("vars", {})

    # Display current selection
    st.title("Review Results")
    st.caption(f"Test {st.session_state.current_test_idx + 1} of {len(filtered_results)}")

    # Create two-column layout
    left_col, right_col = st.columns([2, 1])

    with left_col:
        # Question
        st.write(test_vars.get("prompt", "N/A"))

        st.divider()

        # Model response
        response_output = current_result.get("response", {}).get("output", "No output")
        st.write(response_output)

        # Evaluation metrics
        with st.expander("📊 Evaluation Metrics", expanded=False):
            grading = current_result.get("gradingResult", {})
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Status", "✓ Pass" if grading.get("pass") else "✗ Fail")
            with col2:
                st.metric("Score", f"{grading.get('score', 0)}")
            with col3:
                st.metric("Latency", f"{current_result.get('latencyMs', 0)}ms")

            if grading.get("reason"):
                st.write(f"**Reason:** {grading.get('reason')}")

        # Metadata from CSV
        with st.expander("📌 Test Case Metadata", expanded=False):
            meta_col1, meta_col2 = st.columns(2)
            with meta_col1:
                if test_vars.get("Source"):
                    st.markdown(f"**Source:** {test_vars.get('Source')}")
                if test_vars.get("Bot current capability expectations; assuming we have Bot Guide correct, the Bot..."):
                    st.markdown(f"**Expected Capability:** {test_vars.get('Bot current capability expectations; assuming we have Bot Guide correct, the Bot...')}")

            with meta_col2:
                if test_vars.get("How good of a test for the Bot is this question?"):
                    st.markdown(f"**Test Difficulty:** {test_vars.get('How good of a test for the Bot is this question?')}")
                if test_vars.get("Applies to:"):
                    st.markdown(f"**Applies to:** {test_vars.get('Applies to:')}")

            if test_vars.get("JP Answer"):
                st.markdown("**Reference Answer:**")
                st.write(test_vars.get("JP Answer"))

            if test_vars.get("Notes"):
                st.markdown(f"**Notes:** {test_vars.get('Notes')}")

    with right_col:
        # Rating section
        st.subheader("⭐ Your Evaluation")

        # Get current annotation
        current_annotation = get_annotation(annotations, eval_id, test_idx, selected_prompt, selected_provider)
        current_rating = current_annotation.get("rating", 0)
        current_notes = current_annotation.get("notes", "")

        rating = st.slider(
            "Rating:",
            min_value=0,
            max_value=5,
            value=current_rating,
            step=1,
            help="0 = Not rated, 1 = Poor, 5 = Excellent"
        )

        rating_label = {
            0: "⏳ Not rated",
            1: "❌ Poor",
            2: "⚠️ Needs improvement",
            3: "✓ Acceptable",
            4: "✓✓ Good",
            5: "✓✓✓ Excellent"
        }
        st.write(f"**{rating_label.get(rating, '')}**")

        # Notes form
        with st.form(key="review_form"):
            notes = st.text_area(
                "Notes:",
                value=current_notes,
                height=150,
                placeholder="Add comments or observations..."
            )

            submit_button = st.form_submit_button(
                "💾 Save & Continue",
                use_container_width=True
            )

            if submit_button:
                # Save annotation
                set_annotation(
                    annotations,
                    eval_id,
                    test_idx,
                    selected_prompt,
                    selected_provider,
                    rating,
                    notes
                )
                save_annotations(annotations)
                st.success("✅ Saved!")

                # Move to next item
                if st.session_state.current_test_idx < len(filtered_results) - 1:
                    st.session_state.current_test_idx += 1
                    st.rerun()

    # Stats dashboard
    st.divider()
    st.subheader("📊 Stats")
    stats_col1, stats_col2, stats_col3, stats_col4 = st.columns(4)

    # Calculate stats for current filter
    all_ratings = [
        get_annotation(annotations, eval_id, r.get("testIdx"), selected_prompt, selected_provider).get("rating", 0)
        for r in filtered_results
    ]
    rated_items = sum(1 for r in all_ratings if r > 0)
    avg_rating = sum(all_ratings) / max(rated_items, 1) if rated_items > 0 else 0

    with stats_col1:
        st.metric("Rated", f"{rated_items}/{len(filtered_results)}")
    with stats_col2:
        st.metric("Average Rating", f"{avg_rating:.1f}" if rated_items > 0 else "N/A")
    with stats_col3:
        st.metric("Excellent (5)", sum(1 for r in all_ratings if r == 5))
    with stats_col4:
        st.metric("Poor (1)", sum(1 for r in all_ratings if r == 1))

if __name__ == "__main__":
    main()
