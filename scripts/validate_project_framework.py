#!/usr/bin/env python3
"""Validate GEOEval's adopted AI-native project framework."""

from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SKILLS_DIR = ROOT / ".agents" / "skills"
CATALOG = ROOT / ".agents" / "skill-catalog.yaml"
FORBIDDEN_SKILL_FILES = {
    "README.md",
    "INSTALLATION_GUIDE.md",
    "QUICK_REFERENCE.md",
    "CHANGELOG.md",
}
VERSION_COPY_SUFFIX = re.compile(
    r"(?:[-_](?:v[0-9]+|new|final|latest|copy))$",
    re.IGNORECASE,
)
ISSUE_BRANCH_NAME = re.compile(r"^codex/issue-[0-9]+-[a-z0-9][a-z0-9-]*$")
QUOTED_BRANCH = re.compile(r"`(codex/[^`]+)`")
COMPLETED_ACTIVE_STATUS = re.compile(
    r"(?mi)^- Status:.*\b(?:completed|archived)\b"
)
ALLOWED_INVOCATIONS = {"implicit", "explicit"}
ALLOWED_WORKFLOW_GROUPS = {"route", "shape", "deliver", "maintain", "learn"}
CATALOG_VERSION = 2
LOCAL_LINK_EXCLUDED_PARTS = {
    ".foundation-evidence",
    ".git",
    ".next",
    ".pnpm-store",
    "build",
    "coverage",
    "dist",
    "node_modules",
}


def parse_frontmatter(path: Path) -> dict[str, str]:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        return {}
    try:
        block = text.split("---\n", 2)[1]
    except IndexError:
        return {}
    fields: dict[str, str] = {}
    for line in block.splitlines():
        match = re.match(r"^([a-zA-Z0-9_-]+):\s*(.+?)\s*$", line)
        if match:
            fields[match.group(1)] = match.group(2).strip('"\'')
    return fields


def catalog_names() -> list[str]:
    text = CATALOG.read_text(encoding="utf-8")
    return re.findall(r"^\s{2}- name:\s*([a-z0-9-]+)\s*$", text, re.MULTILINE)


def catalog_version() -> int | None:
    text = CATALOG.read_text(encoding="utf-8")
    match = re.search(r"(?m)^version:\s*(\d+)\s*$", text)
    return int(match.group(1)) if match else None


def catalog_field_values(field: str) -> dict[str, list[str]]:
    text = CATALOG.read_text(encoding="utf-8")
    records: dict[str, list[str]] = {}
    for block in re.split(r"(?m)^  - name:\s*", text)[1:]:
        lines = block.splitlines()
        name = lines[0].strip()
        records[name] = re.findall(
            rf"(?m)^    {re.escape(field)}:\s*(\S+)\s*$",
            block,
        )
    return records


def validate_skills(errors: list[str]) -> None:
    names = catalog_names()
    invocations = catalog_field_values("invocation")
    workflow_groups = catalog_field_values("workflow_group")
    catalog_paths = catalog_field_values("path")
    if catalog_version() != CATALOG_VERSION:
        errors.append(
            "skill-catalog.yaml version must be "
            f"{CATALOG_VERSION}; got {catalog_version()!r}"
        )
    if len(names) != len(set(names)):
        errors.append("skill-catalog.yaml contains duplicate skill names")

    for name in names:
        values = invocations.get(name, [])
        if len(values) != 1:
            errors.append(
                "skill-catalog.yaml skill "
                f"{name} must declare exactly one invocation; found {len(values)}"
            )
        elif values[0] not in ALLOWED_INVOCATIONS:
            errors.append(
                "skill-catalog.yaml skill "
                f"{name} invocation must be implicit or explicit; got {values[0]!r}"
            )

        groups = workflow_groups.get(name, [])
        if len(groups) != 1:
            errors.append(
                "skill-catalog.yaml skill "
                f"{name} must declare exactly one workflow_group; found {len(groups)}"
            )
        elif groups[0] not in ALLOWED_WORKFLOW_GROUPS:
            errors.append(
                "skill-catalog.yaml skill "
                f"{name} has unsupported workflow_group {groups[0]!r}"
            )

        paths = catalog_paths.get(name, [])
        expected_path = f"skills/{name}"
        if paths != [expected_path]:
            errors.append(
                "skill-catalog.yaml skill "
                f"{name} path must be {expected_path!r}; got {paths}"
            )

    directories = sorted(path for path in SKILLS_DIR.iterdir() if path.is_dir())
    directory_names = [path.name for path in directories]
    if sorted(names) != directory_names:
        errors.append(
            "catalog and skill directories differ: "
            f"catalog={sorted(names)}, directories={directory_names}"
        )

    catalog_text = CATALOG.read_text(encoding="utf-8")
    known_names = set(names)
    for block in re.split(r"(?m)^  - name:\s*", catalog_text)[1:]:
        lines = block.splitlines()
        name = lines[0].strip()
        dependency_block = re.search(
            r"(?ms)^    dependencies:\s*(.*?)(?=^  - name:|\Z)",
            "    dependencies:" + block.split("    dependencies:", 1)[1]
            if "    dependencies:" in block
            else "",
        )
        if not dependency_block:
            continue
        dependencies = re.findall(r"(?m)^      -\s*([a-z0-9-]+)\s*$", dependency_block.group(1))
        for dependency in dependencies:
            if dependency not in known_names:
                errors.append(
                    f"skill-catalog.yaml skill {name} has unknown dependency {dependency}"
                )

    for skill_dir in directories:
        skill_file = skill_dir / "SKILL.md"
        if not skill_file.is_file():
            errors.append(f"{skill_dir.relative_to(ROOT)} is missing SKILL.md")
            continue

        fields = parse_frontmatter(skill_file)
        if fields.get("name") != skill_dir.name:
            errors.append(
                f"{skill_file.relative_to(ROOT)} name does not match its directory"
            )
        description = fields.get("description", "")
        if len(description) < 40:
            errors.append(f"{skill_file.relative_to(ROOT)} has a weak description")
        if "TODO" in skill_file.read_text(encoding="utf-8"):
            errors.append(f"{skill_file.relative_to(ROOT)} contains TODO content")
        if len(skill_file.read_text(encoding="utf-8").splitlines()) > 500:
            errors.append(f"{skill_file.relative_to(ROOT)} exceeds 500 lines")

        forbidden = FORBIDDEN_SKILL_FILES.intersection(
            path.name for path in skill_dir.iterdir() if path.is_file()
        )
        if forbidden:
            errors.append(
                f"{skill_dir.relative_to(ROOT)} contains forbidden files: {sorted(forbidden)}"
            )

        ui_file = skill_dir / "agents" / "openai.yaml"
        if not ui_file.is_file():
            errors.append(f"{skill_dir.relative_to(ROOT)} is missing agents/openai.yaml")
        else:
            ui_text = ui_file.read_text(encoding="utf-8")
            if f"${skill_dir.name}" not in ui_text:
                errors.append(
                    f"{ui_file.relative_to(ROOT)} default prompt must mention ${skill_dir.name}"
                )
            short_description = re.search(
                r'(?m)^\s{2}short_description:\s*["\'](.+)["\']\s*$', ui_text
            )
            if not short_description or not 25 <= len(short_description.group(1)) <= 64:
                errors.append(
                    f"{ui_file.relative_to(ROOT)} short_description must be 25-64 characters"
                )

            policy_values = re.findall(
                r"(?m)^\s{2}allow_implicit_invocation:\s*(\S+)\s*$",
                ui_text,
            )
            if len(policy_values) != 1:
                errors.append(
                    f"{ui_file.relative_to(ROOT)} must declare exactly one "
                    "policy.allow_implicit_invocation boolean"
                )
            elif policy_values[0] not in {"true", "false"}:
                errors.append(
                    f"{ui_file.relative_to(ROOT)} policy.allow_implicit_invocation "
                    "must be the unquoted boolean true or false; "
                    f"got {policy_values[0]!r}"
                )
            else:
                invocation_values = invocations.get(skill_dir.name, [])
                if (
                    len(invocation_values) == 1
                    and invocation_values[0] in ALLOWED_INVOCATIONS
                ):
                    invocation = invocation_values[0]
                    expected_policy = invocation == "implicit"
                    actual_policy = policy_values[0] == "true"
                    if actual_policy != expected_policy:
                        errors.append(
                            f"{ui_file.relative_to(ROOT)} catalog invocation="
                            f"{invocation} requires policy.allow_implicit_invocation="
                            f"{str(expected_policy).lower()}"
                        )


def validate_local_links(errors: list[str]) -> None:
    pattern = re.compile(r"(?<!!)\[[^\]]+\]\(([^)]+)\)")
    for markdown in ROOT.rglob("*.md"):
        if LOCAL_LINK_EXCLUDED_PARTS.intersection(markdown.relative_to(ROOT).parts):
            continue
        text = markdown.read_text(encoding="utf-8")
        for target in pattern.findall(text):
            target = target.strip().split("#", 1)[0]
            if not target or target.startswith(("http://", "https://", "mailto:")):
                continue
            resolved = (markdown.parent / target).resolve()
            if not resolved.exists():
                errors.append(
                    f"{markdown.relative_to(ROOT)} has broken local link: {target}"
                )


def validate_current_document_names(errors: list[str]) -> None:
    for base in (
        ROOT / "docs" / "product",
        ROOT / "docs" / "architecture",
        ROOT / "docs" / "process",
    ):
        if not base.is_dir():
            continue
        for markdown in base.rglob("*.md"):
            if "adr" in markdown.relative_to(base).parts:
                continue
            if VERSION_COPY_SUFFIX.search(markdown.stem):
                errors.append(
                    f"{markdown.relative_to(ROOT)} looks like a version-copy current document; "
                    "update, move, merge, or delete the canonical owner instead"
                )


def validate_tracking_templates(errors: list[str]) -> None:
    issue_templates = ROOT / ".github" / "ISSUE_TEMPLATE"
    required_issue_templates = {
        "change.yml": [
            "GEOEval Delivery",
            "id: problem",
            "id: actual",
            "id: outcome",
            "id: scope",
            "id: acceptance",
            "id: readiness",
            "type: checkboxes",
        ],
        "delivery-slice.yml": [
            "GEOEval Delivery",
            "id: parent",
            "id: outcome",
            "id: acceptance",
            "id: readiness",
            "type: checkboxes",
        ],
        "bug.yml": [
            "GEOEval Delivery",
            "id: problem",
            "id: actual",
            "id: expected",
            "id: reproduction",
            "id: readiness",
            "type: checkboxes",
        ],
    }
    for name, markers in required_issue_templates.items():
        path = issue_templates / name
        if not path.is_file():
            errors.append(f"missing required Issue template: {path.relative_to(ROOT)}")
            continue
        body = path.read_text(encoding="utf-8")
        for marker in markers:
            if marker not in body:
                errors.append(
                    f"{path.relative_to(ROOT)} is missing tracking marker {marker!r}"
                )

    issue_config = issue_templates / "config.yml"
    if not issue_config.is_file():
        errors.append("missing .github/ISSUE_TEMPLATE/config.yml")
    elif "blank_issues_enabled: false" not in issue_config.read_text(encoding="utf-8"):
        errors.append(".github/ISSUE_TEMPLATE/config.yml must disable blank issues")

    pr_template = ROOT / ".github" / "PULL_REQUEST_TEMPLATE.md"
    if not pr_template.is_file():
        errors.append("missing .github/PULL_REQUEST_TEMPLATE.md")
    else:
        body = pr_template.read_text(encoding="utf-8")
        for marker in (
            "## Implementation（实现说明）",
            "## Evidence（验收与证据）",
            "## Tests & Specs（测试与当前态影响）",
            "## Lifecycle（生命周期）",
            "## Merge Checklist",
            "Merge target / topology",
            "Closes #<owning-issue>",
            "Part of #<owning-issue> — does not close",
            "Review Gate #<issue>",
            "合并到默认分支后应立即关闭",
            "Base / stack 变化",
            "已请求的 Review 已完成",
        ):
            if marker not in body:
                errors.append(
                    f".github/PULL_REQUEST_TEMPLATE.md is missing {marker!r}"
                )

    workflows = {
        "validate-ai-framework.yml": ("name: AI Native 项目框架 CI", "python3 scripts/validate_project_framework.py"),
        "validate-project.yml": ("name: 完整项目 CI", "pnpm db:generate", "pnpm --filter @geoeval/backend test", "pnpm --filter @geoeval/web test", "pnpm build"),
    }
    workflow_dir = ROOT / ".github" / "workflows"
    for name, markers in workflows.items():
        path = workflow_dir / name
        if not path.is_file():
            errors.append(f"missing required workflow: {path.relative_to(ROOT)}")
            continue
        body = path.read_text(encoding="utf-8")
        for marker in markers:
            if marker not in body:
                errors.append(
                    f"{path.relative_to(ROOT)} is missing workflow marker {marker!r}"
                )


def validate_change_lifecycle(errors: list[str]) -> None:
    changes = ROOT / "openspec" / "changes"
    for change_dir in sorted(path for path in changes.iterdir() if path.is_dir()):
        if change_dir.name == "archive":
            continue

        proposal = change_dir / "proposal.md"
        tasks = change_dir / "tasks.md"
        if not proposal.is_file():
            errors.append(
                f"active change {change_dir.relative_to(ROOT)} is missing proposal.md"
            )
            continue
        if not tasks.is_file():
            errors.append(
                f"active change {change_dir.relative_to(ROOT)} is missing tasks.md"
            )

        body = proposal.read_text(encoding="utf-8")
        if COMPLETED_ACTIVE_STATUS.search(body):
            errors.append(
                f"active change {change_dir.relative_to(ROOT)} declares a completed "
                "or archived status; reconcile and move it under archive/"
            )
        if "/private/tmp/" in body or re.search(r"/Users/[^\s`]+", body):
            errors.append(
                f"active change {change_dir.relative_to(ROOT)} contains a machine-local "
                "workspace path; use the Issue branch and live workspace state"
            )
        for branch in QUOTED_BRANCH.findall(body):
            if not ISSUE_BRANCH_NAME.fullmatch(branch):
                errors.append(
                    f"active change {change_dir.relative_to(ROOT)} references non-Issue "
                    f"branch {branch!r}"
                )

    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    for branch in QUOTED_BRANCH.findall(readme):
        if not ISSUE_BRANCH_NAME.fullmatch(branch):
            errors.append(f"README.md references non-Issue branch {branch!r}")

    planning_markers = {
        ROOT / "AGENTS.md": "GEOEval Delivery",
        ROOT / "docs" / "process" / "change-tracking.md": "GEOEval Delivery",
        ROOT / ".github" / "PULL_REQUEST_TEMPLATE.md": "Project Status",
    }
    for path, marker in planning_markers.items():
        if marker not in path.read_text(encoding="utf-8"):
            errors.append(
                f"{path.relative_to(ROOT)} is missing planning marker {marker!r}"
            )


def main() -> int:
    errors: list[str] = []
    required = [
        ROOT / "README.md",
        ROOT / "AGENTS.md",
        ROOT / "CHANGELOG.md",
        ROOT / "docs" / "process" / "operating-principles.md",
        ROOT / "docs" / "process" / "design-knowledge.md",
        ROOT / "docs" / "process" / "change-tracking.md",
        ROOT / "docs" / "templates" / "design-contract.md",
        ROOT / "docs" / "product" / "vision.md",
        ROOT / "docs" / "product" / "glossary.md",
        ROOT / "docs" / "architecture" / "overview.md",
        ROOT / "openspec" / "README.md",
        ROOT / "openspec" / "specs" / "project-governance" / "spec.md",
        ROOT
        / "openspec"
        / "specs"
        / "product-definition"
        / "spec.md",
        CATALOG,
    ]
    for path in required:
        if not path.is_file():
            errors.append(f"missing required file: {path.relative_to(ROOT)}")

    if not errors:
        validate_skills(errors)
        validate_local_links(errors)
        validate_current_document_names(errors)
        validate_tracking_templates(errors)
        validate_change_lifecycle(errors)

    if errors:
        print("Project framework validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("Project framework validation passed.")
    print(f"Validated {len(catalog_names())} cataloged skills and local Markdown links.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
