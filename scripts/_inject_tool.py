"""Script d'injection penpot_agent_tool v0.5.0 dans Open WebUI (SQLite)."""
import sqlite3, json, time, ast

DB      = "/app/backend/data/webui.db"
TOOL_ID = "penpot_agent_tool"
USER_ID = "bd1d7626-185a-41a0-8fff-cb62eeb9bb6e"
SRC     = "/tmp/penpot_agent_tool.py"

PENPOT_TOKEN   = ("eyJhbGciOiJBMjU2S1ciLCJlbmMiOiJBMjU2R0NNIn0"
                  ".1DB04WA3A6UeKt_ijd6Eaf7j1UgxbbcIigVyAMAJIJsqcn30sizaaA"
                  ".XsWqhZdFBeQwZSF_"
                  ".aP9GDzuQY1d6L2SrblgP5NG9ZvHbQ7xbOsMLKlxNlXvMXnRS9Pwe8ftu5Vh6"
                  "-z7nnd3j6OQALlEMVpQss7bsxI6qCakUZh4TvXUZRVQl2dpdzrgnYCvz"
                  "-HIPXdgez-DjvJbXA4xG8oLHwzzQ7TCKgDjSSAnmbarmg0vYCHuLvrq5D1Sq9K"
                  "GbtP281oMkEfWul629XABLtzAd.gHQ6JQayWT5JnF880RBbbg")
PENPOT_BACKEND = "http://penpot-backend.penpot.svc.cluster.local:6060"
CONTEXT_PATH   = "/data/sharepoint/Service-Marketing"

# 1. Lire le script
with open(SRC) as f:
    content = f.read()
print(f"[1] Chargé : {len(content)} chars")
assert "Optional" not in content, "ABORT: Optional trouvé"
# timeout est soit dans le tool soit dans le service (architecture sidecar)
assert "timeout=" in content or "timeout" in content, "ABORT: timeout absent"
print("[1] ✓ Validations OK")

# 2. Specs pour execute_action uniquement (une seule fonction publique)
tree = ast.parse(content)
TYPE_MAP = {"str": "string", "int": "integer", "float": "number", "bool": "boolean"}
specs = []

for node in ast.walk(tree):
    if not isinstance(node, ast.ClassDef) or node.name != "Tools":
        continue
    for item in node.body:
        if not isinstance(item, ast.FunctionDef):
            continue
        fname = item.name
        if fname.startswith("_") or fname == "__init__":
            continue

        docstring = ast.get_docstring(item) or ""

        # Description : tout avant "Args:"
        desc_parts, arg_descs, in_args = [], {}, False
        for line in docstring.split("\n"):
            s = line.strip()
            if s == "Args:":        in_args = True;  continue
            if s in ("Returns:", "Raises:"): in_args = False; continue
            if in_args and s and ":" in s:
                k, _, v = s.partition(":")
                if k.strip().replace("_","").isalnum():
                    arg_descs[k.strip()] = v.strip()
            elif not in_args and s:
                desc_parts.append(s)
        description = " ".join(desc_parts).strip()

        # Params
        raw_args = [a for a in item.args.args if a.arg != "self"]
        n_defs   = len(item.args.defaults)
        n_args   = len(raw_args)
        req_cut  = n_args - n_defs
        props, required = {}, []

        for idx, arg in enumerate(raw_args):
            aname = arg.arg
            atype = "string"
            if arg.annotation:
                try:
                    atype = TYPE_MAP.get(ast.unparse(arg.annotation), "string")
                except Exception:
                    pass
            prop = {"type": atype}
            if aname in arg_descs:
                prop["description"] = arg_descs[aname]
            if idx < req_cut:
                required.append(aname)
            props[aname] = prop

        specs.append({
            "type": "function",
            "function": {
                "name": fname,
                "description": description,
                "parameters": {"type": "object", "properties": props, "required": required},
            },
        })
        print(f"[2] {fname:25s}  required={required}")

print(f"[2] ✓ {len(specs)} fonction(s) exposée(s)")

# 3. Injection
meta   = json.dumps({
    "description": "Agent Penpot intelligent : résolution projet par nom, contexte UX, création designs.",
    "manifest": {"title": "Penpot Agent Tool", "author": "neokube-beta",
                 "version": "0.5.0", "license": "MIT", "requirements": "requests"},
})
valves = json.dumps({
    "PENPOT_TOKEN":   PENPOT_TOKEN,
    "PENPOT_BACKEND": PENPOT_BACKEND,
    "CONTEXT_PATH":   CONTEXT_PATH,
})
now = int(time.time())

conn = sqlite3.connect(DB)
cur  = conn.cursor()
cur.execute("DELETE FROM tool WHERE id=?", (TOOL_ID,))
deleted = cur.rowcount
cur.execute(
    "INSERT INTO tool (id, user_id, name, content, specs, meta, valves, created_at, updated_at) "
    "VALUES (?,?,?,?,?,?,?,?,?)",
    (TOOL_ID, USER_ID, "Penpot Agent Tool", content,
     json.dumps(specs), meta, valves, now, now),
)
conn.commit()
cur.execute("SELECT id, name, updated_at FROM tool WHERE id=?", (TOOL_ID,))
print(f"[3] ✓ Injecté : {cur.fetchone()}")
conn.close()
print("[OK] Injection v0.5.0 terminée.")
