from pathlib import Path
import zipfile


def combine_extracted_files(output_root: Path, combined_name: str = "まとめ.txt") -> int:
    combined_path = output_root / combined_name
    if combined_path.exists():
        combined_path.unlink()

    candidates = [
        path
        for path in sorted(output_root.rglob("*"))
        if path.is_file() and path != combined_path
    ]
    if not candidates:
        return 0

    with combined_path.open("wb") as writer:
        for path in candidates:
            writer.write(path.read_bytes())
            writer.write(b"\n")

    return len(candidates)


def main() -> None:
    base_dir = Path(__file__).resolve().parent
    output_root = base_dir / "解凍"
    output_root.mkdir(exist_ok=True)

    zip_files = sorted(base_dir.glob("*.zip"))
    if not zip_files:
        print("No zip files found to extract.")
    else:
        for zip_path in zip_files:
            target_dir = output_root / zip_path.stem
            target_dir.mkdir(exist_ok=True)
            with zipfile.ZipFile(zip_path, "r") as archive:
                archive.extractall(target_dir)

    combined_count = combine_extracted_files(output_root)
    if combined_count:
        print(f"Combined {combined_count} files into まとめ.txt.")
    else:
        print("No files found to combine.")


if __name__ == "__main__":
    main()
