import { useState, useEffect, useRef, useCallback } from "react";

const POLL_INTERVAL_MS = 3000;
const TERMINAL = new Set(["success", "failed", "cancelled"]);

export function useTripoTask() {
  const [taskId, setTaskId] = useState(null);
  const [status, setStatus] = useState(null); // null | submitting | queued | running | success | failed | cancelled
  const [progress, setProgress] = useState(0);
  const [output, setOutput] = useState(null);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!taskId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/tripo/task/${taskId}`);
        if (!res.ok) throw new Error(`Poll returned ${res.status}`);
        const json = await res.json();
        const task = json.data;
        if (!task) throw new Error("Unexpected poll response shape");

        setStatus(task.status);
        if (typeof task.progress === "number") setProgress(task.progress);

        if (task.status === "success") {
          setOutput(task.output ?? null);
          clearInterval(intervalRef.current);
        } else if (TERMINAL.has(task.status)) {
          setError("Generation failed. Please try again.");
          clearInterval(intervalRef.current);
        }
      } catch (err) {
        setError(`Polling error: ${err.message}`);
        clearInterval(intervalRef.current);
      }
    };

    poll(); // fire immediately, then on interval
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [taskId]);

  const startTask = useCallback(async (body) => {
    clearInterval(intervalRef.current);
    setTaskId(null);
    setStatus("submitting");
    setProgress(0);
    setOutput(null);
    setError(null);

    try {
      const res = await fetch("/api/tripo/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      const id = json.data?.task_id;
      if (!id) throw new Error("No task_id in API response");
      setTaskId(id);
      setStatus("queued");
    } catch (err) {
      setError(err.message);
      setStatus("failed");
    }
  }, []);

  const reset = useCallback(() => {
    clearInterval(intervalRef.current);
    setTaskId(null);
    setStatus(null);
    setProgress(0);
    setOutput(null);
    setError(null);
  }, []);

  const isRunning =
    status === "submitting" || status === "queued" || status === "running";

  return { status, progress, output, error, isRunning, startTask, reset };
}
