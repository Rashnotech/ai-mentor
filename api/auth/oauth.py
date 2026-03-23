#!/usr/bin/python3
"""OAuth configuration and utilities for Google and GitHub authentication"""

import os
import aiohttp
from typing import Optional, Dict, Any
from authlib.integrations.starlette_client import OAuth
from urllib.parse import urlencode

# OAuth configuration
oauth = OAuth()

# Google OAuth Configuration
oauth.register(
    name='google',
    client_id=os.getenv('GOOGLE_CLIENT_ID'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'},
)

# GitHub OAuth Configuration
oauth.register(
    name='github',
    client_id=os.getenv('GITHUB_CLIENT_ID'),
    client_secret=os.getenv('GITHUB_CLIENT_SECRET'),
    access_token_url='https://github.com/login/oauth/access_token',
    access_token_params=None,
    authorize_url='https://github.com/login/oauth/authorize',
    authorize_params=None,
    api_base_url='https://api.github.com/',
    client_kwargs={'scope': 'user:email'},
)


class GoogleOAuthHandler:
    """Handler for Google OAuth"""

    @staticmethod
    async def get_user_info(access_token: str) -> Dict[str, Any]:
        """
        Fetch user info from Google using access token.
        
        Args:
            access_token: Google access token
            
        Returns:
            Dictionary with user info
        """
        headers = {'Authorization': f'Bearer {access_token}'}
        
        async with aiohttp.ClientSession() as session:
            async with session.get(
                'https://www.googleapis.com/oauth2/v2/userinfo',
                headers=headers
            ) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    raise Exception(f"Failed to fetch Google user info: {response.status}")

    @staticmethod
    def get_authorization_url(client_id: str, redirect_uri: str, state: str = None) -> str:
        """
        Generate Google OAuth authorization URL.
        
        Args:
            client_id: Google client ID
            redirect_uri: Redirect URI after authorization
            state: CSRF state token
            
        Returns:
            Authorization URL
        """
        params = {
            'client_id': client_id,
            'redirect_uri': redirect_uri,
            'response_type': 'code',
            'scope': 'openid email profile',
            'access_type': 'offline',
        }
        if state:
            params['state'] = state
        
        return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"

    @staticmethod
    async def exchange_code_for_token(
        code: str,
        client_id: str,
        client_secret: str,
        redirect_uri: str
    ) -> Dict[str, Any]:
        """
        Exchange authorization code for access token.
        
        Args:
            code: Authorization code from Google
            client_id: Google client ID
            client_secret: Google client secret
            redirect_uri: Redirect URI
            
        Returns:
            Dictionary with tokens and user info
        """
        async with aiohttp.ClientSession() as session:
            async with session.post(
                'https://oauth2.googleapis.com/token',
                data={
                    'code': code,
                    'client_id': client_id,
                    'client_secret': client_secret,
                    'redirect_uri': redirect_uri,
                    'grant_type': 'authorization_code',
                }
            ) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    raise Exception(f"Failed to exchange Google code: {response.status}")


class GitHubOAuthHandler:
    """Handler for GitHub OAuth"""

    @staticmethod
    async def get_user_info(access_token: str) -> Dict[str, Any]:
        """
        Fetch user info from GitHub using access token.
        
        Args:
            access_token: GitHub access token
            
        Returns:
            Dictionary with user info
        """
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Accept': 'application/vnd.github.v3+json',
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(
                'https://api.github.com/user',
                headers=headers
            ) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    raise Exception(f"Failed to fetch GitHub user info: {response.status}")

    @staticmethod
    async def get_user_email(access_token: str) -> Optional[str]:
        """
        Fetch primary email from GitHub.
        
        Args:
            access_token: GitHub access token
            
        Returns:
            User's primary email or None
        """
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Accept': 'application/vnd.github.v3+json',
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(
                'https://api.github.com/user/emails',
                headers=headers
            ) as response:
                if response.status == 200:
                    emails = await response.json()
                    # Get primary email
                    for email in emails:
                        if email.get('primary'):
                            return email.get('email')
                    # Fallback to first email if no primary
                    if emails:
                        return emails[0].get('email')
                return None

    @staticmethod
    def get_authorization_url(client_id: str, redirect_uri: str, state: str = None) -> str:
        """
        Generate GitHub OAuth authorization URL.
        
        Args:
            client_id: GitHub client ID
            redirect_uri: Redirect URI after authorization
            state: CSRF state token
            
        Returns:
            Authorization URL
        """
        params = {
            'client_id': client_id,
            'redirect_uri': redirect_uri,
            'scope': 'user:email',
        }
        if state:
            params['state'] = state
        
        return f"https://github.com/login/oauth/authorize?{urlencode(params)}"

    @staticmethod
    async def exchange_code_for_token(
        code: str,
        client_id: str,
        client_secret: str,
    ) -> Dict[str, Any]:
        """
        Exchange authorization code for access token.
        
        Args:
            code: Authorization code from GitHub
            client_id: GitHub client ID
            client_secret: GitHub client secret
            
        Returns:
            Dictionary with access token
        """
        async with aiohttp.ClientSession() as session:
            async with session.post(
                'https://github.com/login/oauth/access_token',
                data={
                    'code': code,
                    'client_id': client_id,
                    'client_secret': client_secret,
                },
                headers={'Accept': 'application/json'},
            ) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    raise Exception(f"Failed to exchange GitHub code: {response.status}")
