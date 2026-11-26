"""Read-only release checks for Fatfish Notes. See docs/release-sop.zh.md."""

import argparse
import gzip
import hashlib
import io
import json
import re
import shutil
import stat
import subprocess
import sys
import tarfile
import tempfile
import zlib
from pathlib import Path


PACKAGE = "dsh-fatfish-notes"
FIXED_NAME = f"{PACKAGE}.tgz"


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def read_archive(path):
    data = path.read_bytes()
    files = {}
    manifest = None
    with gzip.GzipFile(fileobj=io.BytesIO(data)) as stream:
        with tarfile.open(fileobj=stream, mode="r|") as archive:
            for member in archive:
                if member.name == "package" and member.isdir():
                    continue
                prefix, _, name = member.name.partition("/")
                if (prefix != "package" or ":" in name or "\\" in name
                        or any(part in ("", ".", "..") for part in name.split("/"))):
                    raise ValueError(f"{path}: invalid package path {member.name!r}")
                if member.isdir():
                    continue
                if not member.isfile() or name in files:
                    raise ValueError(f"{path}: duplicate or non-regular file {name!r}")
                content = archive.extractfile(member).read()
                files[name] = sha256(content)
                if name == "package.json":
                    manifest = json.loads(content)
        # Read the gzip trailer even when tar ends before the compressed stream.
        while stream.read(1024 * 1024):
            pass
    if not isinstance(manifest, dict) or manifest.get("name") != PACKAGE:
        raise ValueError(f"{path}: expected package.json for {PACKAGE}")
    version = manifest.get("version")
    if not isinstance(version, str) or not re.fullmatch(r"[0-9A-Za-z.+-]+", version):
        raise ValueError(f"{path}: invalid package.json version {version!r}")
    print(f"{path} ({version}): {len(files)} files, {len(data)} bytes, SHA-256 {sha256(data)}")
    return data, version, files


def workspace_files(root):
    # Let npm decide what it packs, including default files, globs and ignore rules.
    npm = shutil.which("npm")
    if not npm:
        raise ValueError("npm executable not found")
    # Some npm versions cache the preview tarball even in dry-run mode.
    with tempfile.TemporaryDirectory(prefix="fatfish-pack-cache-") as cache:
        command = [npm, "pack", ".", "--dry-run", "--ignore-scripts", "--offline",
                   "--json", "--logs-max=0", "--workspaces=false", "--cache", cache]
        result = subprocess.run(command, cwd=root, capture_output=True, encoding="utf-8")
    if result.returncode:
        detail = "\n".join(filter(None, [result.stdout.strip(), result.stderr.strip()]))
        raise ValueError(f"npm pack --dry-run ({root}) exited {result.returncode}: {detail}")
    listing, = json.loads(result.stdout)
    return {entry["path"]: sha256((root / entry["path"]).read_bytes()) for entry in listing["files"]}


def installed_files(root):
    files = {}

    def visit(directory):
        for path in directory.iterdir():
            info = path.lstat()
            reparse_point = getattr(info, "st_file_attributes", 0) & stat.FILE_ATTRIBUTE_REPARSE_POINT
            if stat.S_ISLNK(info.st_mode) or reparse_point:
                raise ValueError(f"{path}: unexpected link in installation")
            if stat.S_ISDIR(info.st_mode):
                visit(path)
            elif stat.S_ISREG(info.st_mode):
                files[path.relative_to(root).as_posix()] = sha256(path.read_bytes())
            else:
                raise ValueError(f"{path}: unexpected file type")

    visit(root)
    return files


def compare(label, expected, actual):
    missing = sorted(expected.keys() - actual.keys())
    extra = sorted(actual.keys() - expected.keys())
    changed = sorted(name for name in expected.keys() & actual.keys() if expected[name] != actual[name])
    print(f"{label}: {len(actual)} files, missing={len(missing)} extra={len(extra)} changed={len(changed)}")
    for category, names in (("missing", missing), ("extra", extra), ("changed", changed)):
        for name in names:
            print(f"  {category}  {name}")
    return not (missing or extra or changed)


def verify(args):
    fixed = args.candidate / FIXED_NAME
    data, version, files = read_archive(fixed)
    versioned = args.candidate / f"{PACKAGE}-{version}.tgz"
    if versioned.read_bytes() != data:
        raise ValueError(f"{versioned}: bytes differ from {fixed}")
    checksum = args.candidate / f"{FIXED_NAME}.sha256"
    match = re.fullmatch(r"([0-9a-fA-F]{64})[ \t]+\*?" + re.escape(FIXED_NAME),
                         checksum.read_text(encoding="ascii").rstrip("\r\n"))
    if not match or match[1].lower() != sha256(data):
        raise ValueError(f"{checksum}: expected {sha256(data)}  {FIXED_NAME}")

    valid = compare(f"workspace {args.workspace} -> candidate", workspace_files(args.workspace), files)
    if args.previous:
        _, _, previous_files = read_archive(args.previous)
        compare("previous -> candidate", previous_files, files)
    for root in args.installed:
        if not compare(f"candidate -> installed {root}", files, installed_files(root)):
            valid = False
    return 0 if valid else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("candidate", type=Path, help="directory with both .tgz names and the .sha256 file")
    parser.add_argument("--workspace", type=Path, default=Path.cwd(), help="frozen workspace (default: current directory)")
    parser.add_argument("--previous", type=Path, help="previous .tgz for an informational diff")
    parser.add_argument("--installed", type=Path, action="append", default=[], help="installed plugin directory (repeatable)")
    try:
        sys.exit(verify(parser.parse_args()))
    except (OSError, ValueError, EOFError, tarfile.TarError, zlib.error) as error:
        sys.exit(f"Verification failed: {error}")
