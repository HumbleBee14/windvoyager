.PHONY: install run test test-unit test-integration test-invariant lint format clean

install:
	uv sync --all-extras

run:
	uv run python -m gfs_mirror

test:
	uv run pytest

test-unit:
	uv run pytest tests/unit -v

test-integration:
	uv run pytest tests/integration -v

test-invariant:
	uv run pytest tests/invariant -v

lint:
	uv run ruff check src tests
	uv run ruff format --check src tests

format:
	uv run ruff format src tests
	uv run ruff check --fix src tests

clean:
	rm -rf .venv build dist *.egg-info .pytest_cache .ruff_cache
	find . -type d -name __pycache__ -exec rm -rf {} +
