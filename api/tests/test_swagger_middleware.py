"""Tests for SwaggerAuthMiddleware form-data to JSON conversion."""
import json
import pytest
from urllib.parse import urlencode

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from httpx import AsyncClient, ASGITransport

from middleware.swagger_middleware import SwaggerAuthMiddleware


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def build_app() -> FastAPI:
    """Return a minimal FastAPI app whose /api/v1/auth/login echoes the parsed body."""
    inner = FastAPI()

    @inner.post("/api/v1/auth/login")
    async def login(request: Request):
        body = await request.json()
        return JSONResponse(content=body)

    @inner.post("/api/v1/other")
    async def other(request: Request):
        body = await request.body()
        return JSONResponse(content={"raw": body.decode()})

    # Wrap with the middleware under test
    inner.add_middleware(SwaggerAuthMiddleware)
    return inner


@pytest.fixture
def app():
    return build_app()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_form_urlencoded_username_password(app):
    """Swagger OAuth2 form sends 'username'; middleware must map it to 'email'."""
    payload = urlencode({"username": "user@example.com", "password": "secret"})
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/login",
            content=payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "user@example.com"
    assert data["password"] == "secret"


@pytest.mark.anyio
async def test_form_urlencoded_email_field(app):
    """Form that already sends 'email' is forwarded correctly."""
    payload = urlencode({"email": "user@example.com", "password": "secret"})
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/login",
            content=payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "user@example.com"
    assert data["password"] == "secret"


@pytest.mark.anyio
async def test_json_body_passthrough(app):
    """A direct JSON request to the login endpoint must pass through unchanged."""
    payload = {"email": "user@example.com", "password": "secret"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "user@example.com"
    assert data["password"] == "secret"


@pytest.mark.anyio
async def test_other_route_not_affected(app):
    """Middleware must not touch requests that are not the login route."""
    payload = urlencode({"foo": "bar"})
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/other",
            content=payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    assert response.status_code == 200
    # The raw body should be the original form-encoded string
    assert "foo=bar" in response.json()["raw"]


@pytest.mark.anyio
async def test_transformed_content_type_is_json(app):
    """After transformation, FastAPI must see content-type application/json."""
    state = {"content_type": None}

    inner = FastAPI()

    @inner.post("/api/v1/auth/login")
    async def login(request: Request):
        state["content_type"] = request.headers.get("content-type", "")
        body = await request.json()
        return JSONResponse(content=body)

    inner.add_middleware(SwaggerAuthMiddleware)

    payload = urlencode({"username": "u@example.com", "password": "pass"})
    async with AsyncClient(transport=ASGITransport(app=inner), base_url="http://test") as client:
        await client.post(
            "/api/v1/auth/login",
            content=payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

    assert state["content_type"] is not None, "Route was never called"
    assert "application/json" in state["content_type"]
