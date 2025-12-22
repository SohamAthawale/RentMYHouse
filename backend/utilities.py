import os
import smtplib
from email.message import EmailMessage

# Ideally, these come from environment variables for security
EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS", "rentmyhouseco@gmail.com")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "chkl bzcz hesz puwx")

def send_email(to: str, subject: str, body: str) -> None:
    """Send email using Gmail SMTP with authentication and TLS."""
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = EMAIL_ADDRESS
    msg["To"] = to
    msg.set_content(body)

    # Connect to Gmail SMTP server
    with smtplib.SMTP("smtp.gmail.com", 587) as smtp:
        smtp.ehlo()
        smtp.starttls()  # Start TLS encryption
        smtp.ehlo()
        smtp.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
        smtp.send_message(msg)
