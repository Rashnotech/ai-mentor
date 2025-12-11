#!/usr/bin/python3
"""Main app entry"""
from fastapi import FastAPI, HTTPException, Body



app = FastAPI(title="AI Mentor")



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)