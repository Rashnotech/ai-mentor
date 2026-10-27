"""Read the literal survey registry without importing application dependencies."""
import ast
import json
import sys

module = ast.parse(sys.stdin.read())
registries = [
    node.value for node in module.body
    if isinstance(node, (ast.Assign, ast.AnnAssign))
    and any(isinstance(target, ast.Name) and target.id == 'DEFAULT_SURVEYS'
            for target in (node.targets if isinstance(node, ast.Assign) else [node.target]))
]
if len(registries) != 1:
    raise ValueError('Expected exactly one DEFAULT_SURVEYS declaration')
print(json.dumps(ast.literal_eval(registries[0])))
