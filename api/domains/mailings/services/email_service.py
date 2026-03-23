#!/usr/bin/python3
"""
Email notification service using Brevo (Sendinblue) API.
"""
import logging
import httpx
from typing import Optional
from core.config import settings

logger = logging.getLogger(__name__)

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


class EmailService:
    """Service for sending transactional emails via Brevo API."""

    def __init__(self):
        self.api_key = settings.BREVO_API_KEY
        self.sender_email = settings.MAIL_FROM
        self.sender_name = "AI Mentor"

    async def _send_email(
        self,
        to_email: str,
        to_name: str,
        subject: str,
        html_content: str,
        text_content: str,
    ) -> bool:
        """
        Internal helper — sends a single transactional email via Brevo.

        Returns True on success, False otherwise.
        """
        if not self.api_key or self.api_key == "None":
            logger.warning("Brevo API key not configured, skipping email")
            return False

        payload = {
            "sender": {
                "name": self.sender_name,
                "email": self.sender_email,
            },
            "to": [
                {
                    "email": to_email,
                    "name": to_name or to_email,
                }
            ],
            "subject": subject,
            "htmlContent": html_content,
            "textContent": text_content,
        }

        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "api-key": self.api_key,
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    BREVO_API_URL,
                    json=payload,
                    headers=headers,
                    timeout=30.0,
                )

                if response.status_code in (200, 201):
                    logger.info(f"Email sent to {to_email}: {subject}")
                    return True
                else:
                    logger.error(f"Brevo API error: {response.status_code} - {response.text}")
                    return False

        except httpx.TimeoutException:
            logger.error(f"Timeout sending email to {to_email}")
            return False
        except Exception as e:
            logger.error(f"Error sending email to {to_email}: {str(e)}")
            return False

    # ------------------------------------------------------------------ #
    #  Password-reset OTP email
    # ------------------------------------------------------------------ #

    async def send_password_reset_otp(
        self,
        user_email: str,
        user_name: str,
        otp: str,
    ) -> bool:
        """
        Send a 6-digit OTP for password reset.

        Args:
            user_email: Recipient email address
            user_name: Recipient's display name
            otp:  The plain 6-digit code

        Returns:
            True if email was sent successfully, False otherwise
        """
        subject = "Your Password Reset Code — AI Mentor"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0; }}
                .header h1 {{ margin: 0; font-size: 24px; font-weight: 700; }}
                .content {{ background: #ffffff; padding: 40px 30px; border-radius: 0 0 12px 12px; }}
                .otp-box {{ background: #f0f4ff; border: 2px dashed #2563eb; border-radius: 12px; padding: 24px; text-align: center; margin: 28px 0; }}
                .otp-code {{ font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #1e40af; font-family: 'Courier New', monospace; }}
                .info {{ color: #6b7280; font-size: 14px; margin-top: 24px; }}
                .warning {{ background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #92400e; margin-top: 24px; }}
                .footer {{ text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px; padding: 16px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 Password Reset Request</h1>
                </div>
                <div class="content">
                    <p>Hi {user_name or 'there'},</p>
                    <p>We received a request to reset your password. Use the verification code below to continue:</p>

                    <div class="otp-box">
                        <div class="otp-code">{otp}</div>
                    </div>

                    <div class="info">
                        <p>⏱️ This code expires in <strong>10 minutes</strong>.</p>
                        <p>If you didn't request a password reset, you can safely ignore this email — your account is secure.</p>
                    </div>

                    <div class="warning">
                        <strong>Security tip:</strong> Never share this code with anyone. AI Mentor will never ask you for this code via phone, chat, or any other channel.
                    </div>
                </div>
                <div class="footer">
                    <p>© 2025 AI Mentor. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""Hi {user_name or 'there'},

We received a request to reset your password.

Your verification code is: {otp}

This code expires in 10 minutes.

If you didn't request this, please ignore this email.

---
AI Mentor Team
"""

        return await self._send_email(
            to_email=user_email,
            to_name=user_name or user_email,
            subject=subject,
            html_content=html_content,
            text_content=text_content,
        )

    # ------------------------------------------------------------------ #
    #  Email verification
    # ------------------------------------------------------------------ #

    async def send_email_verification(
        self,
        user_email: str,
        user_name: str,
        verification_code: str,
        verification_link: str,
    ) -> bool:
        """
        Send email verification with both a clickable link and a 6-digit code.

        Args:
            user_email:        Recipient email address
            user_name:         Recipient's display name
            verification_code: 6-digit code for manual entry
            verification_link: Full URL for one-click verification

        Returns:
            True if email was sent successfully, False otherwise
        """
        subject = "Verify Your Email — AI Mentor"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0; }}
                .header h1 {{ margin: 0; font-size: 24px; font-weight: 700; }}
                .content {{ background: #ffffff; padding: 40px 30px; border-radius: 0 0 12px 12px; }}
                .btn {{ display: inline-block; background: #2563eb; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 24px 0; }}
                .divider {{ display: flex; align-items: center; margin: 28px 0; color: #9ca3af; font-size: 13px; }}
                .divider::before, .divider::after {{ content: ''; flex: 1; border-bottom: 1px solid #e5e7eb; }}
                .divider::before {{ margin-right: 12px; }}
                .divider::after {{ margin-left: 12px; }}
                .code-box {{ background: #f0f4ff; border: 2px dashed #2563eb; border-radius: 12px; padding: 24px; text-align: center; margin: 20px 0; }}
                .code {{ font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #1e40af; font-family: 'Courier New', monospace; }}
                .info {{ color: #6b7280; font-size: 14px; margin-top: 24px; }}
                .footer {{ text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px; padding: 16px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to AI Mentor! 🎉</h1>
                </div>
                <div class="content">
                    <p>Hi {user_name or 'there'},</p>
                    <p>Thanks for signing up! Please verify your email address to get started.</p>

                    <div style="text-align: center;">
                        <a href="{verification_link}" class="btn">Verify My Email</a>
                    </div>

                    <div class="divider">or enter this code manually</div>

                    <div class="code-box">
                        <div class="code">{verification_code}</div>
                    </div>

                    <div class="info">
                        <p>⏱️ This link and code expire in <strong>24 hours</strong>.</p>
                        <p>If you didn't create an account on AI Mentor, you can safely ignore this email.</p>
                    </div>
                </div>
                <div class="footer">
                    <p>&copy; 2026 AI Mentor. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""Hi {user_name or 'there'},

Thanks for signing up for AI Mentor! Please verify your email address.

Click this link to verify: {verification_link}

Or enter this verification code: {verification_code}

This link and code expire in 24 hours.

If you didn't create this account, please ignore this email.

---
AI Mentor Team
"""

        return await self._send_email(
            to_email=user_email,
            to_name=user_name or user_email,
            subject=subject,
            html_content=html_content,
            text_content=text_content,
        )

    # ------------------------------------------------------------------ #
    #  Module unlock notification
    # ------------------------------------------------------------------ #

    async def send_module_unlock_notification(
        self,
        user_email: str,
        user_name: str,
        module_title: str,
        course_title: str,
        module_description: Optional[str] = None,
    ) -> bool:
        """
        Send email notification when a module is unlocked.

        Args:
            user_email: Recipient email address
            user_name: Recipient's display name
            module_title: Title of the unlocked module
            course_title: Title of the course
            module_description: Optional module description

        Returns:
            True if email sent successfully, False otherwise
        """
        subject = f"🎉 New Module Unlocked: {module_title}"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .module-card {{ background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0; }}
                .btn {{ display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px; }}
                .footer {{ text-align: center; color: #888; font-size: 12px; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎓 New Content Available!</h1>
                </div>
                <div class="content">
                    <p>Hi {user_name or 'there'},</p>
                    <p>Great news! A new module is now available for you in <strong>{course_title}</strong>.</p>

                    <div class="module-card">
                        <h2 style="margin-top: 0; color: #667eea;">{module_title}</h2>
                        {f'<p>{module_description}</p>' if module_description else ''}
                    </div>

                    <p>Start learning now to stay on track with your deadlines and earn maximum points!</p>

                    <a href="https://aimentor.com/dashboard/courses" class="btn">Go to Dashboard</a>

                    <div class="footer">
                        <p>You're receiving this email because you're enrolled in a course on AI Mentor.</p>
                        <p>© 2026 AI Mentor. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
Hi {user_name or 'there'},

Great news! A new module is now available for you in {course_title}.

Module: {module_title}
{f'Description: {module_description}' if module_description else ''}

Start learning now at https://aimentor.com/dashboard/courses

---
AI Mentor Team
        """

        return await self._send_email(
            to_email=user_email,
            to_name=user_name or user_email,
            subject=subject,
            html_content=html_content,
            text_content=text_content,
        )


# Singleton instance for easy import
email_service = EmailService()
