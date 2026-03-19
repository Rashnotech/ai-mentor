from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import json

class SwaggerAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Check if the request is going to the login route and is form-data
        content_type = request.headers.get("content-type", "")
        if request.url.path == "/api/v1/auth/login" and "application/x-www-form-urlencoded" in content_type:
            form_data = await request.form()
            # Convert form-data to JSON structure expected by the Pydantic model
            # OAuth2 form sends 'username'; map it to the 'email' field
            body = json.dumps({
                "email": form_data.get("username"),
                "password": form_data.get("password"),
            }).encode()

            # Replace content-type and content-length headers in the ASGI scope
            # so FastAPI parses the new body as JSON
            updated_headers = [
                (k, v) for k, v in request.scope["headers"]
                if k.lower() not in (b"content-type", b"content-length")
            ]
            updated_headers.append((b"content-type", b"application/json"))
            updated_headers.append((b"content-length", str(len(body)).encode()))
            request.scope["headers"] = updated_headers

            # Provide the JSON body via a new receive callable
            async def receive():
                return {"type": "http.request", "body": body}

            request._receive = receive

            # Clear the cached raw body so FastAPI reads from the new receive callable
            if hasattr(request, "_body"):
                del request._body

        return await call_next(request)


