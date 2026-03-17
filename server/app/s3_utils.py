import os
import boto3
from botocore.config import Config
from dotenv import load_dotenv

load_dotenv()

WASABI_ACCESS_KEY = os.getenv("WASABI_ACCESS_KEY")
WASABI_SECRET_KEY = os.getenv("WASABI_SECRET_KEY")
WASABI_BUCKET_KEY = os.getenv("WASABI_BUCKET_KEY")
WASABI_REGION_NAME = os.getenv("WASABI_REGION_NAME")
WASABI_ENDPOINT_URL = os.getenv("WASABI_ENDPOINT_URL")

s3_client = boto3.client(
    "s3",
    endpoint_url=WASABI_ENDPOINT_URL,
    aws_access_key_id=WASABI_ACCESS_KEY,
    aws_secret_access_key=WASABI_SECRET_KEY,
    region_name=WASABI_REGION_NAME,
    config=Config(signature_version="s3v4"),
)

def generate_presigned_url(file_name: str, file_type: str, expiration=3600):
    """Generate a presigned URL for uploading a file directly to Wasabi."""
    try:
        response = s3_client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": WASABI_BUCKET_KEY,
                "Key": file_name,
                "ContentType": file_type,
                "ACL": "public-read",
            },
            ExpiresIn=expiration,
        )
       
        public_url = f"{WASABI_ENDPOINT_URL}/{WASABI_BUCKET_KEY}/{file_name}"
        
        return {
            "upload_url": response,
            "public_url": public_url
        }
    except Exception as e:
        print(f"Error generating presigned URL: {e}")
        return None
