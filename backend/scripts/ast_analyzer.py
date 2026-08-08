"""
ast_analyzer.py
Reads Python source code from stdin, walks the AST to estimate:
  - Time complexity  (loop nesting depth, recursion)
  - Space complexity (data structure allocations, recursion stack)

Usage:
    echo "...code..." | python ast_analyzer.py
"""
import sys
import ast
import json


# ── Time complexity helpers ──────────────────────────────────────────────────

def get_loop_depth_inner(node, depth):
    max_depth = depth
    for child in ast.iter_child_nodes(node):
        if isinstance(child, (ast.For, ast.While)):
            child_depth = get_loop_depth_inner(child, depth + 1)
            max_depth = max(max_depth, child_depth)
    return max_depth


def has_recursion(tree):
    """Simple single-function recursion detection."""
    for func_def in ast.walk(tree):
        if not isinstance(func_def, ast.FunctionDef):
            continue
        for node in ast.walk(func_def):
            if isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name) and node.func.id == func_def.name:
                    return True
    return False


def estimate_time_complexity(max_loop_depth, recursive):
    if recursive:
        if max_loop_depth == 0:
            return "O(2^n)"    # naive exponential recursion
        return "O(n log n)"    # recursion + looping
    if max_loop_depth == 0:
        return "O(1)"
    if max_loop_depth == 1:
        return "O(n)"
    if max_loop_depth == 2:
        return "O(n²)"
    if max_loop_depth == 3:
        return "O(n³)"
    return f"O(n^{max_loop_depth})"


# ── Space complexity helpers ─────────────────────────────────────────────────

def count_growing_structures(tree):
    """
    Count AST nodes that indicate memory growing with input:
      - List / Dict / Set / Tuple literals assigned inside loops
      - List comprehensions, dict comprehensions, generator expressions
      - .append() / .extend() / .add() calls inside loops
    Returns a score used to classify space usage.
    """
    score = 0
    loop_nodes = set()

    # Collect all loop nodes
    for node in ast.walk(tree):
        if isinstance(node, (ast.For, ast.While)):
            loop_nodes.add(id(node))

    for node in ast.walk(tree):
        # List / dict / set comprehensions always allocate O(n) minimum
        if isinstance(node, (ast.ListComp, ast.DictComp, ast.SetComp)):
            score += 2
        # Generator expression — lazy, O(1)
        elif isinstance(node, ast.GeneratorExp):
            score += 0
        # .append() / .extend() / .add() — grows a collection
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Attribute):
                if node.func.attr in ('append', 'extend', 'add', 'insert', 'update'):
                    score += 1
        # Direct list/dict/set literal with content
        elif isinstance(node, (ast.List, ast.Dict, ast.Set)):
            if getattr(node, 'elts', None) or getattr(node, 'keys', None):
                score += 1

    return score


def estimate_space_complexity(max_loop_depth, recursive, structure_score):
    """
    Heuristic space complexity estimation:
    - Recursion adds O(n) or O(log n) stack space
    - Growing data structures add O(n) or O(n²) heap space
    - Nested structure allocation inside nested loops → O(n²)
    """
    if recursive:
        if max_loop_depth >= 2 or structure_score >= 3:
            return "O(n²)"
        if structure_score >= 1:
            return "O(n)"
        # Binary-search style recursion is typically O(log n) stack
        return "O(n)"  # conservative: assume linear stack depth

    if structure_score == 0 and max_loop_depth <= 1:
        return "O(1)"
    if structure_score >= 3 and max_loop_depth >= 2:
        return "O(n²)"
    if structure_score >= 1 or max_loop_depth >= 1:
        return "O(n)"

    return "O(1)"


# ── Main analysis ─────────────────────────────────────────────────────────────

def analyze(source_code):
    try:
        tree = ast.parse(source_code)
    except SyntaxError as e:
        return {
            "timeComplexity":  "Unknown",
            "spaceComplexity": "Unknown",
            "maxLoopDepth":    0,
            "recursive":       False,
            "error":           str(e),
        }

    max_loop_depth  = get_loop_depth_inner(tree, 0)
    recursive       = has_recursion(tree)
    structure_score = count_growing_structures(tree)

    time_complexity  = estimate_time_complexity(max_loop_depth, recursive)
    space_complexity = estimate_space_complexity(max_loop_depth, recursive, structure_score)

    return {
        "timeComplexity":   time_complexity,
        "spaceComplexity":  space_complexity,
        "maxLoopDepth":     max_loop_depth,
        "recursive":        recursive,
        "structureScore":   structure_score,
    }


if __name__ == "__main__":
    source = sys.stdin.read()
    result = analyze(source)
    print(json.dumps(result))
