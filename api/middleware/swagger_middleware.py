from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import json

class SwaggerAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Check if the request is going to your login route and is Form Data
        if request.url.path == "/api/v1/auth/login" and request.headers.get("content-type") == "application/x-www-form-urlencoded":
            print("in login route")
            form_data = await request.form()
            # Convert Form Data to JSON structure for your Pydantic model
            body = json.dumps({"email": form_data.get("username"), "password": form_data.get("password")}).encode()
            print(body)
            # Create a new scope with updated headers and body
            async def receive():
                return {"type": "http.request", "body": body}
            
            request._receive = receive
            
        return await call_next(request)


