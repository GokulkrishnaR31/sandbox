"""
trace_runner.py
Executes Python code with sys.settrace, capturing variable state at each line.
Reads source code from stdin, outputs a JSON array of execution steps to stdout.

Usage:
    echo "...code..." | python trace_runner.py

Each step:
{
  "line": 5,
  "event": "line",
  "locals": { "x": 10, "arr": [1, 2, 3] }
}
"""
import sys
import json
import copy
import io
import traceback

MAX_STEPS = 500   # Safety limit to prevent infinite-loop traces
SAFE_REPR_LIMIT = 200  # Max chars for any single variable repr


def safe_repr(value):
    """Convert a value to a short, JSON-safe string representation."""
    try:
        r = repr(value)
        if len(r) > SAFE_REPR_LIMIT:
            r = r[:SAFE_REPR_LIMIT] + '...'
        return r
    except Exception:
        return '<unrepresentable>'


def make_safe_locals(local_vars):
    """Filter and serialize local variables, skipping built-ins and modules."""
    result = {}
    for k, v in local_vars.items():
        if k.startswith('__'):
            continue
        if callable(v) and not isinstance(v, (int, float, str, bool, list, dict, tuple, set)):
            continue
        try:
            # Attempt JSON serialization first for clean output
            json.dumps(v)
            result[k] = v
        except (TypeError, ValueError):
            result[k] = safe_repr(v)
    return result


def run_with_trace(source_code):
    steps = []
    step_count = [0]

    def tracer(frame, event, arg):
        if step_count[0] >= MAX_STEPS:
            return None   # Stop tracing
        if event in ('line', 'return', 'exception'):
            step = {
                'line':   frame.f_lineno,
                'event':  event,
                'locals': make_safe_locals(dict(frame.f_locals)),
            }
            if event == 'exception' and arg:
                step['exception'] = str(arg[1])
            steps.append(step)
            step_count[0] += 1
        return tracer

    # Capture stdout from the student's code
    captured_stdout = io.StringIO()
    old_stdout = sys.stdout
    sys.stdout = captured_stdout

    namespace = {}
    error = None

    try:
        code_obj = compile(source_code, '<student_code>', 'exec')
        sys.settrace(tracer)
        exec(code_obj, namespace)
    except Exception as e:
        error = traceback.format_exc()
    finally:
        sys.settrace(None)
        sys.stdout = old_stdout

    return {
        'steps':  steps,
        'output': captured_stdout.getvalue(),
        'error':  error,
    }


if __name__ == '__main__':
    source = sys.stdin.read()
    result = run_with_trace(source)
    print(json.dumps(result))
