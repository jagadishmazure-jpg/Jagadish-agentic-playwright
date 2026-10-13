# Larkspur demo app (the system under test). Non-root, slim, pinned base.
FROM python:3.14-slim@sha256:a2b82f3c48559aa0a8446d9af49826b6e2b2016f4cd2afabfe6013ec53729170
WORKDIR /app
COPY pyproject.toml README.md ./
COPY src ./src
RUN pip install --no-cache-dir . && useradd --uid 10001 --create-home app
USER 10001
ENV LARKSPUR_TEST_MODE=1
EXPOSE 8765
HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request;urllib.request.urlopen('http://127.0.0.1:8765/healthz')"
CMD ["uvicorn", "larkspur.server:app", "--host", "0.0.0.0", "--port", "8765"]
