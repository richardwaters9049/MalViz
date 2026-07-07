from malviz_worker.config import ROOT, worker_database_url


def test_root_points_to_repo_root() -> None:
    assert (ROOT / ".env.example").exists()


def test_worker_database_url_strips_prisma_schema_param() -> None:
    url = "postgresql://user:pass@localhost:55432/malviz?schema=public&sslmode=disable"

    assert worker_database_url(url) == "postgresql://user:pass@localhost:55432/malviz?sslmode=disable"
