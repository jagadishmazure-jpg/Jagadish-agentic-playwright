# Larkspur demo app (the system under test). Non-root, slim, pinned base.
FROM python:3.12-slim@sha256:a6e34c598f2467ed0e9a8d349809fcd8b5c603269512df273a0bb1784edc11b1
WORKDIR /app
COPY pyproject.toml README.md ./
COPY src ./src
RUN pip install --no-cache-dir . && useradd --uid 10001 --create-home app
USER 10001
ENV LARKSPUR_TEST_MODE=1
EXPOSE 8765
HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request;urllib.request.urlopen('http://127.0.0.1:8765/healthz')"
CMD ["uvicorn", "larkspur.server:app", "--host", "0.0.0.0", "--port", "8765"]
