import os

from logger import get_logger

logger = get_logger(__name__)


def log_json_report(filename: str, report_data: str) -> None:
    """
    Save a JSON payload directly into the backend `output/` folder.
    Mirrors the behavior from the standalone Interview Agent project so
    you can still inspect raw reports on disk.
    """
    os.makedirs("output", exist_ok=True)
    filepath = os.path.join("output", filename)
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(report_data)
        logger.info("Successfully saved interview JSON report to %s", filepath)
    except Exception:  # pragma: no cover
        logger.exception("Failed to write JSON report %s", filepath)

