"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FlaskConical,
  GripVertical,
  Library,
  LoaderCircle,
  MessageSquare,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Papa from "papaparse";
import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type {
  ChatMessage,
  Collection,
  ExperimentRun,
  ModelOption,
  PromptVariant,
  TestCase,
  Workspace,
} from "@/lib/types";

type View = "playground" | "experiments" | "library";
type SaveState = "idle" | "saving" | "saved" | "error";

const uid = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const isoNow = () => new Date().toISOString();

async function readError(response: Response) {
  try {
    const payload = await response.json();
    return payload.error || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

async function generate(
  modelId: string,
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
) {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ modelId, systemPrompt, messages }),
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as { output: string; latencyMs: number };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  handler: (item: T, index: number) => Promise<R>,
) {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await handler(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export function Lab() {
  const [view, setView] = useState<View>("playground");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/workspace", { cache: "no-store" }).then(async (response) => {
        if (!response.ok) throw new Error(await readError(response));
        return (await response.json()) as Workspace;
      }),
      fetch("/api/models", { cache: "no-store" }).then(
        (response) => response.json() as Promise<ModelOption[]>,
      ),
    ])
      .then(([loadedWorkspace, loadedModels]) => {
        setWorkspace(loadedWorkspace);
        setModels(loadedModels);
      })
      .catch((error) => setNotice(error instanceof Error ? error.message : "Could not load app"));
  }, []);

  const persist = async (next: Workspace) => {
    setWorkspace(next);
    setSaveState("saving");
    try {
      const response = await fetch("/api/workspace", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!response.ok) throw new Error(await readError(response));
      setWorkspace((await response.json()) as Workspace);
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1200);
    } catch (error) {
      setSaveState("error");
      setNotice(error instanceof Error ? error.message : "Changes were not saved");
    }
  };

  if (!workspace) {
    return (
      <main className="loading-screen">
        <LoaderCircle className="spin" />
        <span>{notice || "Opening your workspace…"}</span>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setView("playground")}>
          <span className="brand-mark"><Sparkles size={17} /></span>
          <span>Entropy Lab</span>
          <span className="beta">BETA</span>
        </button>
        <nav aria-label="Primary navigation">
          <NavButton active={view === "playground"} onClick={() => setView("playground")} icon={<MessageSquare />}>
            Playground
          </NavButton>
          <NavButton active={view === "experiments"} onClick={() => setView("experiments")} icon={<FlaskConical />}>
            Experiments
          </NavButton>
          <NavButton active={view === "library"} onClick={() => setView("library")} icon={<Library />}>
            Library
          </NavButton>
        </nav>
        <div className={`save-state ${saveState}`}>
          {saveState === "saving" && <><LoaderCircle size={13} className="spin" /> Saving</>}
          {saveState === "saved" && <><Check size={13} /> Saved</>}
          {saveState === "error" && <>Save failed</>}
        </div>
      </header>

      {notice && (
        <div className="notice" role="alert">
          <span>{notice}</span>
          <button aria-label="Dismiss" onClick={() => setNotice(null)}><X size={16} /></button>
        </div>
      )}

      {view === "playground" && (
        <Playground
          workspace={workspace}
          models={models}
          persist={persist}
          openExperiments={() => setView("experiments")}
          setNotice={setNotice}
        />
      )}
      {view === "experiments" && (
        <Experiments workspace={workspace} models={models} persist={persist} setNotice={setNotice} />
      )}
      {view === "library" && (
        <LibraryView workspace={workspace} persist={persist} setNotice={setNotice} />
      )}
    </main>
  );
}

function NavButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button className={active ? "nav-button active" : "nav-button"} onClick={onClick}>
      {React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 16 })}
      {children}
    </button>
  );
}

function Playground({
  workspace,
  models,
  persist,
  openExperiments,
  setNotice,
}: {
  workspace: Workspace;
  models: ModelOption[];
  persist: (workspace: Workspace) => Promise<void>;
  openExperiments: () => void;
  setNotice: (notice: string | null) => void;
}) {
  const [draft, setDraft] = useState("");
  const [promptId, setPromptId] = useState(workspace.prompts[0]?.id ?? "");
  const [modelId, setModelId] = useState(models[0]?.id ?? "");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const messages = messagesRef.current;
    if (messages) messages.scrollTop = messages.scrollHeight;
  }, [workspace.messages]);

  const selectedPrompt = workspace.prompts.find((prompt) => prompt.id === promptId);
  const toggleCapture = () =>
    persist({ ...workspace, captureEnabled: !workspace.captureEnabled, updatedAt: isoNow() });

  const clearChat = () => {
    if (!workspace.messages.length || window.confirm("Clear this conversation? Saved test cases will remain.")) {
      void persist({ ...workspace, messages: [], updatedAt: isoNow() });
    }
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || sending || !selectedPrompt || !modelId) return;
    setDraft("");
    setSending(true);
    setNotice(null);
    const createdAt = isoNow();
    const userMessage: ChatMessage = { id: uid("message"), role: "user", content: text, createdAt };
    let next: Workspace = { ...workspace, messages: [...workspace.messages, userMessage], updatedAt: createdAt };

    if (workspace.captureEnabled) {
      const testCase: TestCase = {
        id: uid("case"),
        text,
        source: "playground",
        createdAt,
      };
      const inbox = workspace.collections.find((collection) => collection.id === "collection-inbox");
      next = {
        ...next,
        cases: [...next.cases, testCase],
        collections: next.collections.map((collection) =>
          collection.id === inbox?.id
            ? { ...collection, caseIds: [...collection.caseIds, testCase.id] }
            : collection,
        ),
      };
    }
    await persist(next);

    try {
      const result = await generate(
        modelId,
        selectedPrompt.content,
        next.messages.map(({ role, content }) => ({ role, content })),
      );
      const assistantMessage: ChatMessage = {
        id: uid("message"),
        role: "assistant",
        content: result.output,
        modelId,
        createdAt: isoNow(),
      };
      await persist({ ...next, messages: [...next.messages, assistantMessage], updatedAt: isoNow() });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not get a response");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="playground">
      <div className="view-heading compact-heading">
        <div>
          <p className="eyebrow">PLAYGROUND</p>
          <h1>Try the assistant. Keep the useful edge cases.</h1>
        </div>
        <button
          className={workspace.captureEnabled ? "capture-toggle on" : "capture-toggle off"}
          onClick={toggleCapture}
          aria-pressed={workspace.captureEnabled}
          data-testid="capture-toggle"
        >
          <span className="capture-dot" />
          <span>
            <strong>{workspace.captureEnabled ? "Saving inputs" : "Not saving inputs"}</strong>
            <small>{workspace.captureEnabled ? "New messages → Inbox" : "This chat stays out of evaluations"}</small>
          </span>
        </button>
      </div>

      <div className="playground-grid">
        <aside className="settings-panel">
          <div className="field">
            <label htmlFor="playground-prompt">Prompt variant</label>
            <select id="playground-prompt" value={promptId} onChange={(event) => setPromptId(event.target.value)}>
              {workspace.prompts.map((prompt) => <option value={prompt.id} key={prompt.id}>{prompt.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="playground-model">Model</label>
            <select id="playground-model" value={modelId} onChange={(event) => setModelId(event.target.value)}>
              {models.map((model) => <option value={model.id} key={model.id}>{model.name}</option>)}
            </select>
          </div>
          <div className="prompt-preview">
            <span>System prompt</span>
            <p>{selectedPrompt?.content}</p>
          </div>
          <button className="secondary full" onClick={openExperiments}>
            <FlaskConical size={15} /> Compare captured inputs
          </button>
        </aside>

        <div className="chat-panel">
          <div className="chat-toolbar">
            <span>{workspace.messages.length ? `${workspace.messages.filter((message) => message.role === "user").length} turns` : "New conversation"}</span>
            <button className="text-button" onClick={clearChat}><RotateCcw size={14} /> Clear</button>
          </div>
          <div className="messages" aria-live="polite" ref={messagesRef}>
            {!workspace.messages.length && (
              <div className="empty-chat">
                <span className="empty-icon"><MessageSquare /></span>
                <h2>Ask a real question</h2>
                <p>Every input is added to the Inbox by default, ready to compare across prompts and models.</p>
              </div>
            )}
            {workspace.messages.map((message) => (
              <article className={`message ${message.role}`} key={message.id}>
                <div className="message-meta">
                  <strong>{message.role === "user" ? "You" : "Assistant"}</strong>
                  {message.modelId && <span>{models.find((model) => model.id === message.modelId)?.name || message.modelId}</span>}
                </div>
                {message.role === "assistant" ? (
                  <div className="markdown"><ReactMarkdown>{message.content}</ReactMarkdown></div>
                ) : <p>{message.content}</p>}
              </article>
            ))}
            {sending && <div className="thinking"><LoaderCircle className="spin" size={16} /> Generating…</div>}
            <div ref={endRef} />
          </div>
          <div className="composer">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              placeholder="Ask a question…"
              rows={2}
              data-testid="chat-input"
            />
            <button className="send-button" disabled={!draft.trim() || sending || !modelId} onClick={() => void send()} aria-label="Send">
              <Send size={18} />
            </button>
            <span className="composer-hint">Enter to send · Shift+Enter for a new line</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Experiments({
  workspace,
  models,
  persist,
  setNotice,
}: {
  workspace: Workspace;
  models: ModelOption[];
  persist: (workspace: Workspace) => Promise<void>;
  setNotice: (notice: string | null) => void;
}) {
  const [collectionId, setCollectionId] = useState(workspace.collections[0]?.id ?? "");
  const [selectedPromptIds, setSelectedPromptIds] = useState<string[]>(workspace.prompts.slice(0, 2).map((prompt) => prompt.id));
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>(models.slice(0, 1).map((model) => model.id));
  const [quickAdd, setQuickAdd] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const selectedCollection = workspace.collections.find((collection) => collection.id === collectionId) ?? workspace.collections[0];
  const cases = (selectedCollection?.caseIds ?? [])
    .map((id) => workspace.cases.find((testCase) => testCase.id === id))
    .filter((testCase): testCase is TestCase => Boolean(testCase));
  const latestRun = workspace.runs[0];

  const updateCollection = (nextCaseIds: string[]) =>
    persist({
      ...workspace,
      collections: workspace.collections.map((collection) =>
        collection.id === selectedCollection?.id ? { ...collection, caseIds: nextCaseIds } : collection,
      ),
      updatedAt: isoNow(),
    });

  const addCases = async (texts: string[], source: TestCase["source"]) => {
    const clean = texts.map((text) => text.trim()).filter(Boolean);
    if (!clean.length || !selectedCollection) return;
    const createdAt = isoNow();
    const additions = clean.map<TestCase>((text) => ({ id: uid("case"), text, source, createdAt }));
    await persist({
      ...workspace,
      cases: [...workspace.cases, ...additions],
      collections: workspace.collections.map((collection) =>
        collection.id === selectedCollection.id
          ? { ...collection, caseIds: [...collection.caseIds, ...additions.map((item) => item.id)] }
          : collection,
      ),
      updatedAt: createdAt,
    });
    setQuickAdd("");
  };

  const importFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        let values: string[] = [];
        if (file.name.endsWith(".json") || file.name.endsWith(".jsonl")) {
          const parsed = file.name.endsWith(".jsonl")
            ? text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line))
            : JSON.parse(text);
          const rows = Array.isArray(parsed) ? parsed : parsed.prompts || parsed.cases || [];
          values = rows.map((row: unknown) =>
            typeof row === "string"
              ? row
              : String((row as Record<string, unknown>).prompt || (row as Record<string, unknown>).question || (row as Record<string, unknown>).input || ""),
          );
        } else if (file.name.endsWith(".csv")) {
          const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
          values = parsed.data.map((row) => row.prompt || row.question || row.input || Object.values(row)[0] || "");
        } else {
          values = text.split(/\r?\n/);
        }
        void addCases(values, "import");
      } catch (error) {
        setNotice(error instanceof Error ? `Import failed: ${error.message}` : "Import failed");
      }
    };
    reader.readAsText(file);
  };

  const removeCase = (id: string) => updateCollection(cases.map((item) => item.id).filter((caseId) => caseId !== id));
  const moveCase = (index: number, direction: -1 | 1) => {
    const ids = cases.map((item) => item.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    void updateCollection(ids);
  };

  const run = async () => {
    if (!cases.length || !selectedPromptIds.length || !selectedModelIds.length) return;
    const promptVariants = selectedPromptIds
      .map((id) => workspace.prompts.find((prompt) => prompt.id === id))
      .filter((prompt): prompt is PromptVariant => Boolean(prompt));
    const combinations = cases.flatMap((testCase) =>
      promptVariants.flatMap((prompt) =>
        selectedModelIds.map((modelId) => ({ testCase, prompt, modelId })),
      ),
    );
    setRunning(true);
    setProgress({ done: 0, total: combinations.length });
    setNotice(null);

    const results = await mapWithConcurrency(combinations, 4, async ({ testCase, prompt, modelId }) => {
      const id = uid("result");
      try {
        const generated = await generate(modelId, prompt.content, [{ role: "user", content: testCase.text }]);
        return { id, caseId: testCase.id, promptId: prompt.id, modelId, output: generated.output, latencyMs: generated.latencyMs };
      } catch (error) {
        return {
          id,
          caseId: testCase.id,
          promptId: prompt.id,
          modelId,
          output: "",
          latencyMs: 0,
          error: error instanceof Error ? error.message : "Generation failed",
        };
      } finally {
        setProgress((current) => ({ ...current, done: current.done + 1 }));
      }
    });
    const createdAt = isoNow();
    const experimentRun: ExperimentRun = {
      id: uid("run"),
      name: `${selectedCollection?.name || "Experiment"} · ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date())}`,
      createdAt,
      caseIds: cases.map((item) => item.id),
      promptIds: selectedPromptIds,
      modelIds: selectedModelIds,
      results,
    };
    await persist({ ...workspace, runs: [experimentRun, ...workspace.runs], updatedAt: createdAt });
    setRunning(false);
  };

  return (
    <section className="experiment-view">
      <div className="view-heading">
        <div>
          <p className="eyebrow">EXPERIMENTS</p>
          <h1>Compare every useful combination.</h1>
          <p>Pick cases, prompt variants, and models. Runs are named and saved automatically.</p>
        </div>
        <button
          className="primary run-button"
          disabled={!cases.length || !selectedPromptIds.length || !selectedModelIds.length || running}
          onClick={() => void run()}
          data-testid="run-experiment"
        >
          {running ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />}
          {running ? `${progress.done} / ${progress.total}` : `Run ${cases.length * selectedPromptIds.length * selectedModelIds.length} completions`}
        </button>
      </div>

      <div className="experiment-builder">
        <div className="builder-section cases-section">
          <div className="section-heading">
            <span className="step">1</span>
            <div><h2>Test cases</h2><p>{cases.length} in this set</p></div>
            <select value={collectionId} onChange={(event) => setCollectionId(event.target.value)} aria-label="Test set">
              {workspace.collections.map((collection) => <option value={collection.id} key={collection.id}>{collection.name}</option>)}
            </select>
          </div>
          <div className="quick-add">
            <textarea
              value={quickAdd}
              onChange={(event) => setQuickAdd(event.target.value)}
              placeholder={"Paste one test case per line…\nWhat should our expense policy include?\nHow do I hire in France?"}
              rows={4}
              data-testid="quick-add-cases"
            />
            <div>
              <button className="secondary" disabled={!quickAdd.trim()} onClick={() => void addCases(quickAdd.split(/\r?\n/), "manual")}>
                <Plus size={15} /> Add lines
              </button>
              <button className="text-button" onClick={() => fileRef.current?.click()}><Upload size={15} /> Import CSV, JSON, or text</button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.json,.jsonl,.txt"
                hidden
                onChange={(event) => event.target.files?.[0] && importFile(event.target.files[0])}
              />
            </div>
          </div>
          <div className="case-list">
            {cases.map((testCase, index) => (
              <div
                className="case-row"
                key={testCase.id}
                draggable
                onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  const from = Number(event.dataTransfer.getData("text/plain"));
                  const ids = cases.map((item) => item.id);
                  const [moved] = ids.splice(from, 1);
                  ids.splice(index, 0, moved);
                  void updateCollection(ids);
                }}
              >
                <GripVertical className="grip" size={16} />
                <span className="case-number">{index + 1}</span>
                <p>{testCase.text}</p>
                <div className="row-actions">
                  <button aria-label="Move up" disabled={index === 0} onClick={() => moveCase(index, -1)}><ArrowUp size={14} /></button>
                  <button aria-label="Move down" disabled={index === cases.length - 1} onClick={() => moveCase(index, 1)}><ArrowDown size={14} /></button>
                  <button aria-label="Remove from set" onClick={() => void removeCase(testCase.id)}><X size={14} /></button>
                </div>
              </div>
            ))}
            {!cases.length && <div className="empty-list">Paste cases above or capture them in the Playground.</div>}
          </div>
        </div>

        <div className="builder-options">
          <SelectorSection
            step="2"
            title="Prompt variants"
            subtitle={`${selectedPromptIds.length} selected`}
            options={workspace.prompts.map((prompt) => ({ id: prompt.id, label: prompt.name, detail: prompt.content }))}
            selected={selectedPromptIds}
            onChange={setSelectedPromptIds}
          />
          <SelectorSection
            step="3"
            title="Models"
            subtitle={`${selectedModelIds.length} selected`}
            options={models.map((model) => ({ id: model.id, label: model.name, detail: model.id }))}
            selected={selectedModelIds}
            onChange={setSelectedModelIds}
          />
          <div className="run-summary">
            <div><span>Cases</span><strong>{cases.length}</strong></div>
            <span>×</span>
            <div><span>Prompts</span><strong>{selectedPromptIds.length}</strong></div>
            <span>×</span>
            <div><span>Models</span><strong>{selectedModelIds.length}</strong></div>
            <span>=</span>
            <div className="total"><span>Completions</span><strong>{cases.length * selectedPromptIds.length * selectedModelIds.length}</strong></div>
          </div>
        </div>
      </div>

      {latestRun && (
        <ResultsMatrix
          run={latestRun}
          workspace={workspace}
          models={models}
          expanded={expandedResult}
          setExpanded={setExpandedResult}
        />
      )}
    </section>
  );
}

function SelectorSection({
  step,
  title,
  subtitle,
  options,
  selected,
  onChange,
}: {
  step: string;
  title: string;
  subtitle: string;
  options: Array<{ id: string; label: string; detail: string }>;
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <div className="builder-section selector-section">
      <div className="section-heading">
        <span className="step">{step}</span>
        <div><h2>{title}</h2><p>{subtitle}</p></div>
        <button className="text-button" onClick={() => onChange(selected.length === options.length ? [] : options.map((option) => option.id))}>
          {selected.length === options.length ? "Clear" : "Select all"}
        </button>
      </div>
      <div className="option-list">
        {options.map((option) => {
          const checked = selected.includes(option.id);
          return (
            <label className={checked ? "check-option checked" : "check-option"} key={option.id}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onChange(checked ? selected.filter((id) => id !== option.id) : [...selected, option.id])}
              />
              <span className="fake-check">{checked && <Check size={13} />}</span>
              <span><strong>{option.label}</strong><small>{option.detail}</small></span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function ResultsMatrix({
  run,
  workspace,
  models,
  expanded,
  setExpanded,
}: {
  run: ExperimentRun;
  workspace: Workspace;
  models: ModelOption[];
  expanded: string | null;
  setExpanded: (id: string | null) => void;
}) {
  const columns = run.promptIds.flatMap((promptId) =>
    run.modelIds.map((modelId) => ({ promptId, modelId })),
  );
  const exportRun = () => {
    const blob = new Blob([JSON.stringify(run, null, 2)], { type: "application/json" });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `${run.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  };
  return (
    <div className="results-section">
      <div className="results-heading">
        <div><p className="eyebrow">LATEST RUN</p><h2>{run.name}</h2><span>{run.results.length} completions · {run.results.filter((result) => result.error).length} errors</span></div>
        <button className="secondary" onClick={exportRun}><Download size={15} /> Export JSON</button>
      </div>
      <div className="matrix-wrap">
        <table className="results-matrix">
          <thead>
            <tr>
              <th>Test case</th>
              {columns.map((column) => (
                <th key={`${column.promptId}-${column.modelId}`}>
                  <strong>{workspace.prompts.find((prompt) => prompt.id === column.promptId)?.name}</strong>
                  <span>{models.find((model) => model.id === column.modelId)?.name || column.modelId}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {run.caseIds.map((caseId, index) => (
              <tr key={caseId}>
                <th><span>{index + 1}</span>{workspace.cases.find((item) => item.id === caseId)?.text || "Deleted test case"}</th>
                {columns.map((column) => {
                  const result = run.results.find(
                    (item) => item.caseId === caseId && item.promptId === column.promptId && item.modelId === column.modelId,
                  );
                  return (
                    <td key={`${column.promptId}-${column.modelId}`}>
                      {result && (
                        <button className={result.error ? "result-card error" : "result-card"} onClick={() => setExpanded(expanded === result.id ? null : result.id)}>
                          <span>{result.error || result.output}</span>
                          <small>{result.error ? "Failed" : `${(result.latencyMs / 1000).toFixed(1)}s`} {expanded === result.id ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</small>
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {expanded && (() => {
        const result = run.results.find((item) => item.id === expanded);
        if (!result) return null;
        return (
          <div className="result-detail">
            <div>
              <strong>{workspace.prompts.find((prompt) => prompt.id === result.promptId)?.name}</strong>
              <span> · {models.find((model) => model.id === result.modelId)?.name || result.modelId}</span>
            </div>
            <button className="text-button" onClick={() => navigator.clipboard.writeText(result.output)}><Copy size={14} /> Copy</button>
            <div className="markdown"><ReactMarkdown>{result.error || result.output}</ReactMarkdown></div>
          </div>
        );
      })()}
    </div>
  );
}

function LibraryView({
  workspace,
  persist,
  setNotice,
}: {
  workspace: Workspace;
  persist: (workspace: Workspace) => Promise<void>;
  setNotice: (notice: string | null) => void;
}) {
  const [tab, setTab] = useState<"prompts" | "sets" | "runs">("prompts");
  const [editing, setEditing] = useState<PromptVariant | null>(null);
  const [newCollection, setNewCollection] = useState("");
  const startPrompt = () => {
    const createdAt = isoNow();
    setEditing({ id: uid("prompt"), name: "Untitled prompt", content: "", createdAt, updatedAt: createdAt });
  };
  const savePrompt = async () => {
    if (!editing?.name.trim() || !editing.content.trim()) return;
    const exists = workspace.prompts.some((prompt) => prompt.id === editing.id);
    const nextPrompt = { ...editing, name: editing.name.trim(), content: editing.content.trim(), updatedAt: isoNow() };
    await persist({
      ...workspace,
      prompts: exists
        ? workspace.prompts.map((prompt) => prompt.id === editing.id ? nextPrompt : prompt)
        : [...workspace.prompts, nextPrompt],
      updatedAt: isoNow(),
    });
    setEditing(null);
  };
  const deletePrompt = async (id: string) => {
    if (workspace.prompts.length === 1) return setNotice("Keep at least one prompt variant.");
    if (!window.confirm("Delete this prompt variant? Existing run results will remain.")) return;
    await persist({ ...workspace, prompts: workspace.prompts.filter((prompt) => prompt.id !== id), updatedAt: isoNow() });
  };
  const addCollection = async () => {
    if (!newCollection.trim()) return;
    const collection: Collection = { id: uid("collection"), name: newCollection.trim(), caseIds: [], createdAt: isoNow() };
    await persist({ ...workspace, collections: [...workspace.collections, collection], updatedAt: isoNow() });
    setNewCollection("");
  };
  return (
    <section className="library-view">
      <div className="view-heading">
        <div><p className="eyebrow">LIBRARY</p><h1>Everything stays editable.</h1><p>Prompt variants, reusable test sets, and automatically saved runs.</p></div>
      </div>
      <div className="subnav">
        <button className={tab === "prompts" ? "active" : ""} onClick={() => setTab("prompts")}>Prompts <span>{workspace.prompts.length}</span></button>
        <button className={tab === "sets" ? "active" : ""} onClick={() => setTab("sets")}>Test sets <span>{workspace.collections.length}</span></button>
        <button className={tab === "runs" ? "active" : ""} onClick={() => setTab("runs")}>Runs <span>{workspace.runs.length}</span></button>
      </div>

      {tab === "prompts" && (
        <div className="library-content">
          <div className="library-toolbar"><h2>Prompt variants</h2><button className="primary" onClick={startPrompt}><Plus size={15} /> New prompt</button></div>
          <div className="prompt-grid">
            {workspace.prompts.map((prompt) => (
              <article className="prompt-card" key={prompt.id}>
                <div><h3>{prompt.name}</h3><span>Updated {new Date(prompt.updatedAt).toLocaleDateString()}</span></div>
                <p>{prompt.content}</p>
                <footer>
                  <button className="secondary" onClick={() => setEditing(prompt)}>Edit</button>
                  <button className="icon-danger" aria-label="Delete prompt" onClick={() => void deletePrompt(prompt.id)}><Trash2 size={15} /></button>
                </footer>
              </article>
            ))}
          </div>
        </div>
      )}
      {tab === "sets" && (
        <div className="library-content">
          <div className="library-toolbar">
            <h2>Test sets</h2>
            <div className="inline-create"><input value={newCollection} onChange={(event) => setNewCollection(event.target.value)} placeholder="New set name" /><button className="primary" onClick={() => void addCollection()}><Plus size={15} /> Add</button></div>
          </div>
          <div className="set-list">
            {workspace.collections.map((collection) => (
              <article key={collection.id}>
                <div><h3>{collection.name}</h3><span>{collection.caseIds.length} cases</span></div>
                <p>{collection.caseIds.slice(0, 3).map((id) => workspace.cases.find((item) => item.id === id)?.text).filter(Boolean).join(" · ") || "Empty set"}</p>
              </article>
            ))}
          </div>
        </div>
      )}
      {tab === "runs" && (
        <div className="library-content">
          <div className="library-toolbar"><h2>Saved runs</h2></div>
          <div className="run-list">
            {workspace.runs.map((run) => (
              <article key={run.id}>
                <div><h3>{run.name}</h3><span>{new Date(run.createdAt).toLocaleString()}</span></div>
                <div className="run-stats"><span>{run.caseIds.length} cases</span><span>{run.promptIds.length} prompts</span><span>{run.modelIds.length} models</span><strong>{run.results.length} completions</strong></div>
              </article>
            ))}
            {!workspace.runs.length && <div className="empty-list">Runs will appear here automatically.</div>}
          </div>
        </div>
      )}

      {editing && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setEditing(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Edit prompt" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-heading"><div><p className="eyebrow">PROMPT VARIANT</p><h2>{workspace.prompts.some((prompt) => prompt.id === editing.id) ? "Edit prompt" : "New prompt"}</h2></div><button aria-label="Close" onClick={() => setEditing(null)}><X /></button></div>
            <label>Name<input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></label>
            <label>System prompt<textarea rows={14} value={editing.content} onChange={(event) => setEditing({ ...editing, content: event.target.value })} placeholder="Tell the model how to respond…" /></label>
            <div className="modal-actions"><button className="secondary" onClick={() => setEditing(null)}>Cancel</button><button className="primary" disabled={!editing.name.trim() || !editing.content.trim()} onClick={() => void savePrompt()}>Save prompt</button></div>
          </div>
        </div>
      )}
    </section>
  );
}
