import json
from urllib.parse import parse_qs
from starlette.types import ASGIApp, Receive, Scope, Send


class SwaggerAuthMiddleware:
    """Pure ASGI middleware that converts Swagger form-data login requests to JSON.

    When the Swagger UI submits credentials via ``application/x-www-form-urlencoded``
    or ``multipart/form-data`` to the login endpoint, this middleware transparently
    converts the payload into the JSON body expected by the ``LoginRequest`` Pydantic
    model (``email`` + ``password``).  The conversion happens at the raw ASGI layer so
    FastAPI's validation pipeline always receives a well-formed JSON body.
    """

    LOGIN_PATH = "/api/v1/auth/login"

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        headers = dict(scope.get("headers", []))
        content_type = headers.get(b"content-type", b"").decode().lower()

        is_form_urlencoded = "application/x-www-form-urlencoded" in content_type
        is_multipart = "multipart/form-data" in content_type

        if path == self.LOGIN_PATH and (is_form_urlencoded or is_multipart):
            # Read the complete request body before FastAPI touches it
            body_chunks: list[bytes] = []
            more_body = True
            while more_body:
                message = await receive()
                body_chunks.append(message.get("body", b""))
                more_body = message.get("more_body", False)
            raw_body = b"".join(body_chunks)

            if is_form_urlencoded:
                form_fields = parse_qs(
                    raw_body.decode("utf-8", errors="replace"), keep_blank_values=True
                )
                # Swagger's OAuth2 form uses 'username'; also accept 'email' directly
                email = (
                    form_fields.get("email", [None])[0]
                    or form_fields.get("username", [None])[0]
                )
                password = form_fields.get("password", [None])[0]
            else:
                # multipart/form-data — use Starlette's MultiPartParser to decode
                from starlette.formparsers import MultiPartParser
                from starlette.datastructures import Headers

                async def _raw_receive() -> dict:
                    return {"type": "http.request", "body": raw_body, "more_body": False}

                multipart_headers = Headers(scope=scope)
                parser = MultiPartParser(multipart_headers, _raw_receive)
                form = await parser.parse()
                email = form.get("email") or form.get("username")
                password = form.get("password")

            json_body = json.dumps({"email": email, "password": password}).encode("utf-8")

            # Rebuild scope headers with correct content-type and content-length
            new_headers = [
                (k, v)
                for k, v in scope["headers"]
                if k.lower() not in (b"content-type", b"content-length")
            ]
            new_headers.append((b"content-type", b"application/json"))
            new_headers.append((b"content-length", str(len(json_body)).encode()))
            scope["headers"] = new_headers

            # Provide a single-shot receive callable that returns the JSON body
            async def json_receive() -> dict:
                return {"type": "http.request", "body": json_body, "more_body": False}

            await self.app(scope, json_receive, send)
            return

        await self.app(scope, receive, send)


