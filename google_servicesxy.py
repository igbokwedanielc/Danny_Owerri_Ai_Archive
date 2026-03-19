import os
import gspread
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
import mimetypes
import json

# -----------------------------
# Paths & constants
# -----------------------------
TOKEN_FILE = "token.json"
CLIENT_SECRET_FILE = "client_secret.json"

SCOPES = [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/spreadsheets"
]

# Use environment variables for production
DRIVE_FOLDER_ID = os.environ.get("DRIVE_FOLDER_ID")
SHEET_ID = os.environ.get("SHEET_ID")

if not DRIVE_FOLDER_ID or not SHEET_ID:
    raise Exception("You must set DRIVE_FOLDER_ID and SHEET_ID in Render environment variables")

# -----------------------------
# Write secrets from Render env variables
# -----------------------------
if "TOKEN_JSON" in os.environ:
    with open(TOKEN_FILE, "w") as f:
        f.write(os.environ["TOKEN_JSON"])

if "CLIENT_SECRET_JSON" in os.environ:
    with open(CLIENT_SECRET_FILE, "w") as f:
        f.write(os.environ["CLIENT_SECRET_JSON"])

# -----------------------------
# Credentials handling
# -----------------------------
def get_credentials():
    creds = None
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, "r") as f:
            creds = Credentials.from_authorized_user_info(json.load(f), SCOPES)

    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
        # Save refreshed token
        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())
    elif not creds or not creds.valid:
        raise Exception("token.json invalid or missing. Generate it locally once.")

    return creds

creds = get_credentials()

# -----------------------------
# Initialize clients
# -----------------------------
gs_client = gspread.authorize(creds)
sheet = gs_client.open_by_key(SHEET_ID).sheet1
drive_service = build("drive", "v3", credentials=creds)

# -----------------------------
# Upload & append functions
# -----------------------------
def upload_audio_to_drive(filepath):
    """Upload audio file to Google Drive and make it public."""
    try:
        file_metadata = {
            "name": os.path.basename(filepath),
            "parents": [DRIVE_FOLDER_ID]
        }

        mime_type, _ = mimetypes.guess_type(filepath)
        media = MediaFileUpload(filepath, mimetype=mime_type or "audio/mpeg", resumable=True)

        file = drive_service.files().create(
            body=file_metadata,
            media_body=media,
            fields="id"
        ).execute()

        file_id = file.get("id")

        # Make publicly readable
        drive_service.permissions().create(
            fileId=file_id,
            body={"type": "anyone", "role": "reader"}
        ).execute()

        return f"https://drive.google.com/file/d/{file_id}/view"
    
    except Exception as e:
        # Log error to file
        with open("upload_errors.log", "a") as log:
            log.write(f"{datetime.now()} - Drive upload failed: {e}\n")
        raise

def append_to_sheet(row_data):
    """Append a row of data to Google Sheet."""
    try:
        sheet.append_row(row_data)
    except Exception as e:
        # Log error to file
        with open("upload_errors.log", "a") as log:
            log.write(f"{datetime.now()} - Sheet append failed: {e}\n")
        raise